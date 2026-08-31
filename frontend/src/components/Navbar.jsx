import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Train, 
  Settings as SettingsIcon, 
  LayoutGrid, 
  LogIn, 
  User, 
  ShieldCheck, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const loginDropdownRef = useRef(null);

  const { openSettings, t } = useSettings();
  const { 
    user, 
    isAuthenticated, 
    isStationAdmin, 
    logout, 
    openLoginModal, 
    openAdminLoginModal 
  } = useAuth();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target)) {
        setLoginDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: t('liveTrains'), path: '/' },
    { label: t('trackTrain'), path: '/train/12951' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-border dark:border-slate-800 shadow-nav transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Wordmark & Official Emblem */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-navy rounded-lg p-1 shrink-0 active:scale-98 transition-transform"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded bg-navy dark:bg-blue-600 text-white shadow-sm group-hover:bg-railway-red transition-all duration-200 group-hover:scale-105">
              <Train className="w-5 h-5 transition-transform duration-200" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-navy dark:text-blue-400 group-hover:text-railway-red transition-colors">
                  {t('brandTitle')}
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.2 rounded bg-railway-light text-railway-red border border-railway-border text-[10px]">
                  {t('brandBadge')}
                </span>
              </div>
              <span className="text-[11px] text-muted dark:text-slate-400 font-medium tracking-normal">
                {t('brandTagline')}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links - Centered across available space */}
          <nav className="hidden md:flex flex-1 items-center justify-center space-x-2 font-sans">
            {navItems.map((item) => {
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-md text-sm font-semibold tracking-normal transition-all duration-200 ${
                    isActive 
                      ? 'text-navy dark:text-blue-300 bg-navy-subtle dark:bg-blue-950/60 font-bold border-b-2 border-navy dark:border-blue-400 shadow-xs' 
                      : 'text-muted dark:text-slate-400 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium active:scale-95'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Station Admin link — ONLY rendered when authenticated as station_admin */}
            {isStationAdmin && (
              <>
                <span className="text-border dark:text-slate-700 select-none px-1">|</span>
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 ${
                    location.pathname.startsWith('/admin')
                      ? 'text-navy dark:text-blue-300 bg-navy-subtle dark:bg-blue-950/60 font-bold'
                      : 'text-muted dark:text-slate-500 hover:text-navy dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Station Admin — Arrivals Board"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Station Admin</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Section: Live Network Badge, Login / Role Chip, Settings Button */}
          <div className="hidden md:flex items-center gap-3 text-xs font-sans shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-transit-green-light dark:bg-emerald-950/60 border border-transit-green-border dark:border-emerald-800 text-transit-green dark:text-emerald-400 font-medium shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-transit-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-transit-green"></span>
              </span>
              <span className="text-[11px] font-semibold">{t('liveNetwork')}</span>
            </div>

            {/* Authentication Action / User State */}
            {!isAuthenticated ? (
              <div className="relative" ref={loginDropdownRef}>
                <button
                  onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                  className="group flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-md border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-muted dark:text-slate-300 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 text-xs font-semibold shadow-2xs active:scale-95"
                  aria-expanded={loginDropdownOpen}
                  aria-haspopup="true"
                >
                  <LogIn className="w-4 h-4 text-navy dark:text-blue-400" />
                  <span>Login</span>
                  <ChevronDown className={`w-3 h-3 text-muted transition-transform duration-200 ${loginDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Login Options Dropdown Popover */}
                <AnimatePresence>
                  {loginDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-lg border border-border dark:border-slate-700 shadow-dropdown p-1.5 z-50 space-y-1 font-sans"
                    >
                      <button
                        onClick={() => {
                          setLoginDropdownOpen(false);
                          openLoginModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground dark:text-slate-200 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-left"
                      >
                        <User className="w-4 h-4 text-navy dark:text-blue-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-navy dark:text-blue-300">Passenger Login</div>
                          <div className="text-[10px] text-muted dark:text-slate-400">Phone & OTP sign in</div>
                        </div>
                      </button>

                      <div className="border-t border-border dark:border-slate-800 my-1" />

                      <button
                        onClick={() => {
                          setLoginDropdownOpen(false);
                          openAdminLoginModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground dark:text-slate-200 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-left"
                      >
                        <ShieldCheck className="w-4 h-4 text-navy dark:text-blue-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-navy dark:text-blue-300">Station Admin Login</div>
                          <div className="text-[10px] text-muted dark:text-slate-400">Employee ID & Password</div>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Authenticated User Status Chip + Logout */
              <div className="flex items-center gap-2">
                {isStationAdmin ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-md bg-navy dark:bg-blue-600 text-white text-xs font-semibold shadow-xs border border-navy-light dark:border-blue-500">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-blue-300" />
                    <span className="truncate max-w-[130px]" title={user?.name || 'Station Admin'}>
                      {user?.name || 'Station Admin'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-md bg-slate-50 dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 text-xs font-medium shadow-2xs">
                    <User className="w-4 h-4 text-navy dark:text-blue-400 shrink-0" />
                    <span className="truncate max-w-[120px]" title={user?.name || user?.phone_number || 'Passenger'}>
                      {user?.name || user?.phone_number || 'Passenger'}
                    </span>
                  </div>
                )}

                <button
                  onClick={logout}
                  className="flex items-center justify-center w-10 h-10 rounded-md border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-muted hover:text-railway-red dark:hover:text-red-400 transition-colors shadow-2xs active:scale-95"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Settings Trigger Button */}
            <button
              onClick={openSettings}
              className="group flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-md border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-muted dark:text-slate-300 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 text-xs font-semibold shadow-2xs active:scale-95"
              title={t('settings')}
              aria-label={t('settings')}
            >
              <SettingsIcon className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
              <span>{t('settings')}</span>
            </button>
          </div>

          {/* Mobile Actions (Settings + Hamburger) with Accessible 44x44px Tap Targets */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={openSettings}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-navy dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-border dark:border-slate-700 active:scale-95 transition-transform"
              aria-label={t('settings')}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-navy dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-border dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-navy active:scale-95 transition-transform"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Overlay with Accessible Touch Targets */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="border-b border-border dark:border-slate-800 bg-white dark:bg-slate-900 md:hidden px-4 py-4 space-y-3 font-sans shadow-dropdown"
          >
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                      isActive 
                        ? 'bg-navy dark:bg-blue-600 text-white shadow-xs' 
                        : 'text-foreground dark:text-slate-200 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Station Admin link in mobile drawer — ONLY when isStationAdmin === true */}
              {isStationAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-navy dark:bg-blue-600 text-white font-bold'
                      : 'text-muted dark:text-slate-400 hover:text-navy dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Station Admin
                </Link>
              )}
            </nav>

            {/* Mobile Auth Controls */}
            {!isAuthenticated ? (
              <div className="pt-2 border-t border-border dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider px-1">
                  Account Access
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openLoginModal();
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-foreground dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  >
                    <User className="w-3.5 h-3.5 text-navy dark:text-blue-400" />
                    <span>Passenger</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAdminLoginModal();
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-navy dark:bg-blue-600 text-white text-xs font-semibold hover:bg-navy-light active:scale-95 transition-all shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Station Admin</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-border dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isStationAdmin ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy dark:bg-blue-600 text-white text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Station Admin</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-foreground dark:text-slate-200 text-xs font-medium border border-border dark:border-slate-700">
                      <User className="w-3.5 h-3.5 text-navy dark:text-blue-400" />
                      <span>{user?.name || user?.phone_number || 'Logged In'}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-railway-red dark:text-red-400 text-xs font-semibold active:scale-95 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-border dark:border-slate-800 flex items-center justify-between text-xs text-muted dark:text-slate-400">
              <div className="flex items-center gap-2 text-transit-green font-medium py-1">
                <span className="w-2.5 h-2.5 rounded-full bg-transit-green inline-block animate-pulse" />
                <span>{t('irSatOperational')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}





