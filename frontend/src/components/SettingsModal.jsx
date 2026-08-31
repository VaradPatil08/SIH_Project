import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sun, 
  Moon, 
  Languages, 
  Globe,
  Check, 
  Settings as SettingsIcon
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function SettingsModal() {
  const { 
    isSettingsOpen, 
    closeSettings, 
    theme, 
    setTheme, 
    language, 
    setLanguage, 
    t 
  } = useSettings();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        closeSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSettings}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-border dark:border-slate-800 shadow-2xl overflow-hidden z-10 text-foreground dark:text-slate-100 font-sans"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
          >
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy dark:bg-blue-600 text-white">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="settings-modal-title" className="font-bold text-sm text-navy dark:text-blue-400">
                    {t('settingsTitle')}
                  </h2>
                  <p className="text-[11px] text-muted dark:text-slate-400">
                    {t('settingsSubtitle')}
                  </p>
                </div>
              </div>

              <button
                onClick={closeSettings}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-muted hover:text-navy dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95"
                aria-label={t('close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto">
              
              {/* Appearance / Theme Section */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-xs text-foreground dark:text-slate-200 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-navy dark:text-blue-400" />
                    <span>{t('appearance')}</span>
                  </h3>
                  <p className="text-[11px] text-muted dark:text-slate-400">{t('appearanceDesc')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Light Theme Card */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-3 sm:p-3.5 min-h-[44px] rounded-lg border text-left flex flex-col justify-between transition-all active:scale-98 ${
                      theme === 'light'
                        ? 'border-navy dark:border-blue-500 bg-blue-50/60 dark:bg-slate-800 ring-2 ring-navy/20 dark:ring-blue-500/20 shadow-xs'
                        : 'border-border dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-navy dark:text-blue-400' : 'text-muted dark:text-slate-400'}`} />
                      {theme === 'light' && <Check className="w-3.5 h-3.5 text-navy dark:text-blue-400 font-bold" />}
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${theme === 'light' ? 'text-navy dark:text-blue-400' : 'text-foreground dark:text-slate-200'}`}>
                        {t('lightMode')}
                      </div>
                      <div className="text-[10px] text-muted dark:text-slate-400">Day Mode</div>
                    </div>
                  </button>

                  {/* Dark Theme Card */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3 sm:p-3.5 min-h-[44px] rounded-lg border text-left flex flex-col justify-between transition-all active:scale-98 ${
                      theme === 'dark'
                        ? 'border-navy dark:border-blue-500 bg-blue-50/60 dark:bg-slate-800 ring-2 ring-navy/20 dark:ring-blue-500/20 shadow-xs'
                        : 'border-border dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-navy dark:text-blue-400' : 'text-muted dark:text-slate-400'}`} />
                      {theme === 'dark' && <Check className="w-3.5 h-3.5 text-navy dark:text-blue-400 font-bold" />}
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${theme === 'dark' ? 'text-navy dark:text-blue-400' : 'text-foreground dark:text-slate-200'}`}>
                        {t('darkMode')}
                      </div>
                      <div className="text-[10px] text-muted dark:text-slate-400">Night Mode</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Language Section */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-xs text-foreground dark:text-slate-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-navy dark:text-blue-400" />
                    <span>{t('language')}</span>
                  </h3>
                  <p className="text-[11px] text-muted dark:text-slate-400">{t('languageDesc')}</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`w-full p-3 min-h-[44px] rounded-lg border text-left flex items-center justify-between transition-all active:scale-98 text-xs font-semibold ${
                      language === 'en'
                        ? 'border-navy dark:border-blue-500 bg-blue-50/60 dark:bg-slate-800 text-navy dark:text-blue-400 ring-2 ring-navy/20 dark:ring-blue-500/20'
                        : 'border-border dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 text-foreground dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-muted dark:text-slate-300 text-[10px] font-mono font-bold">EN</span>
                      <span>{t('english')}</span>
                    </div>
                    {language === 'en' && <Check className="w-4 h-4 text-navy dark:text-blue-400" />}
                  </button>

                  <button
                    onClick={() => setLanguage('hi')}
                    className={`w-full p-3 min-h-[44px] rounded-lg border text-left flex items-center justify-between transition-all active:scale-98 text-xs font-semibold ${
                      language === 'hi'
                        ? 'border-navy dark:border-blue-500 bg-blue-50/60 dark:bg-slate-800 text-navy dark:text-blue-400 ring-2 ring-navy/20 dark:ring-blue-500/20'
                        : 'border-border dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 text-foreground dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-transit-green-light dark:bg-emerald-950 text-transit-green dark:text-emerald-400 text-[10px] font-bold">अ/HI</span>
                      <span>{t('hindi')}</span>
                    </div>
                    {language === 'hi' && <Check className="w-4 h-4 text-navy dark:text-blue-400" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-border dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-900/80">
              <button
                onClick={closeSettings}
                className="px-5 py-2.5 min-h-[40px] rounded-lg bg-navy dark:bg-blue-600 hover:bg-navy-light dark:hover:bg-blue-500 text-white text-xs font-semibold transition-all active:scale-95"
              >
                {t('close')}
              </button>
            </div>

          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
}
