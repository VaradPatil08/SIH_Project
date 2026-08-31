import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Phone, KeyRound, User, ArrowRight, RefreshCw, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requestOTP, verifyOTP, getUserProfile } from '../services/api';

export default function AuthModal() {
  const { isLoginModalOpen, closeLoginModal, login } = useAuth();

  const [step, setStep] = useState(1); // 1: phone input, 2: otp code input
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isLoginModalOpen) return null;

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanedPhone = phoneNumber.trim();
    if (cleanedPhone.length < 10) {
      setError('Please enter a valid phone number with country code (e.g. +919876543210).');
      return;
    }

    try {
      setLoading(true);
      const res = await requestOTP(cleanedPhone);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        setOtpCode(res.dev_otp);
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to request OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanedCode = otpCode.trim();
    if (cleanedCode.length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOTP(phoneNumber.trim(), cleanedCode, displayName.trim() || null);
      
      let profile = { id: res.user_id, phone_number: phoneNumber.trim(), name: displayName.trim() || null };
      try {
        const fetchedProfile = await getUserProfile(res.access_token);
        if (fetchedProfile) profile = fetchedProfile;
      } catch {
        // Fallback to basic profile
      }

      login(res.access_token, profile);
      setSuccessMsg('Authentication successful. Welcome back!');
      
      setTimeout(() => {
        closeLoginModal();
        setStep(1);
        setOtpCode('');
        setDevOtp(null);
        setSuccessMsg(null);
      }, 700);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    closeLoginModal();
    setStep(1);
    setOtpCode('');
    setDevOtp(null);
    setError(null);
    setSuccessMsg(null);
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
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-navy dark:text-blue-400 tracking-tight">
                  User Login & Preferences
                </h2>
                <p className="text-xs text-muted dark:text-slate-400">
                  Sign in to access your saved trains and custom alerts
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
                <div className="font-semibold">Validation Error</div>
                <div className="text-red-700 dark:text-red-400">{error}</div>
              </div>
            </motion.div>
          )}

          {/* Step 1: Phone Number Input */}
          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground dark:text-slate-200">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted dark:text-slate-400 pointer-events-none">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500 focus:border-navy dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono tracking-wide"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted dark:text-slate-400 leading-normal">
                  Enter your mobile number with country code. Used for login & saved train preferences.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-navy dark:bg-blue-600 hover:bg-navy-light dark:hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs active:scale-98"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: 6-Digit OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              
              {devOtp && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-navy dark:text-blue-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-navy dark:text-blue-300">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    <span>Demo OTP</span>
                  </div>
                  <p className="text-muted dark:text-slate-400 text-[11px]">
                    Your OTP is <strong className="text-navy dark:text-blue-200 font-mono font-bold tracking-wider text-sm">{devOtp}</strong>
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-foreground dark:text-slate-200">
                    Enter 6-Digit OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); }}
                    className="text-xs text-navy dark:text-blue-400 hover:text-navy-light dark:hover:text-blue-300 font-semibold hover:underline"
                  >
                    Change Number
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted dark:text-slate-400 pointer-events-none">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="000000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground dark:text-slate-100 text-center font-mono font-bold text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500 focus:border-navy dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Optional Display Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground dark:text-slate-200">
                  Your Name (Optional)
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted dark:text-slate-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500 focus:border-navy dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-lg border border-border dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground dark:text-slate-200 font-semibold text-xs transition-colors active:scale-98"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-navy dark:bg-blue-600 hover:bg-navy-light dark:hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs active:scale-98"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify OTP & Sign In</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* Footer Transparency Info */}
          <div className="pt-2 border-t border-border dark:border-slate-800 flex items-center justify-between text-[11px] text-muted dark:text-slate-400">
            <span>Secure Login</span>
            <span>Indian Railways Train Enquiry</span>
          </div>

        </motion.div>

      </div>
    </AnimatePresence>
  );
}