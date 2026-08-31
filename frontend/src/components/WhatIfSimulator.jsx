import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sliders, 
  CloudFog, 
  Train, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { 
  getSimulationOverrides, 
  setSimulationOverride, 
  resetSimulationOverrides 
} from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function WhatIfSimulator({ onSimulationChange }) {
  const { t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [fog, setFog] = useState(0);
  const [freight, setFreight] = useState(false);
  const [tsr, setTsr] = useState(false);
  const [platform, setPlatform] = useState(false);

  useEffect(() => {
    const current = getSimulationOverrides();
    setFog(current.fogSeverity || 0);
    setFreight(Boolean(current.freightPrecedence));
    setTsr(Boolean(current.tsrSpeedLimit));
    setPlatform(Boolean(current.platformHold));
  }, []);

  const totalInjected = fog + (freight ? 12 : 0) + (tsr ? 8 : 0) + (platform ? 6 : 0);
  const isActive = totalInjected > 0;

  const handleApply = () => {
    setSimulationOverride('fogSeverity', fog);
    setSimulationOverride('freightPrecedence', freight);
    setSimulationOverride('tsrSpeedLimit', tsr);
    setSimulationOverride('platformHold', platform);
    if (onSimulationChange) onSimulationChange();
  };

  const handleReset = () => {
    resetSimulationOverrides();
    setFog(0);
    setFreight(false);
    setTsr(false);
    setPlatform(false);
    if (onSimulationChange) onSimulationChange();
  };

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 border border-border dark:border-slate-800 shadow-card overflow-hidden transition-colors">
      
      {/* Header Bar Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-surface-hover dark:hover:bg-slate-800/60 transition-colors group"
      >
        <div className="flex items-center gap-3 font-sans text-xs">
          <div className={`p-2 rounded ${isActive ? 'bg-transit-orange-light dark:bg-amber-950/80 text-transit-orange dark:text-amber-400' : 'bg-navy-subtle dark:bg-blue-950/60 text-navy dark:text-blue-400'}`}>
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-foreground dark:text-slate-100 flex items-center gap-2 text-sm">
              <span>{t('whatIfTitle')}</span>
              {isActive && (
                <span className="px-2 py-0.5 rounded text-[11px] bg-transit-orange-light dark:bg-amber-950 text-transit-orange dark:text-amber-400 border border-transit-orange-border dark:border-amber-800 font-semibold">
                  {t('injectedDelayActive', { min: totalInjected })}
                </span>
              )}
            </div>
            <p className="text-xs text-muted dark:text-slate-400 font-normal">
              {t('whatIfSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted dark:text-slate-400 group-hover:text-navy dark:group-hover:text-white">
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline-block">
            {isOpen ? t('closeControls') : t('simulateScenarios')}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expandable Controls Sandbox */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-border dark:border-slate-800 p-4 sm:p-5 space-y-4 font-sans text-xs bg-slate-50/70 dark:bg-slate-900/50"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border dark:border-slate-800 text-xs text-muted dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-navy dark:text-blue-400 font-semibold">
                <Activity className="w-3.5 h-3.5 text-navy dark:text-blue-400" />
                <span>Test Journey Scenarios</span>
              </span>
              <span className="text-muted dark:text-slate-400 text-[11px]">Interactive Simulator</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* 1. Fog / Weather slider */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-slate-800/70 border border-border dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <CloudFog className="w-4 h-4 text-navy dark:text-blue-400" />
                    <span>{t('denseFog')}</span>
                  </label>
                  <span className="font-bold text-transit-orange dark:text-amber-400 text-xs">
                    {fog > 0 ? `+${fog} min` : 'Nominal (0m)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={fog}
                  onChange={(e) => { setFog(Number(e.target.value)); }}
                  className="w-full accent-navy bg-slate-200 dark:bg-slate-700 h-2 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted dark:text-slate-400">
                  <span>0m (Clear Weather)</span>
                  <span>15m (Caution Zone)</span>
                  <span>30m (Severe Fog)</span>
                </div>
              </div>

              {/* 2. Freight Precedence Toggle */}
              <div 
                onClick={() => setFreight(!freight)}
                className={`p-3.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-between active:scale-98 ${
                  freight 
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-transit-orange-border dark:border-amber-800 shadow-xs' 
                    : 'bg-white dark:bg-slate-800/70 border-border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <Train className="w-4 h-4 text-navy dark:text-blue-400" />
                    <span>{t('freightPrecedence')}</span>
                  </div>
                  <p className="text-[11px] text-muted dark:text-slate-400">{t('freightPrecedenceDesc')}</p>
                </div>
                <div className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${freight ? 'bg-transit-orange' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${freight ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 3. TSR Track Work Toggle */}
              <div 
                onClick={() => setTsr(!tsr)}
                className={`p-3.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-between active:scale-98 ${
                  tsr 
                    ? 'bg-red-50 dark:bg-red-950/40 border-transit-red-border dark:border-red-800 shadow-xs' 
                    : 'bg-white dark:bg-slate-800/70 border-border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-railway-red dark:text-red-400" />
                    <span>{t('tsrSpeedLimit')}</span>
                  </div>
                  <p className="text-[11px] text-muted dark:text-slate-400">{t('tsrSpeedLimitDesc')}</p>
                </div>
                <div className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${tsr ? 'bg-railway-red' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${tsr ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* 4. Platform Hold Toggle */}
              <div 
                onClick={() => setPlatform(!platform)}
                className={`p-3.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-between active:scale-98 ${
                  platform 
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-navy-border dark:border-blue-800 shadow-xs' 
                    : 'bg-white dark:bg-slate-800/70 border-border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <Clock className="w-4 h-4 text-navy dark:text-blue-400" />
                    <span>{t('platformCongestion')}</span>
                  </div>
                  <p className="text-[11px] text-muted dark:text-slate-400">{t('platformCongestionDesc')}</p>
                </div>
                <div className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${platform ? 'bg-navy dark:bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${platform ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border dark:border-slate-800">
              <div className="text-xs text-muted dark:text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-navy dark:text-blue-400 shrink-0" />
                <span>Total Estimated Delay: <strong className="text-navy dark:text-blue-400 font-bold">+{totalInjected} mins</strong></span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-muted dark:text-slate-300 hover:text-navy dark:hover:text-white border border-border dark:border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('resetAll')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-lg bg-navy dark:bg-blue-600 hover:bg-navy-light dark:hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <span>{t('applySimulation')}</span>
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


