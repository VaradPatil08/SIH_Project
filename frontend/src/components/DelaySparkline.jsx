import React from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * Visualizes station-by-station delay accumulation and corridor buffer recovery.
 */
export default function DelaySparkline({ stations = [] }) {
  const { t, theme } = useSettings();
  const isDark = theme === 'dark';

  if (!stations || stations.length < 2) return null;

  const width = 320;
  const height = 48;
  const padding = 6;

  const delays = stations.map(s => s.predicted_delay_min || 0);
  const maxDelay = Math.max(15, ...delays);
  const minDelay = 0;

  const points = delays.map((d, i) => {
    const x = padding + (i / (delays.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d - minDelay) / (maxDelay - minDelay || 1)) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  const lastDelay = delays[delays.length - 1] || 0;
  const maxDelayPoint = Math.max(...delays);

  return (
    <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-border dark:border-slate-800 shadow-card space-y-2 transition-colors">
      <div className="flex items-center justify-between text-xs font-sans">
        <div className="flex items-center gap-1.5 text-navy dark:text-blue-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-navy dark:bg-blue-400 inline-block" />
          <span className="tracking-tight">{t('delayPropagationProfile')}</span>
        </div>
        <span className="text-muted dark:text-slate-400 text-[11px]">
          {t('peakDelay')}: <strong className="text-transit-orange dark:text-amber-400">+{maxDelayPoint}m</strong> | {t('finalDelay')}: <strong className="text-foreground dark:text-slate-200">+{lastDelay}m</strong>
        </span>
      </div>

      <div className="relative w-full h-12 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="delayAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDark ? '#3B82F6' : '#17324D'} stopOpacity="0.2" />
              <stop offset="100%" stopColor={isDark ? '#3B82F6' : '#17324D'} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Reference baseline */}
          <line 
            x1={padding} 
            y1={height - padding} 
            x2={width - padding} 
            y2={height - padding} 
            stroke={isDark ? '#334155' : '#D9DEE5'} 
            strokeDasharray="3,3" 
          />

          {/* Shaded Area */}
          <polygon points={areaPoints} fill="url(#delayAreaGradient)" />

          {/* Sparkline Path */}
          <polyline
            fill="none"
            stroke={isDark ? '#60A5FA' : '#17324D'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Station dot nodes */}
          {stations.map((stn, idx) => {
            const x = padding + (idx / (delays.length - 1)) * (width - 2 * padding);
            const y = height - padding - (((stn.predicted_delay_min || 0) - minDelay) / (maxDelay - minDelay || 1)) * (height - 2 * padding);
            const isLate = (stn.predicted_delay_min || 0) > 2;

            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="3"
                className={`transition-all ${isLate ? 'fill-transit-orange stroke-white dark:stroke-slate-900' : 'fill-transit-green stroke-white dark:stroke-slate-900'}`}
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-muted dark:text-slate-400 font-medium">
        <span>{stations[0]?.code || 'Origin'} ({stations[0]?.name?.split(' ')[0]})</span>
        <span className="text-muted/80 dark:text-slate-500">Route Progress</span>
        <span>{stations[stations.length - 1]?.code || 'Destination'} ({stations[stations.length - 1]?.name?.split(' ')[0]})</span>
      </div>
    </div>
  );
}


