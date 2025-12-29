// src/App.jsx
import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import GasStationMap from './components/GasStationMap';
import './App.css'; // Optional: include your custom CSS here

function App() {
  return (
    <ThemeProvider>
      <div className="App bg-gray-100 dark:bg-gray-900" style={{ width: '100vw', height: '100vh' }}>
        <GasStationMap />
      </div>
    </ThemeProvider>
  );
}

export default App;
