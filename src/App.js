import React, { useState, useMemo, useRef } from 'react';
import { Ship, Target, Play, RotateCcw } from 'lucide-react';
import InputControls from './components/InputControls';
import SimulationCanvas from './components/SimulationCanvas';
import GraphDisplay from './components/GraphDisplay';
import KalmanFilter from './kalmanFilter';

const TargetMotionAnalysis = () => {
  const [shipParams, setShipParams] = useState({ x: '', y: '', speed: '', course: '' });
  const [targetParams, setTargetParams] = useState({ x: '', y: '', speed: '', course: '' });
  const [simParams, setSimParams] = useState({ rate: '', duration: '' });
  const [noiseParams, setNoiseParams] = useState({ 
    rangeStdDev: '', 
    bearingStdDev: '',
    speedStdDev: '0.5',    // Add speed noise
    courseStdDev: '2'      // Add course noise
  });
  const [maneuverParams, setManeuverParams] = useState({ 
    enableShip: false,
    enableTarget: false,
    ship: { startTime: '', startCourse: '', endCourse: '', rateOfChange: '' },
    target: { startTime: '', startCourse: '', endCourse: '', rateOfChange: '' }
  });
  const [showSim, setShowSim] = useState(false);

  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredRange, setHoveredRange] = useState(null);
  const [mousePosRange, setMousePosRange] = useState({ x: 0, y: 0 });
  const [hoveredBearing, setHoveredBearing] = useState(null);
  const [mousePosBearing, setMousePosBearing] = useState({ x: 0, y: 0 });
  const [hoveredSpeed, setHoveredSpeed] = useState(null);
  const [mousePosSpeed, setMousePosSpeed] = useState({ x: 0, y: 0 });
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const [mousePosCourse, setMousePosCourse] = useState({ x: 0, y: 0 });

  const svgRef = React.useRef(null);

  const [kalmanTrackData, setKalmanTrackData] = useState([]);
  const [kalmanRangeData, setKalmanRangeData] = useState([]);
  const [kalmanBearingData, setKalmanBearingData] = useState([]);
  const [kalmanSpeedData, setKalmanSpeedData] = useState([]);
  const [kalmanCourseData, setKalmanCourseData] = useState([]);
  const [rawSpeedData, setRawSpeedData] = useState([]);
  const [rawCourseData, setRawCourseData] = useState([]);
  const [tmaResults, setTmaResults] = useState({ tc: null, ts: null, cpa: null, tcpa: null });

  const generateGaussianNoise = (stdDev) => {
    if (stdDev === 0) return 0;
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev;
  };

  const isValidNumber = (val) => {
    return typeof val === 'number' && !isNaN(val) && isFinite(val);
  };

  const simData = useMemo(() => {
    if (!showSim) {
      setKalmanTrackData([]);
      setKalmanRangeData([]);
      setKalmanBearingData([]);
      setKalmanSpeedData([]);
      setKalmanCourseData([]);
      setRawSpeedData([]);
      setRawCourseData([]);
      setTmaResults({ tc: null, ts: null, cpa: null, tcpa: null });
      return [];
    }

    const toNum = v => (typeof v === 'number' ? v : parseFloat(v) || 0);

    const s = { x: toNum(shipParams.x), y: toNum(shipParams.y), speed: toNum(shipParams.speed), course: toNum(shipParams.course) };
    const t = { x: toNum(targetParams.x), y: toNum(targetParams.y), speed: toNum(targetParams.speed), course: toNum(targetParams.course) };
    const rate = toNum(simParams.rate) > 0 ? toNum(simParams.rate) : 1;
    const duration = toNum(simParams.duration) > 0 ? toNum(simParams.duration) : 60;
    const rangeNoiseStdDev = toNum(noiseParams.rangeStdDev);
    const bearingNoiseStdDev = toNum(noiseParams.bearingStdDev);
    const speedNoiseStdDev = toNum(noiseParams.speedStdDev);      // Add speed noise
    const courseNoiseStdDev = toNum(noiseParams.courseStdDev);    // Add course noise

    const shipManeuver = maneuverParams.enableShip ? {
      startTime: toNum(maneuverParams.ship.startTime),
      startCourse: toNum(maneuverParams.ship.startCourse),
      endCourse: toNum(maneuverParams.ship.endCourse),
      rateOfChange: toNum(maneuverParams.ship.rateOfChange) > 0 ? toNum(maneuverParams.ship.rateOfChange) : 1
    } : null;

    const targetManeuver = maneuverParams.enableTarget ? {
      startTime: toNum(maneuverParams.target.startTime),
      startCourse: toNum(maneuverParams.target.startCourse),
      endCourse: toNum(maneuverParams.target.endCourse),
      rateOfChange: toNum(maneuverParams.target.rateOfChange) > 0 ? toNum(maneuverParams.target.rateOfChange) : 1
    } : null;

    const rawSimData = [];
    const kalmanEstimates = [];
    const kalmanEstimatedRanges = [];
    const kalmanEstimatedBearings = [];
    const kalmanEstimatedCourses = [];
    const kalmanEstimatedSpeeds = [];
    const rawTargetSpeeds = [];
    const rawTargetCourses = [];

    let shipX = s.x, shipY = s.y, targetX = t.x, targetY = t.y;

    const initialTargetVx = t.speed * Math.sin(t.course * Math.PI / 180);
    const initialTargetVy = t.speed * Math.cos(t.course * Math.PI / 180);
    const initialState = [t.x, t.y, initialTargetVx, initialTargetVy];

    const initialCovariance = [
      [100, 0, 0, 0],
      [0, 100, 0, 0],
      [0, 0, 10, 0],
      [0, 0, 0, 10]
    ];

    const Q = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0.1, 0],
      [0, 0, 0, 0.1]
    ];

    const minRangeNoise = Math.max(rangeNoiseStdDev, 0.1);
    const minBearingNoise = Math.max(bearingNoiseStdDev * Math.PI / 180, 0.001);
    
    const R = [
      [minRangeNoise * minRangeNoise, 0],
      [0, minBearingNoise * minBearingNoise]
    ];

    const kalmanFilter = new KalmanFilter(initialState, initialCovariance, Q, R);

    for (let i = 0; i <= duration; i += rate) {
      let shipCourse = s.course;
      if (shipManeuver) {
        const endTime = shipManeuver.startTime + Math.abs(shipManeuver.endCourse - shipManeuver.startCourse) / shipManeuver.rateOfChange;
        if (i >= shipManeuver.startTime && i <= endTime) {
          const elapsed = i - shipManeuver.startTime;
          const courseChange = (shipManeuver.endCourse - shipManeuver.startCourse) * elapsed / (endTime - shipManeuver.startTime);
          shipCourse = shipManeuver.startCourse + courseChange;
        }
      }

      let targetCourse = t.course;
      if (targetManeuver) {
        const endTime = targetManeuver.startTime + Math.abs(targetManeuver.endCourse - targetManeuver.startCourse) / targetManeuver.rateOfChange;
        if (i >= targetManeuver.startTime && i <= endTime) {
          const elapsed = i - targetManeuver.startTime;
          const courseChange = (targetManeuver.endCourse - targetManeuver.startCourse) * elapsed / (endTime - targetManeuver.startTime);
          targetCourse = targetManeuver.startCourse + courseChange;
        }
      }

      if (i > 0) {
        const sc = shipCourse * Math.PI / 180;
        const tc = targetCourse * Math.PI / 180;
        shipX += s.speed * rate * Math.sin(sc);
        shipY += s.speed * rate * Math.cos(sc);
        targetX += t.speed * rate * Math.sin(tc);
        targetY += t.speed * rate * Math.cos(tc);
      }

      const dx = targetX - shipX;
      const dy = targetY - shipY;
      let trueRange = Math.sqrt(dx * dx + dy * dy);
      let trueBearing = Math.atan2(dx, dy) * 180 / Math.PI;
      if (trueBearing < 0) trueBearing += 360;

      const noisyRange = trueRange + generateGaussianNoise(rangeNoiseStdDev);
      const noisyBearing = trueBearing + generateGaussianNoise(bearingNoiseStdDev);

      // Add noise to speed and course for realistic raw measurements
      const noisyTargetSpeed = t.speed + generateGaussianNoise(speedNoiseStdDev);
      const noisyTargetCourse = targetCourse + generateGaussianNoise(courseNoiseStdDev);

      rawSimData.push({
        time: i,
        shipX: shipX,
        shipY: shipY,
        targetX: targetX,
        targetY: targetY,
        range: noisyRange,
        bearing: noisyBearing,
        targetCourse: noisyTargetCourse,  // Now noisy
        targetSpeed: noisyTargetSpeed     // Now noisy
      });

      rawTargetSpeeds.push({ time: i, y: noisyTargetSpeed, x: i });
      rawTargetCourses.push({ time: i, y: noisyTargetCourse, x: i });

      try {
        kalmanFilter.predict(rate);
        kalmanFilter.update([noisyRange, noisyBearing], { x: shipX, y: shipY });
        
        const [estimatedPx, estimatedPy, estimatedVx, estimatedVy] = kalmanFilter.getState();
        
        if ([estimatedPx, estimatedPy, estimatedVx, estimatedVy].every(isValidNumber)) {
          kalmanEstimates.push({
            time: i,
            x: estimatedPx,
            y: estimatedPy,
            vx: estimatedVx,
            vy: estimatedVy,
            type: 'kalman'
          });

          const estDx = estimatedPx - shipX;
          const estDy = estimatedPy - shipY;
          
          let estimatedRange = Math.sqrt(estDx * estDx + estDy * estDy);
          let estimatedBearing = Math.atan2(estDx, estDy) * 180 / Math.PI;
          if (estimatedBearing < 0) estimatedBearing += 360;

          const estimatedSpeed = Math.sqrt(estimatedVx * estimatedVx + estimatedVy * estimatedVy);
          let estimatedCourse = Math.atan2(estimatedVx, estimatedVy) * 180 / Math.PI;
          if (estimatedCourse < 0) estimatedCourse += 360;

          if (isValidNumber(estimatedRange) && isValidNumber(estimatedBearing) && isValidNumber(estimatedSpeed) && isValidNumber(estimatedCourse)) {
            kalmanEstimatedRanges.push({ time: i, y: estimatedRange, x: i });
            kalmanEstimatedBearings.push({ time: i, y: estimatedBearing, x: i });
            kalmanEstimatedSpeeds.push({ time: i, y: estimatedSpeed, x: i });
            kalmanEstimatedCourses.push({ time: i, y: estimatedCourse, x: i });
          }
        }
      } catch (error) {
        console.error(`Kalman filter error at time ${i}:`, error);
      }
    }

    // Calculate TMA results
    if (kalmanEstimates.length > 0) {
      const [estPx, estPy, estVx, estVy] = kalmanFilter.getState();
      if ([estPx, estPy, estVx, estVy].every(isValidNumber)) {
        let tc = Math.atan2(estVx, estVy) * 180 / Math.PI;
        if (tc < 0) tc += 360;
        const ts = Math.sqrt(estVx * estVx + estVy * estVy);

        const lastShipData = rawSimData[rawSimData.length - 1];
        const ownVx = s.speed * Math.sin(s.course * Math.PI / 180);
        const ownVy = s.speed * Math.cos(s.course * Math.PI / 180);

        const relPx = estPx - lastShipData.shipX;
        const relPy = estPy - lastShipData.shipY;
        const relVx = estVx - ownVx;
        const relVy = estVy - ownVy;

        const relSpeedSq = relVx * relVx + relVy * relVy;
        let cpa = null;
        let tcpa = null;

        if (relSpeedSq > 0.001) { 
          tcpa = -(relPx * relVx + relPy * relVy) / relSpeedSq;
          const cpaX = relPx + relVx * tcpa;
          const cpaY = relPy + relVy * tcpa;
          cpa = Math.sqrt(cpaX * cpaX + cpaY * cpaY);
        
        } else {
          cpa = Math.sqrt(relPx * relPx + relPy * relPy);
          tcpa = Infinity;
        }
                                                         
        setTmaResults({ tc, ts, cpa, tcpa });
      }
    }

    setKalmanTrackData(kalmanEstimates);
    setKalmanRangeData(kalmanEstimatedRanges);
    setKalmanBearingData(kalmanEstimatedBearings);
    setKalmanSpeedData(kalmanEstimatedSpeeds);
    setKalmanCourseData(kalmanEstimatedCourses);
    setRawSpeedData(rawTargetSpeeds);
    setRawCourseData(rawTargetCourses);
    
    return rawSimData;
  }, [shipParams, targetParams, simParams, noiseParams, maneuverParams, showSim]);

  const handleChange = setter => (k, v) => setter(prev => ({ ...prev, [k]: v }));

  const handleShipManeuverToggle = (checked) => {
    setManeuverParams(prev => ({
      ...prev,
      enableShip: checked,
      ship: {
        ...prev.ship,
        startCourse: checked && shipParams.course ? shipParams.course : prev.ship.startCourse
      }
    }));
  };

  const handleTargetManeuverToggle = (checked) => {
    setManeuverParams(prev => ({
      ...prev,
      enableTarget: checked,
      target: {
        ...prev.target,
        startCourse: checked && targetParams.course ? targetParams.course : prev.target.startCourse
      }
    }));
  };

  const chartData = useMemo(() => {
    if (!simData.length) return { shipData: [], targetData: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 } };

    const shipData = simData.map(d => ({ x: d.shipX, y: d.shipY, time: d.time, type: 'ship' }));
    const targetData = simData.map(d => ({ x: d.targetX, y: d.targetY, time: d.time, type: 'target' }));

    const allX = [...shipData.map(d => d.x), ...targetData.map(d => d.x), ...kalmanTrackData.map(d => d.x)].filter(val => isValidNumber(val));
    const allY = [...shipData.map(d => d.y), ...targetData.map(d => d.y), ...kalmanTrackData.map(d => d.y)].filter(val => isValidNumber(val));
    
    const minX = allX.length > 0 ? Math.min(...allX) : 0;
    const maxX = allX.length > 0 ? Math.max(...allX) : 100;
    const minY = allY.length > 0 ? Math.min(...allY) : 0;
    const maxY = allY.length > 0 ? Math.max(...allY) : 100;
    
    const padding = Math.max((maxX - minX) * 0.1, (maxY - minY) * 0.1, 10);

    return {
      shipData,
      targetData,
      bounds: {
        minX: minX - padding,
        maxX: maxX + padding,
        minY: minY - padding,
        maxY: maxY + padding
      }
    };
  }, [simData, kalmanTrackData]);

  const rangeData = useMemo(() => {
    if (!simData.length) return { data: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 } };
    const data = simData.map(d => ({ x: d.time, y: d.range }));

    const allX = data.map(d => d.x).filter(val => isValidNumber(val));
    const allY = data.map(d => d.y).filter(val => isValidNumber(val));

    const minX = allX.length > 0 ? Math.min(...allX) : 0;
    const maxX = allX.length > 0 ? Math.max(...allX) : 100;
    const minY = allY.length > 0 ? Math.min(...allY) : 0;
    const maxY = allY.length > 0 ? Math.max(...allY) : 100;
    
    const padding = Math.max((maxY - minY) * 0.1, 10);

    return {
      data,
      bounds: {
        minX: minX,
        maxX: maxX,
        minY: minY - padding,
        maxY: maxY + padding
      }
    };
  }, [simData]);

  const bearingData = useMemo(() => {
    if (!simData.length) return { data: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 360 } };
    const data = simData.map(d => ({ x: d.time, y: d.bearing }));

    const allX = data.map(d => d.x).filter(val => isValidNumber(val));
    const allY = data.map(d => d.y).filter(val => isValidNumber(val));

    const minX = allX.length > 0 ? Math.min(...allX) : 0;
    const maxX = allX.length > 0 ? Math.max(...allX) : 100;
    const minY = allY.length > 0 ? Math.min(...allY) : 0;
    const maxY = allY.length > 0 ? Math.max(...allY) : 360;

    return {
      data,
      bounds: {
        minX: minX,
        maxX: maxX,
        minY: Math.min(0, minY),
        maxY: Math.max(360, maxY)
      }
    };
  }, [simData]);

  const courseData = useMemo(() => {
    if (!simData.length) return { data: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 360 } };
    const data = simData.map(d => ({ x: d.time, y: d.targetCourse }));

    const allX = data.map(d => d.x).filter(val => isValidNumber(val));
    const allY = data.map(d => d.y).filter(val => isValidNumber(val));

    const minX = allX.length > 0 ? Math.min(...allX) : 0;
    const maxX = allX.length > 0 ? Math.max(...allX) : 100;
    const minY = allY.length > 0 ? Math.min(...allY) : 0;
    const maxY = allY.length > 0 ? Math.max(...allY) : 360;

    return {
      data,
      bounds: {
        minX: minX,
        maxX: maxX,
        minY: Math.min(0, minY),
        maxY: Math.max(360, maxY)
      }
    };
  }, [simData]);

  const speedData = useMemo(() => {
    if (!simData.length) return { data: [], bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 } };
    const data = simData.map(d => ({ x: d.time, y: d.targetSpeed }));

    const allX = data.map(d => d.x).filter(val => isValidNumber(val));
    const allY = data.map(d => d.y).filter(val => isValidNumber(val));

    const minX = allX.length > 0 ? Math.min(...allX) : 0;
    const maxX = allX.length > 0 ? Math.max(...allX) : 100;
    const minY = allY.length > 0 ? Math.min(...allY) : 0;
    const maxY = allY.length > 0 ? Math.max(...allY) : 100;
    const padding = Math.max((maxY - minY) * 0.1, 1);

    return {
      data,
      bounds: {
        minX: minX,
        maxX: maxX,
        minY: minY - padding,
        maxY: maxY + padding
      }
    };
  }, [simData]);

  const inputStyle = { width: 100, padding: 8, fontSize: 14, borderRadius: 6, border: '1px solid #ccc' };
  const buttonStyle = { ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };

  return (
    <div style={{ padding: 20, background: '#f0f4f8', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 30, color: '#333' }}>
        <Ship size={24} /> Target Motion Analysis <Target size={24} />
      </h1>

      <InputControls
        shipParams={shipParams}
        setShipParams={setShipParams}
        targetParams={targetParams}
        setTargetParams={setTargetParams}
        simParams={simParams}
        setSimParams={setSimParams}
        noiseParams={noiseParams}
        setNoiseParams={setNoiseParams}
        maneuverParams={maneuverParams}
        setManeuverParams={setManeuverParams}
        handleChange={handleChange}
        handleShipManeuverToggle={handleShipManeuverToggle}
        handleTargetManeuverToggle={handleTargetManeuverToggle}
        setShowSim={setShowSim}
        inputStyle={inputStyle}
        buttonStyle={buttonStyle}
        tmaResults={tmaResults}
      />

      {showSim && simData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SimulationCanvas
            chartData={chartData}
            hoveredPoint={hoveredPoint}
            setHoveredPoint={setHoveredPoint}
            mousePos={mousePos}
            setMousePos={setMousePos}
            svgRef={svgRef}
            kalmanTrackData={kalmanTrackData}
          />

          <GraphDisplay
            rangeData={rangeData}
            bearingData={bearingData}
            speedData={speedData}
            courseData={courseData}
            kalmanRangeData={kalmanRangeData}
            kalmanBearingData={kalmanBearingData}
            kalmanSpeedData={kalmanSpeedData}
            kalmanCourseData={kalmanCourseData}
            hoveredRange={hoveredRange}
            setHoveredRange={setHoveredRange}
            mousePosRange={mousePosRange}
            setMousePosRange={setMousePosRange}
            hoveredBearing={hoveredBearing}
            setHoveredBearing={setHoveredBearing}
            mousePosBearing={mousePosBearing}
            setMousePosBearing={setMousePosBearing}
            hoveredSpeed={hoveredSpeed}
            setHoveredSpeed={setHoveredSpeed}
            mousePosSpeed={mousePosSpeed}
            setMousePosSpeed={setMousePosSpeed}
            hoveredCourse={hoveredCourse}
            setHoveredCourse={setHoveredCourse}
            mousePosCourse={mousePosCourse}
            setMousePosCourse={setMousePosCourse}
          />
        </div>
      )}
    </div>
  );
};

export default TargetMotionAnalysis;