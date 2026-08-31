import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RefreshCw, 
  Map as MapIcon, 
  List, 
  Clock, 
  Train, 
  Gauge, 
  AlertTriangle,
  Radio,
  Plus,
  X,
  Search,
  Loader2,
  Info
} from 'lucide-react';
import { getTrainETA, getDisruptionReportSummary, getTrainsSearch, activateLiveTracking } from '../services/api';
import TrainMap from '../components/TrainMap';
import StationTimeline from '../components/StationTimeline';
import DelaySparkline from '../components/DelaySparkline';
import ReportModal from '../components/ReportModal';
import { TrackingHeaderSkeleton, MapSkeleton, TimelineSkeleton } from '../components/SkeletonLoader';
import AnimatedNumber from '../components/AnimatedNumber';
import { formatDuration } from '../utils/time';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { getTrainColor } from '../utils/trainColors';

const POLL_INTERVAL_SECONDS = 6;
const SOFT_CAP_WARNING_THRESHOLD = 8;

export default function TrackingPage() {
  const { trainNumber: baseTrainNumber } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { theme, t } = useSettings();
  const isDark = theme === 'dark';
  const { isAuthenticated, openLoginModal } = useAuth();

  // Parse tracked train numbers from URL (:trainNumber and ?compare=...)
  const compareParam = searchParams.get('compare') || '';
  const trackedTrainNumbers = useMemo(() => {
    const compareList = compareParam
      ? compareParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const combined = [baseTrainNumber, ...compareList];
    return Array.from(new Set(combined.filter(Boolean)));
  }, [baseTrainNumber, compareParam]);

  // Focused train for single-train scoped panels (metrics cockpit, sparkline, disruption report)
  const [focusedTrainNumber, setFocusedTrainNumber] = useState(baseTrainNumber);

  // Synchronize focused train when tracked numbers change
  useEffect(() => {
    if (!trackedTrainNumbers.includes(focusedTrainNumber)) {
      setFocusedTrainNumber(trackedTrainNumbers[0] || baseTrainNumber);
    }
  }, [trackedTrainNumbers, focusedTrainNumber, baseTrainNumber]);

  // ETA and Telemetry Data State (keyed by trainNumber)
  const [trainsEta, setTrainsEta] = useState({});
  const [reportSummary, setReportSummary] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL_SECONDS);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'map' | 'timeline'
  const [flashHighlight, setFlashHighlight] = useState(false);

  // Advisory soft cap warning dismiss state
  const [dismissedWarning, setDismissedWarning] = useState(false);

  // Add Train Search Autocomplete State
  const [isAddSearchOpen, setIsAddSearchOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSearchResults, setAddSearchResults] = useState([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const addSearchDebounce = useRef(null);
  const addSearchContainerRef = useRef(null);
  const activatedTrainsRef = useRef(new Set());

  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Trigger one-time RailRadar live telemetry sync when trains are activated
  useEffect(() => {
    trackedTrainNumbers.forEach((num) => {
      const clean = String(num || '').trim();
      if (clean && !activatedTrainsRef.current.has(clean)) {
        activatedTrainsRef.current.add(clean);
        activateLiveTracking(clean);
      }
    });
  }, [trackedTrainNumbers]);

  // Fetch all tracked trains in parallel
  const fetchAllTelemetry = useCallback(async (isBackground = false) => {
    if (trackedTrainNumbers.length === 0) return;
    if (!isBackground) {
      setRefreshing(true);
    }

    try {
      const results = await Promise.all(
        trackedTrainNumbers.map(async (num) => {
          try {
            const data = await getTrainETA(num);
            return { trainNumber: num, data, error: null };
          } catch (err) {
            console.error(`Error fetching ETA for train ${num}:`, err);
            return { trainNumber: num, data: null, error: err };
          }
        })
      );

      // Check disruption report summary for the currently focused train
      const targetFocus = focusedTrainNumber || trackedTrainNumbers[0];
      const summary = await getDisruptionReportSummary(targetFocus).catch(() => null);
      if (summary) setReportSummary(summary);

      // Update ETA Map
      setTrainsEta((prev) => {
        const next = { ...prev };
        let hasAtLeastOne = false;
        results.forEach((r) => {
          if (r.data) {
            next[r.trainNumber] = r.data;
            hasAtLeastOne = true;
          }
        });
        return next;
      });

      const successfulCount = results.filter(r => r.data).length;
      if (successfulCount === 0 && Object.keys(trainsEta).length === 0) {
        setError(t('telemetryOffline', { trainNumber: baseTrainNumber }));
      } else {
        setError(null);
      }

      if (isBackground) {
        setFlashHighlight(true);
        setTimeout(() => setFlashHighlight(false), 800);
      }
    } catch (err) {
      console.error('Error in batch telemetry poll:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCountdown(POLL_INTERVAL_SECONDS);
    }
  }, [trackedTrainNumbers, focusedTrainNumber, baseTrainNumber, t, trainsEta]);

  // Initial load and polling timer
  useEffect(() => {
    setLoading(true);
    fetchAllTelemetry(false);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      fetchAllTelemetry(true);
    }, POLL_INTERVAL_SECONDS * 1000);

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : POLL_INTERVAL_SECONDS));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [trackedTrainNumbers.join(',')]);

  // Click outside listener for Add Train search dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (addSearchContainerRef.current && !addSearchContainerRef.current.contains(e.target)) {
        setIsAddSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add a train to tracking
  const handleAddTrain = (trainNum) => {
    const cleanNum = String(trainNum).trim();
    if (!cleanNum) return;

    if (trackedTrainNumbers.includes(cleanNum)) {
      setFocusedTrainNumber(cleanNum);
      setIsAddSearchOpen(false);
      setAddSearchQuery('');
      return;
    }

    if (!activatedTrainsRef.current.has(cleanNum)) {
      activatedTrainsRef.current.add(cleanNum);
      activateLiveTracking(cleanNum);
    }

    const currentCompareList = compareParam
      ? compareParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const updatedCompare = [...currentCompareList, cleanNum];

    setSearchParams({ compare: updatedCompare.join(',') });
    setFocusedTrainNumber(cleanNum);
    setIsAddSearchOpen(false);
    setAddSearchQuery('');
    setAddSearchResults([]);
  };

  // Remove a train from tracking
  const handleRemoveTrain = (trainNumToRemove, e) => {
    if (e) e.stopPropagation();
    if (trackedTrainNumbers.length <= 1) return; // Keep at least one train tracked

    if (trainNumToRemove === baseTrainNumber) {
      // Base train removed: first compare train becomes new base in route
      const nextRemaining = trackedTrainNumbers.filter(n => n !== trainNumToRemove);
      const [newBase, ...newCompare] = nextRemaining;
      const compareQuery = newCompare.length ? `?compare=${newCompare.join(',')}` : '';
      navigate(`/train/${newBase}${compareQuery}`, { replace: true });
    } else {
      // Compare train removed: update compare query param
      const nextCompare = trackedTrainNumbers
        .filter(n => n !== baseTrainNumber && n !== trainNumToRemove);
      if (nextCompare.length > 0) {
        setSearchParams({ compare: nextCompare.join(',') });
      } else {
        setSearchParams({});
      }
    }
  };

  // Debounced search for Add Train autocomplete
  const handleAddSearchChange = (e) => {
    const val = e.target.value;
    setAddSearchQuery(val);
    if (addSearchDebounce.current) clearTimeout(addSearchDebounce.current);

    if (val.trim().length < 2) {
      setAddSearchResults([]);
      setAddSearchLoading(false);
      return;
    }

    setAddSearchLoading(true);
    addSearchDebounce.current = setTimeout(async () => {
      try {
        const results = await getTrainsSearch(val.trim(), 10);
        setAddSearchResults(results || []);
      } catch (err) {
        console.error('Failed to search trains for comparison:', err);
        setAddSearchResults([]);
      } finally {
        setAddSearchLoading(false);
      }
    }, 300);
  };

  const handleOpenReportModal = () => {
    if (!isAuthenticated) {
      openLoginModal();
    } else {
      setIsReportModalOpen(true);
    }
  };

  // Unified structured trains array for subcomponents
  const trainsData = useMemo(() => {
    return trackedTrainNumbers.map((num, idx) => {
      const eta = trainsEta[num];
      const color = getTrainColor(idx, isDark);
      const isFocused = num === focusedTrainNumber;
      return {
        trainNumber: num,
        trainName: eta?.name || `Train #${num}`,
        stations: eta?.stations || [],
        currentPosition: eta?.current_position || null,
        scheduled_departure: eta?.scheduled_departure || '06:00',
        elapsed_min: eta?.elapsed_min,
        color,
        isFocused,
        etaData: eta
      };
    });
  }, [trackedTrainNumbers, trainsEta, focusedTrainNumber, isDark]);

  // Focused train object
  const focusedTrain = useMemo(() => {
    return trainsData.find(t => t.trainNumber === focusedTrainNumber) || trainsData[0];
  }, [trainsData, focusedTrainNumber]);

  const focusedStations = focusedTrain?.stations || [];
  const activeStationIndex = focusedStations.findIndex(s => s.status !== 'reached');
  const activeStation = activeStationIndex !== -1 ? focusedStations[activeStationIndex] : focusedStations[focusedStations.length - 1];
  const activeDelay = activeStation?.predicted_delay_min || 0;
  const isDelayedOverall = activeDelay > 2;

  const showSoftCapWarning = trackedTrainNumbers.length > SOFT_CAP_WARNING_THRESHOLD && !dismissedWarning;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans text-foreground dark:text-slate-100 transition-colors">
      
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border dark:border-slate-800">
        
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 min-h-[40px] text-xs sm:text-sm font-semibold text-muted dark:text-slate-400 hover:text-navy dark:hover:text-blue-400 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-navy rounded p-1 group active:scale-95 self-start"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t('backToDirectory')}</span>
        </Link>

        {/* Action Badges & Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 text-xs w-full sm:w-auto flex-wrap">
          
          {/* Report Disruption Button */}
          <button
            onClick={handleOpenReportModal}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-red-500/10 hover:bg-red-500/20 text-transit-red dark:text-red-400 border border-transit-red/30 font-semibold text-xs transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95"
            title={`Report disruption for Train #${focusedTrain?.trainNumber}`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-transit-red" />
            <span>Report Disruption</span>
          </button>

          {/* Sync Countdown */}
          <div className="flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-full bg-white dark:bg-slate-800 border border-border dark:border-slate-700 text-muted dark:text-slate-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-transit-green inline-block animate-pulse" />
            <span className="text-[11px] font-medium">
              {t('autoSync')} <strong>{countdown}s</strong>
            </span>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchAllTelemetry(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-navy dark:text-blue-400 border border-border dark:border-slate-700 font-semibold text-xs transition-all duration-200 disabled:opacity-50 shadow-2xs hover:shadow-xs active:scale-95"
            title={t('syncTelemetry')}
            aria-label={t('syncTelemetry')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? t('syncing') : t('syncTelemetry')}</span>
          </button>
        </div>

      </div>

      {/* Multi-Train Tracked Strip & "Add Train to Compare" Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-border dark:border-slate-800">
        
        {/* Horizontally Scrollable Tracked Train Chips */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-slate-400 shrink-0 px-1">
            Tracking ({trackedTrainNumbers.length}):
          </span>

          {trainsData.map((tItem) => {
            const isFocused = tItem.trainNumber === focusedTrainNumber;
            const colorHex = tItem.color.currentHex;
            return (
              <div
                key={tItem.trainNumber}
                onClick={() => setFocusedTrainNumber(tItem.trainNumber)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all shrink-0 select-none shadow-2xs ${
                  isFocused
                    ? 'bg-white dark:bg-slate-800 text-foreground dark:text-slate-100 border-navy dark:border-blue-400 shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-muted dark:text-slate-300 border-border dark:border-slate-700 opacity-85 hover:opacity-100'
                }`}
                style={isFocused ? { borderLeftWidth: '3.5px', borderLeftColor: colorHex } : {}}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: colorHex }}
                />
                <span className="font-mono font-bold">#{tItem.trainNumber}</span>
                <span className="text-[11px] font-normal truncate max-w-[120px] hidden md:inline opacity-80">
                  {tItem.trainName}
                </span>

                {/* Remove Train Button (disabled if only 1 train tracked) */}
                {trackedTrainNumbers.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveTrain(tItem.trainNumber, e)}
                    className="p-0.5 ml-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-muted hover:text-navy dark:text-slate-400 dark:hover:text-white transition-colors"
                    title={`Remove #${tItem.trainNumber} from tracking`}
                    aria-label={`Remove #${tItem.trainNumber}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* "Add Train to Compare" Autocomplete Search Control */}
        <div className="relative shrink-0 w-full sm:w-auto" ref={addSearchContainerRef}>
          {!isAddSearchOpen ? (
            <button
              type="button"
              onClick={() => {
                setIsAddSearchOpen(true);
                setTimeout(() => {
                  const input = document.getElementById('add-train-search-input');
                  if (input) input.focus();
                }, 50);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/80 text-navy dark:text-blue-400 border border-border dark:border-slate-700 font-semibold text-xs transition-all shadow-2xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Train to Compare</span>
            </button>
          ) : (
            <div className="relative flex items-center w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted dark:text-slate-400 pointer-events-none" />
              <input
                id="add-train-search-input"
                type="text"
                value={addSearchQuery}
                onChange={handleAddSearchChange}
                placeholder="Search train # or name..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-navy dark:border-blue-500 bg-white dark:bg-slate-800 text-foreground dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-navy dark:focus:ring-blue-400 font-sans shadow-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setIsAddSearchOpen(false);
                  setAddSearchQuery('');
                  setAddSearchResults([]);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Autocomplete Dropdown List */}
              <AnimatePresence>
                {(addSearchResults.length > 0 || addSearchLoading) && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 max-h-60 overflow-y-auto rounded-xl border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-[1200] p-1.5 space-y-1 font-sans text-xs"
                  >
                    {addSearchLoading && (
                      <div className="p-3 text-center text-muted dark:text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-navy dark:text-blue-400" />
                        <span>Searching train network...</span>
                      </div>
                    )}

                    {!addSearchLoading && addSearchResults.map((item) => {
                      const isAlreadyTracked = trackedTrainNumbers.includes(item.train_number);
                      return (
                        <button
                          key={item.train_number}
                          type="button"
                          disabled={isAlreadyTracked}
                          onClick={() => handleAddTrain(item.train_number)}
                          className={`w-full flex items-start justify-between gap-2 p-2 rounded-lg text-left transition-colors ${
                            isAlreadyTracked
                              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40'
                              : 'hover:bg-blue-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-navy dark:text-blue-400">
                                #{item.train_number}
                              </span>
                              <span className="font-semibold text-foreground dark:text-slate-200 truncate max-w-[150px]">
                                {item.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted dark:text-slate-400 pt-0.5">
                              {item.origin} → {item.destination}
                            </div>
                          </div>
                          {isAlreadyTracked ? (
                            <span className="text-[10px] text-muted dark:text-slate-500 font-semibold shrink-0">
                              Tracked
                            </span>
                          ) : (
                            <span className="text-[10px] text-navy dark:text-blue-400 font-bold shrink-0">
                              + Add
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>

      {/* Advisory Soft Cap Warning (> 8 Tracked Trains) */}
      <AnimatePresence>
        {showSoftCapWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between gap-2 shadow-2xs font-sans">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Tracking <strong>{trackedTrainNumbers.length} trains</strong> — the map and timeline may get crowded at this count.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDismissedWarning(true)}
                className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 transition-colors"
                title="Dismiss warning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-6">
          <TrackingHeaderSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-6">
            <div>
              <MapSkeleton />
            </div>
            <div>
              <TimelineSkeleton />
            </div>
          </div>
        </div>
      )}

      {/* Error View */}
      {!loading && error && (
        <div className="p-6 sm:p-8 rounded-lg border border-transit-red-border dark:border-red-900 bg-white dark:bg-slate-900 text-center space-y-4 max-w-lg mx-auto shadow-card">
          <div className="text-transit-red dark:text-red-400 font-bold text-sm flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAllTelemetry(false)}
            className="px-4 py-2.5 min-h-[44px] rounded-lg bg-navy dark:bg-blue-600 text-white text-xs font-semibold transition-colors active:scale-95"
          >
            {t('retryConnection')}
          </button>
        </div>
      )}

      {/* Live Train Cockpit */}
      {!loading && !error && focusedTrain && (
        <>
          {/* Top Key Metrics Header Card (Scoped to Focused Train) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`rounded-lg border p-4 sm:p-6 transition-all duration-300 shadow-card ${
              flashHighlight 
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-navy dark:border-blue-400 shadow-md' 
                : 'bg-white dark:bg-slate-900 border-border dark:border-slate-800'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
              
              {/* Left Column: Train Info & Identity */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span 
                    className="px-2.5 py-1 rounded text-white font-mono font-bold text-sm shadow-2xs"
                    style={{ backgroundColor: focusedTrain.color.currentHex }}
                  >
                    #{focusedTrain.trainNumber}
                  </span>
                  
                  {/* Status Pill */}
                  <span className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    isDelayedOverall 
                      ? 'bg-transit-orange-light dark:bg-amber-950/60 text-transit-orange dark:text-amber-400 border border-transit-orange-border dark:border-amber-800' 
                      : 'bg-transit-green-light dark:bg-emerald-950/60 text-transit-green dark:text-emerald-400 border border-transit-green-border dark:border-emerald-800'
                  }`}>
                    {isDelayedOverall ? t('delayedBy', { delay: activeDelay }) : t('runningOnTime')}
                  </span>

                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-muted dark:text-slate-300 text-[11px] font-medium border border-border dark:border-slate-700">
                    {t('liveGpsTelemetry')}
                  </span>

                  {trackedTrainNumbers.length > 1 && (
                    <span className="text-[11px] text-muted dark:text-slate-400 font-medium italic">
                      (Focused Train — click any chip above to switch)
                    </span>
                  )}
                </div>

                {/* Train Name */}
                <h1 className="font-bold text-xl sm:text-2xl lg:text-3xl text-navy dark:text-blue-400 tracking-tight leading-tight">
                  {focusedTrain.trainName}
                </h1>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted dark:text-slate-400 pt-1">
                  {focusedTrain.currentPosition?.speed_kmh !== undefined && (
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-navy dark:text-blue-400 shrink-0" />
                      <span>{t('currentSpeed')}: <strong className="text-foreground dark:text-slate-200 font-semibold"><AnimatedNumber value={focusedTrain.currentPosition.speed_kmh} /> {t('km')}/h</strong></span>
                    </span>
                  )}
                  {focusedTrain.elapsed_min && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-navy dark:text-blue-400 shrink-0" />
                      <span>{t('elapsedJourney')}: <strong className="text-foreground dark:text-slate-200 font-semibold">{formatDuration(focusedTrain.elapsed_min)}</strong></span>
                    </span>
                  )}
                  {focusedTrain.currentPosition?.next_station_name && (
                    <span className="flex items-center gap-1.5">
                      <Train className="w-3.5 h-3.5 text-navy dark:text-blue-400 shrink-0" />
                      <span>{t('nextStation')}: <strong className="text-navy dark:text-blue-300 font-semibold">{focusedTrain.currentPosition.next_station_name}</strong></span>
                    </span>
                  )}
                </div>
              </div>

            </div>
          </motion.div>

          {/* Mobile View Switcher */}
          <div className="flex lg:hidden rounded-lg border border-border dark:border-slate-800 p-1 bg-white dark:bg-slate-900 shadow-sm">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2.5 min-h-[44px] rounded-md text-xs font-semibold transition-colors flex items-center justify-center ${
                activeTab === 'all' ? 'bg-navy dark:bg-blue-600 text-white shadow-xs' : 'text-muted dark:text-slate-400 hover:text-navy dark:hover:text-white'
              }`}
            >
              {t('allViews')}
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-2.5 min-h-[44px] rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'map' ? 'bg-navy dark:bg-blue-600 text-white shadow-xs' : 'text-muted dark:text-slate-400 hover:text-navy dark:hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>{t('routeMap')}</span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2.5 min-h-[44px] rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'timeline' ? 'bg-navy dark:bg-blue-600 text-white shadow-xs' : 'text-muted dark:text-slate-400 hover:text-navy dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{t('stationTimeline')}</span>
            </button>
          </div>

          {/* Crowdsourced Disruption Alert Banner */}
          {reportSummary && reportSummary.report_count > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans shadow-xs ${
                reportSummary.flagged
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${reportSummary.flagged ? 'text-red-600' : 'text-amber-600'}`} />
                <div>
                  <span className="font-bold">
                    {reportSummary.flagged ? 'Active Section Alert: ' : 'Passenger Disruption Reports: '}
                  </span>
                  <span>
                    {reportSummary.report_count} verified passenger {reportSummary.report_count === 1 ? 'report' : 'reports'} for #{focusedTrain.trainNumber} in the last {reportSummary.window_hours}h.
                  </span>
                </div>
              </div>
              <button
                onClick={handleOpenReportModal}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 font-semibold text-xs transition-colors border border-current shadow-2xs self-start sm:self-auto active:scale-95"
              >
                + Add Report
              </button>
            </motion.div>
          )}

          {/* Telemetry Main Grid: Left Multi-Train Map + Right Station Timeline Tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-6 items-start">
            
            {/* Left: Leaflet Interactive GIS Route Map + Delay Sparkline */}
            <div className={`space-y-4 lg:sticky lg:top-20 ${
              activeTab === 'timeline' ? 'hidden lg:block' : 'block'
            }`}>
              <TrainMap
                trains={trainsData}
                focusedTrainNumber={focusedTrainNumber}
                onFocusTrain={(num) => setFocusedTrainNumber(num)}
              />

              {/* Delay Progression Sparkline Graph (Scoped to Focused Train) */}
              <DelaySparkline stations={focusedStations} />
            </div>

            {/* Right: Dynamic Station Timeline with Multi-Train Tabs */}
            <div className={`${
              activeTab === 'map' ? 'hidden lg:block' : 'block'
            }`}>
              <StationTimeline
                trains={trainsData}
                focusedTrainNumber={focusedTrainNumber}
                onFocusTrain={(num) => setFocusedTrainNumber(num)}
              />
            </div>

          </div>
        </>
      )}

      {/* Crowdsourced Disruption Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        trainNumber={focusedTrain?.trainNumber || baseTrainNumber}
        trainName={focusedTrain?.trainName || ''}
        stations={focusedStations}
        onReportSubmitted={() => {
          fetchAllTelemetry(true);
        }}
      />

    </div>
  );
}
