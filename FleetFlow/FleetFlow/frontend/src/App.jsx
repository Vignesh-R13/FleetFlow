import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Route-level code splitting: everything past login/dashboard is lazy-loaded
// so the initial bundle stays small and heavier pages (maps, charts) only
// download when actually visited.
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const Fleet = lazy(() => import('./pages/Fleet'));
const VesselDetails = lazy(() => import('./pages/VesselDetails'));
const Voyages = lazy(() => import('./pages/Voyages'));
const VoyageDetails = lazy(() => import('./pages/VoyageDetails'));
const Tracking = lazy(() => import('./pages/Tracking'));
const Fuel = lazy(() => import('./pages/Fuel'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Cargo = lazy(() => import('./pages/Cargo'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Profitability = lazy(() => import('./pages/Profitability'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Assistant = lazy(() => import('./pages/Assistant'));

function PageFallback() {
  return <div className="text-sm text-navy-500 dark:text-slate-400 p-6">Loading…</div>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/command-center" element={<CommandCenter />} />
                <Route path="/fleet" element={<Fleet />} />
                <Route path="/fleet/:id" element={<VesselDetails />} />
                <Route path="/voyages" element={<Voyages />} />
                <Route path="/voyages/:id" element={<VoyageDetails />} />
                <Route path="/tracking" element={<Tracking />} />
                <Route path="/fuel" element={<Fuel />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route
                  path="/cargo"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'FLEET_MANAGER']}>
                      <Cargo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'FLEET_MANAGER', 'MAINTENANCE_MANAGER']}>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profitability"
                  element={
                    <ProtectedRoute roles={['ADMIN', 'FLEET_MANAGER']}>
                      <Profitability />
                    </ProtectedRoute>
                  }
                />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/reports" element={<Reports />} />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute roles={['ADMIN']}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
