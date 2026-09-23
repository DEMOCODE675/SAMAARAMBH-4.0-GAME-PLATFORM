import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';

import HomePortal from './pages/HomePortal';
import MobileController from './pages/mobile/MobileController';
import ProjectorView from './pages/projector/ProjectorView';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePortal />} />
            <Route path="/play" element={<MobileController />} />
            <Route path="/projector" element={<ProjectorView />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  );
}
