// kalmanFilter.js

// --- Basic Matrix Operations ---
const multiplyMatrices = (m1, m2) => {
  const result = [];
  for (let i = 0; i < m1.length; i++) {
    result[i] = [];
    for (let j = 0; j < m2[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < m1[0].length; k++) {
        sum += m1[i][k] * m2[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
};

const addMatrices = (m1, m2) => {
  const result = [];
  for (let i = 0; i < m1.length; i++) {
    result[i] = [];
    for (let j = 0; j < m1[0].length; j++) {
      result[i][j] = m1[i][j] + m2[i][j];
    }
  }
  return result;
};

const subtractMatrices = (m1, m2) => {
  const result = [];
  for (let i = 0; i < m1.length; i++) {
    result[i] = [];
    for (let j = 0; j < m1[0].length; j++) {
      result[i][j] = m1[i][j] - m2[i][j];
    }
  }
  return result;
};

const transposeMatrix = (m) => {
  const result = [];
  for (let i = 0; i < m[0].length; i++) {
    result[i] = [];
    for (let j = 0; j < m.length; j++) {
      result[i][j] = m[j][i];
    }
  }
  return result;
};

// Utility function to check if a value is valid
const isValidNumber = (val) => {
  return typeof val === 'number' && !isNaN(val) && isFinite(val);
};

// Utility function to validate matrix
const isValidMatrix = (matrix) => {
  if (!Array.isArray(matrix) || matrix.length === 0) return false;
  for (let i = 0; i < matrix.length; i++) {
    if (!Array.isArray(matrix[i])) return false;
    for (let j = 0; j < matrix[i].length; j++) {
      if (!isValidNumber(matrix[i][j])) return false;
    }
  }
  return true;
};

// More robust 2x2 matrix inverse with better error handling
const inverseMatrix2x2 = (m) => {
  if (!isValidMatrix(m) || m.length !== 2 || m[0].length !== 2) {
    throw new Error("Invalid matrix for inversion");
  }
  
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  
  if (Math.abs(det) < 1e-10) {
    console.warn("Matrix is near-singular, det =", det);
    // Add small regularization to diagonal
    const regularized = [
      [m[0][0] + 1e-6, m[0][1]],
      [m[1][0], m[1][1] + 1e-6]
    ];
    const newDet = regularized[0][0] * regularized[1][1] - regularized[0][1] * regularized[1][0];
    if (Math.abs(newDet) < 1e-10) {
      throw new Error("Matrix is singular, cannot invert even with regularization");
    }
    return [
      [regularized[1][1] / newDet, -regularized[0][1] / newDet],
      [-regularized[1][0] / newDet, regularized[0][0] / newDet]
    ];
  }
  
  const inv = [
    [m[1][1] / det, -m[0][1] / det],
    [-m[1][0] / det, m[0][0] / det]
  ];
  
  // Validate the result
  if (!isValidMatrix(inv)) {
    throw new Error("Matrix inversion produced invalid results");
  }
  
  return inv;
};

const identityMatrix = (size) => {
  const matrix = [];
  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      matrix[i][j] = i === j ? 1 : 0;
    }
  }
  return matrix;
};

// --- Kalman Filter Class ---
class KalmanFilter {
  constructor(initialState, initialCovariance, processNoiseCovariance, measurementNoiseCovariance) {
    // Validate inputs
    if (!Array.isArray(initialState) || !initialState.every(isValidNumber)) {
      throw new Error("Invalid initial state");
    }
    if (!isValidMatrix(initialCovariance)) {
      throw new Error("Invalid initial covariance matrix");
    }
    if (!isValidMatrix(processNoiseCovariance)) {
      throw new Error("Invalid process noise covariance matrix");
    }
    if (!isValidMatrix(measurementNoiseCovariance)) {
      throw new Error("Invalid measurement noise covariance matrix");
    }

    // State vector: [x, y, vx, vy]
    // Store as a column vector (2D array) for matrix operations: [[x], [y], [vx], [vy]]
    this.x = initialState.map(val => [val]); 
    // Covariance matrix: represents uncertainty in our state estimate
    this.P = initialCovariance.map(row => [...row]); // Deep copy
    // Process noise covariance matrix (Q): uncertainty in our motion model
    this.Q = processNoiseCovariance.map(row => [...row]); // Deep copy
    // Measurement noise covariance matrix (R): uncertainty in our sensor measurements
    this.R = measurementNoiseCovariance.map(row => [...row]); // Deep copy

    // State transition matrix (F) - for constant velocity model
    // This matrix describes how the state changes from one time step to the next
    // F will be updated with dt in the predict step
    this.F = [
      [1, 0, 1, 0], // x = x + vx*dt
      [0, 1, 0, 1], // y = y + vy*dt
      [0, 0, 1, 0], // vx = vx
      [0, 0, 0, 1]  // vy = vy
    ];

    // Identity matrix, used in the update step
    this.I = identityMatrix(this.x.length);
    
    console.log("KalmanFilter initialized successfully");
  }

  // Prediction step
  predict(dt) {
    if (!isValidNumber(dt) || dt <= 0) {
      throw new Error("Invalid time step for prediction");
    }

    // Update F with the current time step (dt)
    this.F[0][2] = dt; // x = x + vx*dt
    this.F[1][3] = dt; // y = y + vy*dt

    // Validate current state before prediction
    if (!isValidMatrix(this.x)) {
      throw new Error("Invalid state before prediction");
    }

    // Predict next state: x_k = F * x_{k-1}
    const newX = multiplyMatrices(this.F, this.x);
    if (!isValidMatrix(newX)) {
      throw new Error("State prediction produced invalid results");
    }
    this.x = newX;

    // Predict next covariance: P_k = F * P_{k-1} * F^T + Q
    const F_T = transposeMatrix(this.F);
    const FPF_T = multiplyMatrices(multiplyMatrices(this.F, this.P), F_T);
    const newP = addMatrices(FPF_T, this.Q);
    
    if (!isValidMatrix(newP)) {
      throw new Error("Covariance prediction produced invalid results");
    }
    this.P = newP;
  }

  // Update step (Extended Kalman Filter for non-linear measurements)
  update(measurement, ownShipPos) {
    // Validate inputs
    if (!Array.isArray(measurement) || measurement.length !== 2 || !measurement.every(isValidNumber)) {
      throw new Error("Invalid measurement data");
    }
    if (!ownShipPos || !isValidNumber(ownShipPos.x) || !isValidNumber(ownShipPos.y)) {
      throw new Error("Invalid own ship position");
    }

    const [px, py, vx, vy] = this.x.flat(); // Flatten x to get 1D values for calculations
    const ox = ownShipPos.x;
    const oy = ownShipPos.y;

    // Predicted measurement (h(x)) based on current state estimate
    const dx = px - ox;
    const dy = py - oy;
    const predictedRange = Math.sqrt(dx * dx + dy * dy);
    
    // Handle case where range is very small to avoid division by zero
    if (predictedRange < 0.1) { // Increased threshold for better stability
        console.warn("Predicted range is very small (", predictedRange, "), skipping update step to prevent numerical issues.");
        return; 
    }

    let predictedBearing = Math.atan2(dx, dy) * 180 / Math.PI;
    if (predictedBearing < 0) predictedBearing += 360;

    // Jacobian of the measurement function (H)
    const rangeSq = predictedRange * predictedRange;

    const H = [
      [dx / predictedRange, dy / predictedRange, 0, 0], // Derivative of range w.r.t [x, y, vx, vy]
      [dy / rangeSq, -dx / rangeSq, 0, 0] // Derivative of bearing w.r.t [x, y, vx, vy]
    ];

    // Validate Jacobian
    if (!isValidMatrix(H)) {
      console.error("Invalid Jacobian matrix, skipping update");
      return;
    }

    // Measurement residual (y): actual measurement - predicted measurement
    // Bearing measurements in radians for consistency with the EKF math
    const actualBearingRad = measurement[1] * Math.PI / 180;
    const predictedBearingRad = predictedBearing * Math.PI / 180;

    // Handle angle wrap-around for bearing residual
    let bearingResidual = actualBearingRad - predictedBearingRad;
    if (bearingResidual > Math.PI) bearingResidual -= 2 * Math.PI;
    if (bearingResidual < -Math.PI) bearingResidual += 2 * Math.PI;

    const y = [
      [measurement[0] - predictedRange], // Range residual
      [bearingResidual] // Bearing residual (in radians)
    ];

    // Validate residual
    if (!isValidMatrix(y)) {
      console.error("Invalid measurement residual, skipping update");
      return;
    }

    // Kalman Gain (K): K = P * H^T * (H * P * H^T + R)^-1
    const H_T = transposeMatrix(H);
    const PH_T = multiplyMatrices(this.P, H_T);
    const H_P_H_T = multiplyMatrices(multiplyMatrices(H, this.P), H_T);
    const S = addMatrices(H_P_H_T, this.R); // S = H * P * H^T + R (innovation covariance)

    // Validate innovation covariance
    if (!isValidMatrix(S)) {
      console.error("Invalid innovation covariance matrix, skipping update");
      return;
    }

    let S_inv;
    try {
      S_inv = inverseMatrix2x2(S); // Use 2x2 inverse as S is 2x2
    } catch (error) {
      console.error("Kalman Filter: Failed to invert S matrix:", error.message);
      return; // Skip update if inversion fails
    }
    
    const K = multiplyMatrices(PH_T, S_inv);

    // Validate Kalman gain
    if (!isValidMatrix(K)) {
      console.error("Invalid Kalman gain matrix, skipping update");
      return;
    }

    // Update state estimate: x_k = x_{k-1} + K * y
    const Ky = multiplyMatrices(K, y);
    const newX = addMatrices(this.x, Ky);
    
    if (!isValidMatrix(newX)) {
      console.error("State update produced invalid results, skipping update");
      return;
    }
    this.x = newX;

    // Update covariance estimate: P_k = (I - K * H) * P_{k-1}
    const KH = multiplyMatrices(K, H);
    const I_KH = subtractMatrices(this.I, KH);
    const newP = multiplyMatrices(I_KH, this.P);
    
    if (!isValidMatrix(newP)) {
      console.error("Covariance update produced invalid results, skipping update");
      return;
    }
    this.P = newP;
  }

  // Get current estimated state (flattened to 1D array for easier use)
  getState() {
    const state = this.x.flat();
    // Validate state before returning
    if (!state.every(isValidNumber)) {
      console.error("Warning: State contains invalid values");
    }
    return state;
  }
}

export default KalmanFilter;
    