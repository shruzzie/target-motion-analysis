import React from 'react';

const SimulationCanvas = ({
  chartData = { shipData: [], targetData: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 } },
  hoveredPoint,
  setHoveredPoint,
  mousePos,
  setMousePos,
  svgRef,
  kalmanTrackData = [] // Receive Kalman track data, with default empty array
}) => {
  if (!chartData || !chartData.bounds) {
    return (
      <div style={{ background: 'white', padding: 25, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', color: '#555' }}>
        <h3 style={{ marginBottom: 20, color: '#333' }}>Motion Analysis Results</h3>
        <p>Loading simulation data or no data available. Please run the simulation.</p>
      </div>
    );
  }

  const scaleX = (x) => {
    const svgWidth = 800;
    const margin = 50;
    return ((x - chartData.bounds.minX) / (chartData.bounds.maxX - chartData.bounds.minX)) * (svgWidth - 2 * margin) + margin;
  };
  const scaleY = (y) => {
    const svgHeight = 600;
    const margin = 50;
    return svgHeight - margin - ((y - chartData.bounds.minY) / (chartData.bounds.maxY - chartData.bounds.minY)) * (svgHeight - 2 * margin);
  };

  return (
    <div style={{ background: 'white', padding: 25, borderRadius: 12, position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <h3 style={{ marginBottom: 20, color: '#333' }}>Motion Analysis Results</h3>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <svg
          ref={svgRef}
          width="800"
          height="600"
          style={{ border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'crosshair', background: '#fdfdfd' }}
          onMouseMove={(e) => {
            if (!svgRef.current) return; 
            const rect = svgRef.current.getBoundingClientRect();
            const svgWidth = rect.width;
            const svgHeight = rect.height;
            const margin = 50;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            setMousePos({ x: e.clientX, y: e.clientY });

            const dataX = ((mouseX - margin) / (svgWidth - 2 * margin)) * (chartData.bounds.maxX - chartData.bounds.minX) + chartData.bounds.minX;
            const dataY = (1 - (mouseY - margin) / (svgHeight - 2 * margin)) * (chartData.bounds.maxY - chartData.bounds.minY) + chartData.bounds.minY;

            let closestPoint = null;
            let minDistance = Infinity;

            const allPoints = [...(chartData.shipData || []), ...(chartData.targetData || []), ...(kalmanTrackData || [])];

            allPoints.forEach(point => {
              const distance = Math.sqrt(Math.pow(point.x - dataX, 2) + Math.pow(point.y - dataY, 2));
              if (distance < minDistance && distance < (chartData.bounds.maxX - chartData.bounds.minX) * 0.05) {
                minDistance = distance;
                closestPoint = point;
              }
            });
            setHoveredPoint(closestPoint);
          }}
          onMouseLeave={() => {
            setHoveredPoint(null);
          }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g>
            <line x1="50" y1="550" x2="750" y2="550" stroke="#6b7280" strokeWidth="2" />
            <line x1="50" y1="50" x2="50" y2="550" stroke="#6b7280" strokeWidth="2" />
            {Array.from({ length: 6 }, (_, i) => {
              const x = 50 + i * 140;
              const value = (chartData.bounds.minX + i * (chartData.bounds.maxX - chartData.bounds.minX) / 5).toFixed(1);
              return (
                <g key={`x-tick-${i}`}>
                  <line x1={x} y1="545" x2={x} y2="555" stroke="#6b7280" strokeWidth="1" />
                  <text x={x} y="575" textAnchor="middle" fontSize="12" fill="#6b7280">{value}</text>
                </g>
              );
            })}
            {Array.from({ length: 6 }, (_, i) => {
              const y = 550 - i * 100;
              const value = (chartData.bounds.minY + i * (chartData.bounds.maxY - chartData.bounds.minY) / 5).toFixed(1);
              return (
                <g key={`y-tick-${i}`}>
                  <line x1="45" y1={y} x2="55" y2={y} stroke="#6b7280" strokeWidth="1" />
                  <text x="40" y={y + 4} textAnchor="end" fontSize="12" fill="#6b7280">{value}</text>
                </g>
              );
            })}
          </g>

          {/* Ship Track (Raw) */}
          <g>
            <path
              d={`M ${(chartData.shipData || []).map(d => `${scaleX(d.x)},${scaleY(d.y)}`).join(' L ')}`}
              fill="none"
              stroke="#1e40af"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            {(chartData.shipData || []).map((point, i) => (
              <circle
                key={`ship-point-${i}`}
                cx={scaleX(point.x)}
                cy={scaleY(point.y)}
                r={hoveredPoint === point ? 8 : 4}
                fill="#1e40af"
                stroke="white"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
              />
            ))}
          </g>

          {/* Target Track (Raw) */}
          <g>
            <path
              d={`M ${(chartData.targetData || []).map(d => `${scaleX(d.x)},${scaleY(d.y)}`).join(' L ')}`}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            {(chartData.targetData || []).map((point, i) => (
              <circle
                key={`target-point-${i}`}
                cx={scaleX(point.x)}
                cy={scaleY(point.y)}
                r={hoveredPoint === point ? 8 : 4}
                fill="#dc2626"
                stroke="white"
                strokeWidth="2"
                style={{ cursor: 'pointer' }}
              />
            ))}
          </g>

          {/* Kalman Filtered Target Track (Smoothed) */}
          {kalmanTrackData.length > 0 && (
            <g>
              <path
                d={`M ${(kalmanTrackData || []).map(d => `${scaleX(d.x)},${scaleY(d.y)}`).join(' L ')}`}
                fill="none"
                stroke="#059669" // Green color for Kalman track
                strokeWidth="3" // Thicker line for emphasis
              />
              {(kalmanTrackData || []).map((point, i) => (
                <circle
                  key={`kalman-point-${i}`}
                  cx={scaleX(point.x)}
                  cy={scaleY(point.y)}
                  r={hoveredPoint === point ? 8 : 4}
                  fill="#059669"
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </g>
          )}

          <g>
            {/* Ensure initial points exist before accessing properties */}
            {chartData.shipData && chartData.shipData.length > 0 && (
              <>
                <circle cx={scaleX(chartData.shipData[0]?.x)} cy={scaleY(chartData.shipData[0]?.y)} r="8" fill="#1e40af" stroke="white" strokeWidth="3" />
                <text x={scaleX(chartData.shipData[0]?.x)} y={scaleY(chartData.shipData[0]?.y) - 15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e40af">SHIP</text>
              </>
            )}
            {chartData.targetData && chartData.targetData.length > 0 && (
              <>
                <circle cx={scaleX(chartData.targetData[0]?.x)} cy={scaleY(chartData.targetData[0]?.y)} r="8" fill="#dc2626" stroke="white" strokeWidth="3" />
                <text x={scaleX(chartData.targetData[0]?.x)} y={scaleY(chartData.targetData[0]?.y) - 15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#dc2626">TARGET</text>
              </>
            )}
            {kalmanTrackData && kalmanTrackData.length > 0 && (
              <>
                <circle cx={scaleX(kalmanTrackData[kalmanTrackData.length-1]?.x)} cy={scaleY(kalmanTrackData[kalmanTrackData.length-1]?.y)} r="8" fill="#059669" stroke="white" strokeWidth="3" />
                <text x={scaleX(kalmanTrackData[kalmanTrackData.length-1]?.x)} y={scaleY(kalmanTrackData[kalmanTrackData.length-1]?.y) - 15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#059669">KALMAN EST.</text>
              </>
            )}
          </g>
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 30, marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 4, background: '#1e40af' }}></div>
          <span style={{ fontSize: 14, color: '#1e40af', fontWeight: 500 }}>Ship Track (Raw)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 4, background: '#dc2626' }}></div>
          <span style={{ fontSize: 14, color: '#dc2626', fontWeight: 500 }}>Target Track (Raw)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 4, background: '#059669' }}></div>
          <span style={{ fontSize: 14, color: '#059669', fontWeight: 500 }}>Kalman Filtered Track</span>
        </div>
      </div>
      {hoveredPoint && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 10,
            top: mousePos.y - 10,
            background: hoveredPoint.type === 'ship' ? '#1e40af' : (hoveredPoint.type === 'target' ? '#dc2626' : '#059669'),
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            pointerEvents: 'none',
            border: '2px solid white'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {hoveredPoint.type === 'ship' ? '🚢 SHIP' : (hoveredPoint.type === 'target' ? '🎯 TARGET (Raw)' : '✨ KALMAN EST.')}
          </div>
          <div>Time: {hoveredPoint.time.toFixed(1)}s</div>
          <div>Position: ({hoveredPoint.x.toFixed(1)}, {hoveredPoint.y.toFixed(1)})</div>
          {hoveredPoint.type === 'kalman' && (
            <>
              <div>Velocity X: {hoveredPoint.vx.toFixed(2)}</div>
              <div>Velocity Y: {hoveredPoint.vy.toFixed(2)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SimulationCanvas;
