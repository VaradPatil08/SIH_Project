import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../services/api';

/**
 * Route guard component for Station Admin protected pages.
 * Actively validates station_admin credentials and token validity against backend.
 * If token is missing, synthetic/mock, or expired, revokes access, opens the
 * Admin Login modal with an informative message, and redirects to home.
 * Prevents AdminPage from mounting or rendering empty shell for unauthorized users.
 */
export default function RequireStationAdmin({ children }) {
  const { token, isStationAdmin, logout, openAdminLoginModal } = useAuth();
  const [status, setStatus] = useState('checking'); // 'checking' | 'authorized' | 'unauthorized'

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminSession() {
      // 1. If not logged in as station_admin or missing token
      if (!token || !isStationAdmin) {
        if (isMounted) setStatus('unauthorized');
        openAdminLoginModal();
        return;
      }

      // 2. If token is synthetic/mock from previous fallback
      if (token.startsWith('mock-')) {
        if (isMounted) setStatus('unauthorized');
        logout();
        openAdminLoginModal('Your session has expired, please log in again.');
        return;
      }

      // 3. Actively verify real JWT token validity against backend
      try {
        const profile = await getUserProfile(token);
        if (!isMounted) return;

        if (profile && profile.role === 'station_admin') {
          setStatus('authorized');
        } else {
          setStatus('unauthorized');
          logout();
          openAdminLoginModal('Your session has expired, please log in again.');
        }
      } catch {
        if (!isMounted) return;
        setStatus('unauthorized');
        logout();
        openAdminLoginModal('Your session has expired, please log in again.');
      }
    }

    verifyAdminSession();

    return () => {
      isMounted = false;
    };
  }, [token, isStationAdmin, logout, openAdminLoginModal]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0F172A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-[#667085] dark:text-slate-400 font-sans">
          <RefreshCw className="w-6 h-6 animate-spin text-[#17324D] dark:text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Verifying Station Admin Session...
          </span>
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return <Navigate to="/" replace />;
  }

  return children;
}

