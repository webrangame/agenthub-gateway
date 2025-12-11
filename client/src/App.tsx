import React from 'react';
import CapabilityLayoutMapper from './CapabilityLayoutMapper';
import './index.css';

function App() {
  // Hardcoded for now, this will eventually come from the Agent File or Backend
  const activeCapabilities = ['trip-guardian'];

  return (
    <CapabilityLayoutMapper capabilities={activeCapabilities} />
  );
}

export default App;
