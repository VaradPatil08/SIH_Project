import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Train } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function Footer() {
  const { t } = useSettings();
  const { pathname } = useLocation();

  // Hide footer on track-train page
  if (pathname.startsWith('/train')) {
    return null;
  }

  // True when the current path is the admin page
  const isAdminPage = pathname === '/admin';

  return (
    <footer className="mt-auto border-t border-border dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-sans text-muted dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-navy dark:bg-blue-600 text-white">
              <Train className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-navy dark:text-blue-400">
                {t('brandTitle')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-medium">
            <Link to="/" className="min-h-[40px] flex items-center text-muted hover:text-navy transition-colors">
              {t('liveTrains')}
            </Link>
            {!isTrackingPage && (
              <Link to="/train/12951" className="min-h-[40px] flex items-center text-muted hover:text-navy transition-colors">
                {t('trackTrain')}
              </Link>
            )}
            {!isAdminPage && (
              <Link to="/admin" className="min-h-[40px] flex items-center text-muted hover:text-navy transition-colors">
                Station Admin
              </Link>
            )}
          </div>

        </div>
      </div>
    </footer>
  );
}





