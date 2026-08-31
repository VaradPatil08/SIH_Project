import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import AdminLoginModal from './components/AdminLoginModal';
import RequireStationAdmin from './components/RequireStationAdmin';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import TrackingPage from './pages/TrackingPage';
import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';

// Scroll to top helper on route navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MainApp() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-navy selection:text-white relative overflow-x-hidden">
      <ScrollToTop />
      
      {/* Top Navigation */}
      <Navbar />

      {/* Main Routed Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            
            <Route 
              path="/" 
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <LandingPage />
                </motion.div>
              } 
            />

            <Route 
              path="/train/:trainNumber" 
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <TrackingPage />
                </motion.div>
              } 
            />

            <Route 
              path="/about" 
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <AboutPage />
                </motion.div>
              } 
            />

            {/* Fallback to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />

            {/* Station Admin View — Guarded by RequireStationAdmin */}
            <Route
              path="/admin"
              element={
                <RequireStationAdmin>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <AdminPage />
                  </motion.div>
                </RequireStationAdmin>
              }
            />
            <Route
              path="/admin/:stationCode"
              element={
                <RequireStationAdmin>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <AdminPage />
                  </motion.div>
                </RequireStationAdmin>
              }
            />

          </Routes>
        </AnimatePresence>
      </main>

      {/* Global Modals */}
      <SettingsModal />
      <AuthModal />
      <AdminLoginModal />

      {/* Global Footer (hidden on Live Trains directory and Track Train pages) */}
      {location.pathname !== '/' && !location.pathname.startsWith('/train') && <Footer />}
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <MainApp />
      </SettingsProvider>
    </AuthProvider>
  );
}





