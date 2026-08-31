import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertCircle, Check, Circle, Train as TrainIcon } from 'lucide-react';
import { formatOffsetToTime } from '../utils/time';
import { getStationDelayReasons } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { getTrainColor } from '../utils/trainColors';

/**
 * Modern Indian Railways Station Timeline with Multi-Train Tabs
 */
export default function StationTimeline({ 
  stations = [], 
  trainNumber = '', 
  baseTime = '06:00',
  currentPosition = null,
  onSelectStation = null,
  // Multi-train support props:
  trains = [],
  focusedTrainNumber = null,
  onFocusTrain = null
}) {
  const { theme, t } = useSettings();
  const isDark = theme === 'dark';

  const [expandedStation, setExpandedStation] = useState(null);
  const [delayReasons, setDelayReasons] = useState({});
  const [loadingReasons, setLoadingReasons] = useState({});

  // Normalize trains input: support both unified trains array and single-train legacy props
  const normalizedTrains = useMemo(() => {
    if (Array.isArray(trains) && trains.length > 0) {
      return trains.map((t, idx) => ({
        ...t,
        color: t.color || getTrainColor(idx, isDark),
        isFocused: focusedTrainNumber ? t.trainNumber === focusedTrainNumber : idx === 0
      }));
    }
    return [{
      trainNumber: trainNumber || 'TRAIN',
      trainName: '',
      stations: stations || [],
      scheduled_departure: baseTime,
      currentPosition: currentPosition || null,
      color: getTrainColor(0, isDark),
      isFocused: true
    }];
  }, [trains, trainNumber, stations, baseTime, currentPosition, focusedTrainNumber, isDark]);

  // Selected active train for timeline display
  const activeTrain = useMemo(() => {
    return normalizedTrains.find(t => t.isFocused) || normalizedTrains[0];
  }, [normalizedTrains]);

  const activeStations = activeTrain?.stations || [];
  const activeTrainNumber = activeTrain?.trainNumber || '';
  const activeBaseTime = activeTrain?.scheduled_departure || baseTime || '06:00';
  const activeColor = activeTrain?.color?.currentHex || (isDark ? '#3B82F6' : '#17324D');

  const toggleStation = async (stationCode, isDelayed) => {
    if (!isDelayed) return;

    const cacheKey = `${activeTrainNumber}-${stationCode}`;

    if (expandedStation === stationCode) {
      setExpandedStation(null);
      return;
    }

    setExpandedStation(stationCode);

    if (!delayReasons[cacheKey] && !loadingReasons[cacheKey]) {
      setLoadingReasons((prev) => ({ ...prev, [cacheKey]: true }));
      try {
        const reasons = await getStationDelayReasons(activeTrainNumber, stationCode);
        const normalized = Array.isArray(reasons) ? reasons : (reasons?.reasons || []);
        setDelayReasons((prev) => ({ ...prev, [cacheKey]: normalized }));
      } catch (err) {
        console.error(`Error loading delay reasons for ${stationCode}:`, err);
        setDelayReasons((prev) => ({
          ...prev,
          [cacheKey]: [
            {
              category: 'TRACK_OCCUPANCY',
              reason: 'Waiting for signal clearance ahead of station.',
              impact_min: 8,
              confidence: 0.85
            }
          ]
        }));
      } finally {
        setLoadingReasons((prev) => ({ ...prev, [cacheKey]: false }));
      }
    }
  };

  return (
    <div className="rounded-lg border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-4 sm:p-5 font-sans text-foreground dark:text-slate-100 transition-colors">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span 
            className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs" 
            style={{ backgroundColor: activeColor }}
          />
          <span className="font-bold text-sm sm:text-base text-navy dark:text-blue-400">
            {t('timelineTitle')}
          </span>
          {normalizedTrains.length > 1 && (
            <span className="font-mono font-bold text-xs" style={{ color: activeColor }}>
              (#{activeTrainNumber})
            </span>
          )}
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-muted dark:text-slate-300 border border-border dark:border-slate-700">
          {activeStations.length} {t('halt')}
        </span>
      </div>

      {/* Multi-Train Horizontal Scrollable Tab Strip (Shown when tracking 2+ trains) */}
      {normalizedTrains.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 border-b border-border dark:border-slate-800 no-scrollbar">
          {normalizedTrains.map((tItem) => {
            const isSelected = tItem.trainNumber === activeTrainNumber;
            const colorHex = tItem.color.currentHex;
            return (
              <button
                key={tItem.trainNumber}
                type="button"
                onClick={() => onFocusTrain && onFocusTrain(tItem.trainNumber)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 text-foreground dark:text-slate-100 shadow-2xs border border-border dark:border-slate-700'
                    : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
                style={isSelected ? { borderBottom: `2.5px solid ${colorHex}` } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: colorHex }}
                />
                <span className="font-mono font-bold">#{tItem.trainNumber}</span>
                <span className="text-[11px] font-normal truncate max-w-[100px] hidden sm:inline opacity-80">
                  {tItem.trainName}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline with connecting vertical railway line */}
      <div className="relative pl-7 space-y-1">
        
        {/* Continuous vertical track line */}
        <div className="absolute left-[13px] top-3 bottom-4 w-[2px] bg-slate-200 dark:bg-slate-800 pointer-events-none" />

        {activeStations.map((station, idx) => {
          const isReached = station.status === 'reached';
          const delayMin = station.predicted_delay_min || 0;
          const isDelayed = delayMin > 2;
          const isCritical = delayMin > 20;
          const isExpanded = expandedStation === station.code;
          const isNext = !isReached && (idx === 0 || activeStations[idx - 1]?.status === 'reached');

          const schedTime = formatOffsetToTime(station.scheduled_offset_min, activeBaseTime);
          const predTime = formatOffsetToTime(
            (station.scheduled_offset_min || 0) + (station.predicted_delay_min || 0),
            activeBaseTime
          );

          // Status badges & node styling
          let statusBadge = (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-transit-green-light dark:bg-emerald-950/60 text-transit-green dark:text-emerald-400 border border-transit-green-border dark:border-emerald-800">
              {t('onTime')}
            </span>
          );
          let nodeIcon = (
            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
              <Circle className="w-2.5 h-2.5 fill-slate-300 dark:fill-slate-600" />
            </div>
          );

          if (isReached) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-muted dark:text-slate-400 border border-border dark:border-slate-700">
                {t('departed')}
              </span>
            );
            nodeIcon = (
              <div className="w-6 h-6 rounded-full bg-transit-green text-white flex items-center justify-center shadow-sm">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            );
          } else if (isCritical) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-transit-red-light dark:bg-red-950/60 text-transit-red dark:text-red-400 border border-transit-red-border dark:border-red-800">
                {t('minLate', { min: delayMin })}
              </span>
            );
            nodeIcon = (
              <div className="w-6 h-6 rounded-full bg-transit-red text-white flex items-center justify-center shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
            );
          } else if (isDelayed) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-transit-orange-light dark:bg-amber-950/60 text-transit-orange dark:text-amber-400 border border-transit-orange-border dark:border-amber-800">
                {t('minLate', { min: delayMin })}
              </span>
            );
            nodeIcon = (
              <div className="w-6 h-6 rounded-full bg-transit-orange text-white flex items-center justify-center shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
            );
          } else if (isNext) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-navy-subtle dark:bg-blue-950/60 text-navy dark:text-blue-300 border border-navy-border dark:border-blue-800 font-bold shadow-2xs">
                {t('nextStation')}
              </span>
            );
            nodeIcon = (
              <div className="relative w-6 h-6 rounded-full text-white flex items-center justify-center shadow-sm" style={{ backgroundColor: activeColor }}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-25" style={{ backgroundColor: activeColor }} />
                <span className="relative w-2 h-2 rounded-full bg-white shadow-xs" />
              </div>
            );
          }

          const cacheKey = `${activeTrainNumber}-${station.code}`;
          const rawReasons = delayReasons[cacheKey];
          const reasonsList = Array.isArray(rawReasons) ? rawReasons : (rawReasons?.reasons || []);

          return (
            <motion.div
              key={`${activeTrainNumber}-${station.code || idx}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2), ease: [0.16, 1, 0.3, 1] }}
              className={`relative py-3 px-2 rounded-lg transition-all duration-200 border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                isNext ? 'bg-slate-50/90 dark:bg-slate-800/60 shadow-2xs' : isExpanded ? 'bg-slate-50 dark:bg-slate-800/80 shadow-xs' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Timeline Node Icon */}
              <div className="absolute -left-[27px] top-3.5">
                {nodeIcon}
              </div>

              {/* Station Row Details */}
              <div 
                onClick={() => toggleStation(station.code, isDelayed)}
                className={`flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3 ${
                  isDelayed ? 'cursor-pointer' : ''
                }`}
              >
                {/* Left: Station Code, Platform & Name */}
                <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-bold text-navy dark:text-blue-400 text-sm">
                      {station.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-muted dark:text-slate-300 font-mono font-bold text-[10px]">
                      {station.code}
                    </span>
                    {statusBadge}
                    {station.platform && (
                      <span className="text-[10px] text-muted dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-border dark:border-slate-700">
                        {t('platform')} {station.platform}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted dark:text-slate-400">
                    {station.distance_km !== undefined && (
                      <span>{station.distance_km} {t('km')}</span>
                    )}
                  </div>
                </div>

                {/* Right: Timetable vs Predicted ETA */}
                <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0">
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="text-muted dark:text-slate-400 text-[11px]">
                      {t('schedHalt')}: <span className="line-through">{schedTime}</span>
                    </span>
                    <span className={`font-bold text-sm ${isCritical ? 'text-transit-red dark:text-red-400' : isDelayed ? 'text-transit-orange dark:text-amber-400' : isReached ? 'text-muted dark:text-slate-400' : 'text-navy dark:text-blue-400'}`}>
                      {predTime}
                    </span>
                  </div>
                  {isDelayed && (
                    <div className="text-[11px] font-semibold text-transit-orange dark:text-amber-400 flex items-center justify-end gap-0.5 mt-0.5">
                      <span>{t('rootCauseAttribution')}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Delay Breakdown Diagnostic Card */}
              <AnimatePresence>
                {isExpanded && isDelayed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mt-3 relative overflow-hidden"
                  >
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-border dark:border-slate-700 text-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-navy dark:text-blue-400 font-bold">
                          <AlertCircle className="w-4 h-4 text-transit-orange dark:text-amber-400" />
                          <span>{t('rootCauseAttribution')} ({station.code}) — Train #{activeTrainNumber}</span>
                        </div>
                      </div>

                      {loadingReasons[cacheKey] ? (
                        <div className="py-2 text-muted dark:text-slate-400 flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full border border-navy dark:border-blue-400 border-t-transparent animate-spin" />
                          <span>Fetching delay reasons...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reasonsList.map((reason, rIdx) => {
                            const reasonText = typeof reason === 'string' ? reason : (reason.reason || 'Speed caution');
                            const rawCat = typeof reason === 'object' ? (reason.category || 'TRACK_OCCUPANCY') : 'TRACK_OCCUPANCY';
                            const categoryNames = {
                              'TRACK_OCCUPANCY': 'Track Congestion',
                              'PLATFORM_HOLD': 'Waiting for Platform',
                              'INTERLOCKING_HOLD': 'Signal Clearance',
                              'SPEED_RESTRICTION': 'Track Work Caution',
                              'WEATHER_CAUTION': 'Weather Caution'
                            };
                            const reasonCategory = categoryNames[rawCat] || rawCat.replace(/_/g, ' ');
                            const reasonImpact = typeof reason === 'object' ? (reason.impact_min || station.predicted_delay_min) : station.predicted_delay_min;
                            const reasonConf = typeof reason === 'object' ? reason.confidence : null;

                            return (
                              <div key={rIdx} className="p-2.5 rounded bg-white dark:bg-slate-900 border border-border dark:border-slate-700 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-navy dark:text-blue-300">
                                    {reasonCategory}
                                  </span>
                                  <span className="text-transit-orange dark:text-amber-400 font-bold">
                                    +{reasonImpact} min
                                  </span>
                                </div>
                                <p className="text-muted dark:text-slate-300 text-xs leading-normal">
                                  {reasonText}
                                </p>
                                {reasonConf && (
                                  <div className="flex items-center gap-2 pt-1 text-[10px] text-muted dark:text-slate-400">
                                    <span>{t('modelConfidence')}</span>
                                    <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                      <div 
                                        className="h-full bg-navy dark:bg-blue-500 rounded-full" 
                                        style={{ width: `${Math.round(reasonConf * 100)}%` }}
                                      />
                                    </div>
                                    <span className="font-semibold text-foreground dark:text-slate-200">{Math.round(reasonConf * 100)}%</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
