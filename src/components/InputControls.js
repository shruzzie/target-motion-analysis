import React from 'react';
import { Ship, Target, RotateCcw, Play } from 'lucide-react';

const InputControls = ({
  shipParams,
  setShipParams,
  targetParams,
  setTargetParams,
  simParams,
  setSimParams,
  noiseParams,
  setNoiseParams,
  maneuverParams,
  setManeuverParams,
  handleChange,
  handleShipManeuverToggle,
  handleTargetManeuverToggle,
  setShowSim,
  inputStyle,
  buttonStyle,
  tmaResults // Receive TMA results
}) => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 25 }}>
        {['ship', 'target'].map(type => {
          const p = type === 'ship' ? shipParams : targetParams;
          const setter = type === 'ship' ? setShipParams : setTargetParams;
          const color = type === 'ship' ? '#1e40af' : '#dc2626';
          return (
            <div key={type} style={{ background: 'white', padding: 25, borderRadius: 12, minWidth: 280, textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ color, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                {type === 'ship' ? <Ship size={20} /> : <Target size={20} />} {type.toUpperCase()}
              </h3>
              {['x', 'y', 'speed', 'course'].map(k => (
                <div key={k} style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#555' }}>{k.toUpperCase()}:</label>
                  <input
                    type="text"
                    value={p[k]}
                    onChange={e => handleChange(setter)(k, e.target.value)}
                    style={inputStyle}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          );
        })}

        <div style={{ background: 'white', padding: 25, borderRadius: 12, minWidth: 280, textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: '#7c3aed', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={20} /> MANEUVERS
          </h3>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input
                type="checkbox"
                id="enableShip"
                checked={maneuverParams.enableShip}
                onChange={e => handleShipManeuverToggle(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="enableShip" style={{ fontWeight: 500, color: '#1e40af', cursor: 'pointer' }}>Ship Maneuver</label>
            </div>
            {maneuverParams.enableShip && (
              <div style={{ marginLeft: 24, padding: 15, background: '#f8fafc', borderRadius: 8, marginBottom: 15, border: '1px solid #e2e8f0' }}>
                {['startTime', 'startCourse', 'endCourse', 'rateOfChange'].map(k => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 3, fontSize: 12, fontWeight: 500, color: '#666' }}>
                      {k === 'startTime' ? 'START TIME (s)' : k === 'startCourse' ? 'START COURSE (°)' : 
                       k === 'endCourse' ? 'END COURSE (°)' : 'RATE (°/s)'}:
                    </label>
                    <input
                      type="text"
                      value={maneuverParams.ship[k]}
                      onChange={e => setManeuverParams(prev => ({ 
                        ...prev, 
                        ship: { ...prev.ship, [k]: e.target.value } 
                      }))}
                      style={{ ...inputStyle, width: '100%', backgroundColor: '#f0f4f8' }}
                      placeholder={k === 'rateOfChange' ? '1' : '0'}
                    />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input
                type="checkbox"
                id="enableTarget"
                checked={maneuverParams.enableTarget}
                onChange={e => handleTargetManeuverToggle(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="enableTarget" style={{ fontWeight: 500, color: '#dc2626', cursor: 'pointer' }}>Target Maneuver</label>
            </div>
            {maneuverParams.enableTarget && (
              <div style={{ marginLeft: 24, padding: 15, background: '#fef2f2', borderRadius: 8, border: '1px solid #fee2e2' }}>
                {['startTime', 'startCourse', 'endCourse', 'rateOfChange'].map(k => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', marginBottom: 3, fontSize: 12, fontWeight: 500, color: '#666' }}>
                      {k === 'startTime' ? 'START TIME (s)' : k === 'startCourse' ? 'START COURSE (°)' : 
                       k === 'endCourse' ? 'END COURSE (°)' : 'RATE (°/s)'}:
                    </label>
                    <input
                      type="text"
                      value={maneuverParams.target[k]}
                      onChange={e => setManeuverParams(prev => ({ 
                        ...prev, 
                        target: { ...prev.target, [k]: e.target.value } 
                      }))}
                      style={{ ...inputStyle, width: '100%', backgroundColor: '#fef7f7' }}
                      placeholder={k === 'rateOfChange' ? '1' : '0'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 25 }}>
        <div style={{ background: 'white', padding: 25, borderRadius: 12, minWidth: 280, textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: '#059669', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            NOISE PARAMETERS
          </h3>
          {['rangeStdDev', 'bearingStdDev'].map(k => (
            <div key={k} style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#555' }}>
                {k === 'rangeStdDev' ? 'RANGE NOISE STD DEV (m)' : 'BEARING NOISE STD DEV (°)'}:
              </label>
              <input
                type="text"
                value={noiseParams[k]}
                onChange={e => handleChange(setNoiseParams)(k, e.target.value)}
                style={inputStyle}
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <div style={{ background: 'white', padding: 25, borderRadius: 12, minWidth: 280, textAlign: 'left', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: 20, color: '#333' }}>Simulation Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            {['rate', 'duration'].map(k => (
              <div key={k} style={{ width: '100%' }}>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, color: '#555' }}>{k.toUpperCase()}</label>
                <input
                  type="text"
                  value={simParams[k]}
                  onChange={e => handleChange(setSimParams)(k, e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                  placeholder={k === 'rate' ? '1' : '60'}
                />
              </div>
            ))}
            <button onClick={() => setShowSim(true)} style={{ ...buttonStyle, background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(16,185,129,0.3)', transition: 'background-color 0.3s ease', width: '100%', justifyContent: 'center' }}>
              <Play size={16} /> Run
            </button>
            <button onClick={() => { setShowSim(false); setSimParams({ rate: '', duration: '' }); setNoiseParams({ rangeStdDev: '', bearingStdDev: '' }); setManeuverParams({ enableShip: false, enableTarget: false, ship: { startTime: '', startCourse: '', endCourse: '', rateOfChange: '' }, target: { startTime: '', startCourse: '', endCourse: '', rateOfChange: '' } }); }} style={{ ...buttonStyle, background: '#6b7280', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(107,114,128,0.3)', transition: 'background-color 0.3s ease', width: '100%', justifyContent: 'center' }}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* New TMA Results Display Section */}
      <div style={{ background: 'white', padding: 25, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginTop: 20 }}>
        <h3 style={{ marginBottom: 20, color: '#333' }}>Target Motion Analysis Results (Kalman Filtered)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px 30px', maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#555' }}>Target Course (TC):</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1e40af' }}>{tmaResults.tc !== null ? `${tmaResults.tc.toFixed(2)}°` : 'N/A'}</div>

          <div style={{ fontSize: 16, fontWeight: 500, color: '#555' }}>Target Speed (TS):</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1e40af' }}>{tmaResults.ts !== null ? `${tmaResults.ts.toFixed(2)}` : 'N/A'}</div>

          <div style={{ fontSize: 16, fontWeight: 500, color: '#555' }}>Closest Point of Approach (CPA):</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#dc2626' }}>{tmaResults.cpa !== null ? `${tmaResults.cpa.toFixed(2)}` : 'N/A'}</div>

          <div style={{ fontSize: 16, fontWeight: 500, color: '#555' }}>Time to CPA (TCPA):</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#dc2626' }}>{tmaResults.tcpa !== null ? (tmaResults.tcpa === Infinity ? 'Infinity' : `${tmaResults.tcpa.toFixed(1)}s`) : 'N/A'}</div>
        </div>
      </div>
    </>
  );
};

export default InputControls;
