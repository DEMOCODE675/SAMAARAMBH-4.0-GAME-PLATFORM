import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';

import HomePortal from './pages/HomePortal';
import MobileController from './pages/mobile/MobileController';
import ProjectorView from './pages/projector/ProjectorView';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAuthGate from './components/AdminAuthGate';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GameProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePortal />} />
              <Route path="/play" element={<MobileController />} />
              <Route path="/projector" element={<ProjectorView />} />
              <Route 
                path="/admin" 
                element={
                  <AdminAuthGate>
                    <AdminDashboard />
                  </AdminAuthGate>
                } 
              />
            </Routes>
          </BrowserRouter>
        </GameProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
