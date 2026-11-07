import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import DashboardPage from './pages/Dashboard';
import LiveMonitorPage from './pages/LiveMonitor';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <Router>
      <div className="flex" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
        {/* Sidebar Navigation */}
        <Navigation />

        {/* Main Content Area */}
        <main style={{
          marginLeft: '240px', // Matches Navigation width
          flex: 1,
          padding: 'var(--spacing-2xl)', // Assuming 2xl spacing for main content area
          minHeight: '100vh',
          width: 'calc(100% - 240px)'
        }}>
          <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/live" element={<LiveMonitorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
