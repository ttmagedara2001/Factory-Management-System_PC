import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './Components/dashboard/ErrorBoundary';
import DashboardHome from './Components/DashboardHome';

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/:deviceId" element={<DashboardHome />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
