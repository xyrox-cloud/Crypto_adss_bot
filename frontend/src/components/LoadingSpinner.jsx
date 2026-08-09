import React from 'react';

const LoadingSpinner = ({ size = 22, color = 'currentColor' }) => (
  <span
    className="spinner"
    style={{ width: size, height: size, color }}
    aria-label="Loading"
  />
);

export default LoadingSpinner;
