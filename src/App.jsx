// src/App.jsx
import React from 'react';
import GasStationMap from './components/GasStationMap';
import './App.css'; // Optional: include your custom CSS here

function App() {
  return (
    <div className="App" style={{ width: '100vw', height: '100vh' }}>
      <GasStationMap />
    </div>
  );
}

export default App;
