import React, { useState } from 'react';

const GraphDisplay = ({
  rangeData = { data: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 } },
  bearingData = { data: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 360 } },
  courseData = { data: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 360 } },
  speedData = { data: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 } },
  kalmanRangeData = [],
  kalmanBearingData = [],
  kalmanCourseData = [],
  kalmanSpeedData = [],
  hoveredRange,
  setHoveredRange,
  mousePosRange,
  setMousePosRange,
  hoveredBearing,
  setHoveredBearing,
  mousePosBearing,
  setMousePosBearing
}) => {

  // Add state for course and speed hover handlers
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const [mousePosCourse, setMousePosCourse] = useState({ x: 0, y: 0 });
  const [hoveredSpeed, setHoveredSpeed] = useState(null);
  const [mousePosSpeed, setMousePosSpeed] = useState({ x: 0, y: 0 });

  // Helper to safely get min/max from an array, returning default if NaN, empty, or non-finite
  const getMinMax = (dataArray, defaultMin, defaultMax) => {
    if (!dataArray || dataArray.length === 0) {
      return { min: defaultMin, max: defaultMax };
    }
    const filteredData = dataArray.filter(val => !isNaN(val) && isFinite(val)); 
    
    if (filteredData.length === 0) {
      return { min: defaultMin, max: defaultMax };
    }

    const minVal = Math.min(...filteredData);
    const maxVal = Math.max(...filteredData);
    
    return {
      min: isNaN(minVal) || !isFinite(minVal) ? defaultMin : minVal,
      max: isNaN(maxVal) || !isFinite(maxVal) ? defaultMax : maxVal
    };
  };

  // Helper function to scale a single value
  const scaleValue = (value, dataMin, dataMax, svgDimension, margin) => {
    const dataRange = dataMax - dataMin;
    if (dataRange === 0) {
      return margin + (svgDimension - 2 * margin) / 2;
    }
    const scaled = ((value - dataMin) / dataRange) * (svgDimension - 2 * margin) + margin;
    return isFinite(scaled) ? scaled : (margin + (svgDimension - 2 * margin) / 2);
  };

  // Helper function to generate SVG path 'd' attribute string
  const generatePathD = (data, minX, maxX, minY, maxY, svgWidth, svgHeight, margin) => {
    const validData = (data || []).filter(d => !isNaN(d.x) && !isNaN(d.y) && isFinite(d.x) && isFinite(d.y));
    if (validData.length === 0) {
      return "";
    }
    
    let pathStr = "";
    pathStr += `M ${scaleValue(validData[0].x, minX, maxX, svgWidth, margin)},${scaleValue(validData[0].y, minY, maxY, svgHeight, margin)}`;

    for (let i = 1; i < validData.length; i++) {
      const scaledX = scaleValue(validData[i].x, minX, maxX, svgWidth, margin);
      const scaledY = scaleValue(validData[i].y, minY, maxY, svgHeight, margin);

      if (isFinite(scaledX) && isFinite(scaledY)) {
        pathStr += ` L ${scaledX},${scaledY}`;
      } else {
        pathStr += ` M ${scaledX},${scaledY}`;
      }
    }
    return pathStr;
  };

  // Generic graph component
  const GraphComponent = ({ 
    title, 
    rawData, 
    kalmanData, 
    yAxisLabel, 
    yAxisUnit = "", 
    rawColor, 
    kalmanColor,
    hovered,
    setHovered,
    mousePos,
    setMousePos,
    bounds
  }) => {
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 250;
    const MARGIN = 50;

    // Determine overall min/max for scaling
    const allXValues = [...rawData.map(d => d.x), ...kalmanData.map(d => d.x)];
    const { min: minX, max: maxX } = getMinMax(allXValues, bounds.minX, bounds.maxX);
    const allYValues = [...rawData.map(d => d.y), ...kalmanData.map(d => d.y)];
    const { min: minY, max: maxY } = getMinMax(allYValues, bounds.minY, bounds.maxY);
    
    // Add padding for Y axis if it's not course/bearing (which have fixed ranges)
    let effectiveMinY = minY;
    let effectiveMaxY = maxY;
    if (!title.includes('Bearing') && !title.includes('Course')) {
      const padding = Math.max((maxY - minY) * 0.1, 1);
      effectiveMinY = minY - padding;
      effectiveMaxY = maxY + padding;
    }

    return (
      <div style={{ background: 'white', padding: 20, borderRadius: 12, position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginBottom: 20, color: rawColor, fontSize: '16px' }}>{title}</h3>
        <svg width={SVG_WIDTH} height={SVG_HEIGHT} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'crosshair', background: '#fdfdfd' }}
          onMouseMove={(e) => {
            const rect = e.target.getBoundingClientRect();
            const svgWidth = rect.width;
            const margin = 50;
            const mouseX = e.clientX - rect.left;
            setMousePos({ x: e.clientX, y: e.clientY });

            const allPoints = [
              ...(rawData || []).map(d => ({ ...d, type: 'raw' })),
              ...(kalmanData || []).map(d => ({ ...d, type: 'kalman' }))
            ];
            const validPoints = allPoints.filter(d => !isNaN(d.x) && !isNaN(d.y) && isFinite(d.x) && isFinite(d.y));
            const allX = validPoints.map(d => d.x);
            const { min: minXVal, max: maxXVal } = getMinMax(allX, 0, 100);

            const t = ((mouseX - margin) / (svgWidth - 2 * margin)) * (maxXVal - minXVal) + minXVal;
            let closest = null;
            let minDist = Infinity;

            validPoints.forEach(pt => {
              const dist = Math.abs(pt.x - t);
              if (dist < minDist && dist < (maxXVal - minXVal) * 0.03) {
                minDist = dist;
                closest = pt;
              }
            });
            setHovered(closest);
          }}
          onMouseLeave={() => setHovered(null)}
        >
          <rect width="100%" height="100%" fill="white" />
          <g>
            <line x1={MARGIN} y1={SVG_HEIGHT - MARGIN} x2={SVG_WIDTH - MARGIN} y2={SVG_HEIGHT - MARGIN} stroke="#6b7280" strokeWidth="2" />
            <line x1={MARGIN} y1={MARGIN} x2={MARGIN} y2={SVG_HEIGHT - MARGIN} stroke="#6b7280" strokeWidth="2" />
            
            {/* X-axis ticks and labels (Time) */}
            {Array.from({ length: 6 }, (_, i) => {
              const x = MARGIN + i * (SVG_WIDTH - 2 * MARGIN) / 5;
              const value = (minX + i * (maxX - minX) / 5).toFixed(1);
              return (
                <g key={`x-tick-${i}`}>
                  <line x1={x} y1={SVG_HEIGHT - MARGIN - 5} x2={x} y2={SVG_HEIGHT - MARGIN + 5} stroke="#6b7280" strokeWidth="1" />
                  <text x={x} y={SVG_HEIGHT - MARGIN + 25} textAnchor="middle" fontSize="12" fill="#6b7280">{value}</text>
                </g>
              );
            })}
            
            {/* Y-axis ticks and labels */}
            {Array.from({ length: 5 }, (_, i) => {
              const y = SVG_HEIGHT - MARGIN - i * (SVG_HEIGHT - 2 * MARGIN) / 4;
              const value = (effectiveMinY + i * ((effectiveMaxY - effectiveMinY) / 4)).toFixed(title.includes('Speed') ? 1 : 0);
              return (
                <g key={`y-tick-${i}`}>
                  <line x1={MARGIN - 5} y1={y} x2={MARGIN + 5} y2={y} stroke="#6b7280" strokeWidth="1" />
                  <text x={MARGIN - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#6b7280">{value}{yAxisUnit}</text>
                </g>
              );
            })}
          </g>
          
          {/* Raw Data Path */}
          <g>
            <path
              d={generatePathD(rawData, minX, maxX, effectiveMinY, effectiveMaxY, SVG_WIDTH, SVG_HEIGHT, MARGIN)}
              fill="none"
              stroke={rawColor}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            {(rawData || []).filter(d => !isNaN(d.x) && !isNaN(d.y) && isFinite(d.x) && isFinite(d.y)).map((point, i) => (
              <circle
                key={`raw-point-${i}`}
                cx={scaleValue(point.x, minX, maxX, SVG_WIDTH, MARGIN)}
                cy={scaleValue(point.y, effectiveMinY, effectiveMaxY, SVG_HEIGHT, MARGIN)}
                r="2"
                fill={rawColor}
                stroke="white"
                strokeWidth="1"
              />
            ))}
          </g>
          
          {/* Kalman Filtered Data Path */}
          {kalmanData.length > 0 && (
            <g>
              <path
                d={generatePathD(kalmanData, minX, maxX, effectiveMinY, effectiveMaxY, SVG_WIDTH, SVG_HEIGHT, MARGIN)}
                fill="none"
                stroke={kalmanColor}
                strokeWidth="3"
                strokeDasharray="0"
              />
              {(kalmanData || []).filter(d => !isNaN(d.x) && !isNaN(d.y) && isFinite(d.x) && isFinite(d.y)).map((point, i) => (
                <circle
                  key={`kalman-point-${i}`}
                  cx={scaleValue(point.x, minX, maxX, SVG_WIDTH, MARGIN)}
                  cy={scaleValue(point.y, effectiveMinY, effectiveMaxY, SVG_HEIGHT, MARGIN)}
                  r="2"
                  fill={kalmanColor}
                  stroke="white"
                  strokeWidth="1"
                />
              ))}
            </g>
          )}
          
          {/* Axis Labels */}
          <text x={SVG_WIDTH / 2} y={SVG_HEIGHT - 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#6b7280">Time (s)</text>
          <text x={15} y={SVG_HEIGHT / 2} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#6b7280" transform={`rotate(-90 ${15} ${SVG_HEIGHT / 2})`}>{yAxisLabel}</text>
        </svg>
        
        {/* Tooltip */}
        {hovered && (
          <div style={{
            position: 'fixed',
            left: mousePos.x + 10,
            top: mousePos.y - 10,
            background: hovered.type === 'raw' ? rawColor : kalmanColor,
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            pointerEvents: 'none',
            border: '2px solid white'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {title.split(' vs ')[0]} ({hovered.type === 'raw' ? 'Raw' : 'Kalman'})
            </div>
            <div>Time: {hovered.x.toFixed(1)}s</div>
            <div>{title.split(' vs ')[0]}: {hovered.y.toFixed(title.includes('Speed') ? 2 : 1)}{yAxisUnit}</div>
          </div>
        )}
        
        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 30, marginTop: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 4, background: rawColor }}></div>
            <span style={{ fontSize: 14, color: rawColor, fontWeight: 500 }}>Raw {title.split(' vs ')[0]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 4, background: kalmanColor }}></div>
            <span style={{ fontSize: 14, color: kalmanColor, fontWeight: 500 }}>Kalman Filtered {title.split(' vs ')[0]}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* First row: Range and Bearing */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        <GraphComponent
          title="Range vs Time"
          rawData={rangeData.data}
          kalmanData={kalmanRangeData}
          yAxisLabel="Range"
          yAxisUnit=""
          rawColor="#16a34a"
          kalmanColor="#8b5cf6"
          hovered={hoveredRange}
          setHovered={setHoveredRange}
          mousePos={mousePosRange}
          setMousePos={setMousePosRange}
          bounds={rangeData.bounds}
        />
        
        <GraphComponent
          title="Bearing vs Time"
          rawData={bearingData.data}
          kalmanData={kalmanBearingData}
          yAxisLabel="Bearing (°)"
          yAxisUnit="°"
          rawColor="#dc2626"
          kalmanColor="#8b5cf6"
          hovered={hoveredBearing}
          setHovered={setHoveredBearing}
          mousePos={mousePosBearing}
          setMousePos={setMousePosBearing}
          bounds={bearingData.bounds}
        />
      </div>
      
      {/* Second row: Course and Speed */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        <GraphComponent
          title="Course vs Time"
          rawData={courseData.data}
          kalmanData={kalmanCourseData}
          yAxisLabel="Course (°)"
          yAxisUnit="°"
          rawColor="#f97316"
          kalmanColor="#8b5cf6"
          hovered={hoveredCourse}
          setHovered={setHoveredCourse}
          mousePos={mousePosCourse}
          setMousePos={setMousePosCourse}
          bounds={courseData.bounds}
        />
        
        <GraphComponent
          title="Speed vs Time"
          rawData={speedData.data}
          kalmanData={kalmanSpeedData}
          yAxisLabel="Speed"
          yAxisUnit=""
          rawColor="#06b6d4"
          kalmanColor="#8b5cf6"
          hovered={hoveredSpeed}
          setHovered={setHoveredSpeed}
          mousePos={mousePosSpeed}
          setMousePos={setMousePosSpeed}
          bounds={speedData.bounds}
        />
      </div>
    </div>
  );
};

export default GraphDisplay;