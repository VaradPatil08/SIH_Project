import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, User, Lock, ArrowRight, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminLogin, getUserProfile } from '../services/api';

export default function AdminLoginModal() {
  const { 
    isAdminLoginModalOpen, 
    closeAdminLoginModal, 
    loginAsAdmin,
    adminLoginInitialError 
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  React.useEffect(() => {
    if (isAdminLoginModalOpen && adminLoginInitialError) {
      setError(adminLoginInitialError);
    }
  }, [isAdminLoginModalOpen, adminLoginInitialError]);

  if (!isAdminLoginModalOpen) return null;

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please enter your station admin username or employee ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const res = await adminLogin(cleanUsername, password);

      let profile = { id: res.user_id, phone_number: cleanUsername, name: cleanUsername, role: 'station_admin' };
      try {
        const fetchedProfile = await getUserProfile(res.access_token);
        if (fetchedProfile) profile = fetchedProfile;
      } catch {
        // Fallback to basic profile
      }

      loginAsAdmin(res.access_token, profile);
      setSuccessMsg(`Welcome, ${profile.name || cleanUsername}! Station admin authorized.`);

      setTimeout(() => {
        closeAdminLoginModal();
        setUsername('');
        setPassword('');
        setError(null);
        setSuccessMsg(null);
      }, 700);
    } catch (err) {
      setError(err.message || 'Invalid username or password. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeAdminLoginModal();
    setUsername('');
    setPassword('');
    setError(null);
    setSuccessMsg(null);
  };

  const fillDemoCredentials = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        
        {/* Soft Dim Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-2xl p-6 z-10 font-sans text-foreground dark:text-slate-100 space-y-5"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-border dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-navy dark:bg-blue-600 text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-navy dark:text-blue-400 tracking-tight">
                  Station Admin Login
                </h2>
                <p className="text-xs text-muted dark:text-slate-400">
                  Official Station Controller & Master Access
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-muted hover:text-navy dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 rounded-lg text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-800 dark:text-red-300 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <div className="font-semibold">Authentication Failed</div>
                <div className="text-red-700 dark:text-red-400">{error}</div>
              </div>
            </motion.div>
          )}

          {/* Demo Credentials Quick Fill Chip (For Hackathon Evaluation) */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-navy dark:text-blue-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-1.5 text-navy dark:text-blue-300 text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Demo Admin Accounts</span>
              </div>
              <span className="text-[10px] text-muted dark:text-slate-400">Click to auto-fill</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin_ndls', 'railpulse@admin2026')}
                className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-300 dark:border-blue-700 rounded text-[11px] font-mono font-semibold text-navy dark:text-blue-200 transition-colors shadow-2xs"
              >
                admin_ndls
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('station_admin', 'adminpassword123')}
                className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-300 dark:border-blue-700 rounded text-[11px] font-mono font-semibold text-navy dark:text-blue-200 transition-colors shadow-2xs"
              >
                station_admin
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            
            {/* Username / Employee ID Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground dark:text-slate-200">
                Employee ID / Admin Username
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted dark:text-slate-400 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin_ndls"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500 focus:border-navy dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground dark:text-slate-200">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted dark:text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500 focus:border-navy dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-navy dark:bg-blue-600 hover:bg-navy-light dark:hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs active:scale-98"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sign In as Station Admin</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="pt-2 border-t border-border dark:border-slate-800 flex items-center justify-between text-[11px] text-muted dark:text-slate-400">
            <span>Secure Admin Gateway</span>
            <span>Indian Railways Control</span>
          </div>

        </motion.div>

      </div>
    </AnimatePresence>
  );
}

