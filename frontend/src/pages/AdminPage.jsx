import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  ArrowLeft, 
  ChevronRight, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Train, 
  X, 
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';
import { getAdminStations, getAdminStationArrivals } from '../services/api';

// Convert scheduled_offset_min + delay into a HH:MM clock string
function offsetToTime(baseOffsetMin, delayMin = 0) {
  const total = Math.max(0, (baseOffsetMin || 0) + (delayMin || 0));
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 1. STATUS BADGE LOGIC
 * Computes status per row based on current time vs scheduled/expected arrival and halt duration:
 * - APPROACHING: current time is before the train's expected arrival
 * - AT PLATFORM: current time is between expected arrival and (expected arrival + halt duration)
 * - DEPARTED: current time is past (expected arrival + halt duration)
 */
function computeTrainStatus(scheduledOffsetMin, delayMin, haltMin = 2) {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const expTotalMin = Math.max(0, (scheduledOffsetMin || 0) + (delayMin || 0));
  const expMin = expTotalMin % 1440;
  const halt = haltMin > 0 ? haltMin : 2;

  // Circular 24-hour difference to handle midnight crossing
  let diffToArrival = expMin - currentMin;
  if (diffToArrival < -720) diffToArrival += 1440;
  if (diffToArrival > 720) diffToArrival -= 1440;

  if (diffToArrival > 0) {
    return 'APPROACHING';
  } else if (diffToArrival >= -halt) {
    return 'AT_PLATFORM';
  } else {
    return 'DEPARTED';
  }
}

/**
 * Visual Status Badge Component
 */
function StatusBadge({ status }) {
  if (status === 'APPROACHING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-200 text-navy bg-blue-50 shadow-2xs tracking-wide">
        APPROACHING
      </span>
    );
  }
  if (status === 'AT_PLATFORM') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-navy text-white shadow-xs tracking-wide">
        AT PLATFORM
      </span>
    );
  }
  // DEPARTED (faded/quiet visual state)
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-200 text-muted bg-slate-100 tracking-wide">
      DEPARTED
    </span>
  );
}

/**
 * 2. DELAY SEVERITY LOGIC (computed independently of status badge)
 * delayMinutes <= 5: on-time
 * delayMinutes 6-15: moderate
 * delayMinutes >= 16: severe
 */
function getDelaySeverity(delayMinutes = 0) {
  const d = Math.max(0, delayMinutes || 0);

  if (d <= 5) {
    return {
      severity: 'on_time',
      textClass: 'text-transit-green',
      badgeClass: 'bg-emerald-50 border border-emerald-200 text-transit-green',
      borderLeftClass: 'border-l-transit-green',
      dotColor: '#2E7D32',
      label: d === 0 ? 'ON TIME' : `+${d}m`,
    };
  }
  if (d <= 15) {
    return {
      severity: 'moderate',
      textClass: 'text-transit-orange',
      badgeClass: 'bg-amber-50 border border-amber-200 text-transit-orange',
      borderLeftClass: 'border-l-transit-orange',
      dotColor: '#ED8B00',
      label: `+${d}m LATE`,
    };
  }
  return {
    severity: 'severe',
    textClass: 'text-railway-red',
    badgeClass: 'bg-red-50 border border-red-200 text-railway-red',
    borderLeftClass: 'border-l-railway-red',
    dotColor: '#D32F2F',
    label: `+${d}m LATE`,
  };
}

function DelaySeverityBadge({ delayMinutes }) {
  const sev = getDelaySeverity(delayMinutes);
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono ${sev.badgeClass}`}>
      {sev.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#D9DEE5] dark:border-slate-800 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// 1. Station Picker View (/admin)
// ---------------------------------------------------------------------------
function StationPickerView() {
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    getAdminStations().then(data => {
      setStations(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = filterQuery.trim().length === 0
    ? stations
    : stations.filter(s =>
        s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(filterQuery.toLowerCase())
      );

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0F172A] text-[#1F2933] dark:text-[#F1F5F9] font-sans transition-colors">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-6">

        {/* Section Header & Subtitle */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#17324D] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#17324D] dark:bg-blue-400 inline-block" />
            <span>Station Admin Portal</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="font-normal text-muted dark:text-slate-400">Live Arrivals Board</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#17324D] dark:text-[#93C5FD] tracking-tight">
            Select Station & Live Arrivals Board
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-[#94A3B8] max-w-2xl">
            Pick a station from the directory below to view real-time arrivals, delay updates, platform assignments, and halt durations.
            {!loading && stations.length > 0 && (
              <span className="ml-1 font-semibold text-[#17324D] dark:text-blue-300">({stations.length.toLocaleString()} stations available)</span>
            )}
          </p>
        </div>

        {/* Station Search Input Card */}
        <div className="p-4 sm:p-5 rounded-lg border border-[#D9DEE5] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-card">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] dark:text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Search station by name or code (e.g. BGJT, NDLS, New Delhi, Kanpur, CNB, Mumbai)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[#D9DEE5] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/50 text-[#1F2933] dark:text-slate-100 placeholder:text-[#667085] dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500 transition-all"
              aria-label="Filter stations"
              autoFocus
            />
            {filterQuery && (
              <button 
                onClick={() => setFilterQuery('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#667085] hover:text-[#17324D] dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Station Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-16 bg-white dark:bg-slate-800 animate-pulse rounded-lg border border-[#D9DEE5] dark:border-slate-700 shadow-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#1E293B] rounded-lg border border-dashed border-[#D9DEE5] dark:border-slate-700 space-y-3 shadow-card">
            <Building2 className="w-10 h-10 text-[#667085] dark:text-slate-500 mx-auto opacity-60" />
            <p className="text-sm font-semibold text-[#1F2933] dark:text-slate-200">
              No stations matching "{filterQuery}"
            </p>
            <button 
              onClick={() => setFilterQuery('')} 
              className="px-4 py-2 rounded-lg bg-[#17324D] dark:bg-blue-600 hover:bg-[#24476B] text-white text-xs font-semibold transition-colors"
            >
              Clear Search Filter
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#94A3B8]">
              <span className="font-semibold uppercase tracking-wider">
                {filtered.length < stations.length ? `Showing ${filtered.length} of ${stations.length} stations` : `All ${stations.length.toLocaleString()} Stations`}
              </span>
              <span className="text-[11px]">Click any station to open live board</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto pr-1">
              {filtered.slice(0, 300).map(station => (
                <button
                  key={station.code}
                  onClick={() => navigate(`/admin/${station.code}`)}
                  className="railway-card group flex items-center justify-between p-3.5 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-[#D9DEE5] dark:border-[#334155] rounded-lg transition-all text-left shadow-card"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#17324D] dark:text-[#93C5FD] group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                        {station.code}
                      </span>
                    </div>
                    <div className="text-xs text-[#1F2933] dark:text-slate-300 font-medium truncate max-w-[200px]">
                      {station.name}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#667085] dark:text-slate-400 group-hover:text-[#17324D] dark:group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
              {filtered.length > 300 && (
                <div className="col-span-full text-center text-xs text-[#667085] dark:text-slate-400 py-3">
                  + {filtered.length - 300} more stations — type in search to narrow down
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Arrivals Board View (/admin/:stationCode)
// ---------------------------------------------------------------------------
function ArrivalsBoard({ stationCode }) {
  const navigate = useNavigate();
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('time'); // 'time' | 'delay'
  const pollingRef = useRef(null);

  const fetchArrivals = useCallback(async () => {
    try {
      const data = await getAdminStationArrivals(stationCode);
      setArrivals(data || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load arrivals. Retrying...');
    } finally {
      setLoading(false);
    }
  }, [stationCode]);

  useEffect(() => {
    setLoading(true);
    setArrivals([]);
    setError(null);
    fetchArrivals();
    pollingRef.current = setInterval(fetchArrivals, 12000);
    return () => clearInterval(pollingRef.current);
  }, [fetchArrivals]);

  // 4. SUMMARY STRIP COMPUTATION
  const { onTimeCount, moderateCount, severeCount } = useMemo(() => {
    let onTime = 0;
    let moderate = 0;
    let severe = 0;

    arrivals.forEach((arr) => {
      const d = arr.predicted_delay_min || 0;
      if (d <= 5) onTime += 1;
      else if (d <= 15) moderate += 1;
      else severe += 1;
    });

    return { onTimeCount: onTime, moderateCount: moderate, severeCount: severe };
  }, [arrivals]);

  // 6. SORT LOGIC
  const processedArrivals = useMemo(() => {
    const list = arrivals.map((arr) => {
      const status = computeTrainStatus(
        arr.scheduled_arrival_offset_min,
        arr.predicted_delay_min,
        arr.halt_min
      );
      const severity = getDelaySeverity(arr.predicted_delay_min);
      return {
        ...arr,
        computedStatus: status,
        severity,
      };
    });

    if (sortBy === 'delay') {
      return list.sort((a, b) => (b.predicted_delay_min || 0) - (a.predicted_delay_min || 0));
    }
    // Default chronological by predicted arrival
    return list.sort((a, b) => (a.predicted_arrival_offset_min || 0) - (b.predicted_arrival_offset_min || 0));
  }, [arrivals, sortBy]);

  return (
    <div className="min-h-screen bg-[#F5F6F8] dark:bg-[#0F172A] text-[#1F2933] dark:text-[#F1F5F9] font-sans transition-colors">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-6">

        {/* Back Link & Header */}
        <div className="space-y-3 pb-3 border-b border-[#D9DEE5] dark:border-slate-800">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 min-h-[36px] text-xs sm:text-sm font-semibold text-[#667085] dark:text-slate-400 hover:text-[#17324D] dark:hover:text-blue-400 transition-colors rounded p-1 group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Stations</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-[#17324D] dark:text-[#93C5FD] border border-[#D9DEE5] dark:border-slate-700">
                  {stationCode}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#17324D] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Live Arrivals Board
                </span>
                <span className="text-[11px] font-semibold text-[#2E7D32] dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E7D32] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2E7D32]"></span>
                  </span>
                  <span>Live Feed Active</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-[#17324D] dark:text-[#93C5FD] tracking-tight">
                {stationCode} Station Live Arrivals
              </h1>

              {/* 4. SUMMARY STRIP (under heading, above table) */}
              {!loading && arrivals.length > 0 && (
                <div className="flex items-center gap-4 text-xs font-medium pt-0.5 text-[#1F2933] dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#639922] inline-block" />
                    <span><strong>{onTimeCount}</strong> on-time</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#BA7517] inline-block" />
                    <span><strong>{moderateCount}</strong> delayed</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#A32D2D] inline-block" />
                    <span><strong>{severeCount}</strong> critical</span>
                  </span>
                </div>
              )}
            </div>

            {/* Right Status / Actions */}
            <div className="flex items-center gap-2.5 text-xs flex-wrap">
              
              {/* 6. Sort Toggle */}
              <button
                onClick={() => setSortBy(prev => prev === 'time' ? 'delay' : 'time')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all shadow-2xs active:scale-95 ${
                  sortBy === 'delay'
                    ? 'bg-[#17324D] dark:bg-blue-600 text-white border-[#17324D] dark:border-blue-600'
                    : 'bg-white dark:bg-slate-800 text-[#17324D] dark:text-blue-300 border-[#D9DEE5] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={sortBy === 'delay' ? 'Currently sorting by highest delay' : 'Currently sorting chronologically'}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortBy === 'delay' ? 'Sorted by Delay' : 'Sort by Delay'}</span>
              </button>

              {/* Auto-Refresh Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-[#D9DEE5] dark:border-slate-700 text-[#667085] dark:text-slate-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32] inline-block animate-pulse" />
                <span className="text-[11px] font-medium">Auto-refresh: 12s</span>
              </div>

              {lastUpdated && (
                <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              )}

              <button
                onClick={fetchArrivals}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#17324D] dark:text-blue-400 border border-[#D9DEE5] dark:border-slate-700 font-semibold text-xs transition-all shadow-2xs active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs rounded-lg flex items-center gap-2 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-[#ED8B00] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Arrivals Table Card */}
        <div className="rounded-lg border border-[#D9DEE5] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-card overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-[#D9DEE5] dark:border-slate-800 text-[11px] font-semibold text-[#667085] dark:text-slate-400">
                  <th className="text-left px-4 py-3.5">TRAIN</th>
                  <th className="text-left px-4 py-3.5">PLATFORM</th>
                  <th className="text-left px-4 py-3.5">EXP ARRIVAL</th>
                  <th className="text-left px-4 py-3.5">STATUS / DELAY</th>
                  <th className="text-left px-4 py-3.5">HALT</th>
                  <th className="text-left px-4 py-3.5">DIRECTION</th>
                  <th className="text-right px-4 py-3.5">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9DEE5] dark:divide-slate-800">
                {loading && [...Array(8)].map((_, i) => <SkeletonRow key={i} />)}

                {!loading && processedArrivals.length === 0 && !error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-muted dark:text-slate-400">
                      <Train className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#17324D] dark:text-blue-400" />
                      <p className="text-xs font-semibold">
                        No trains currently scheduled through {stationCode}
                      </p>
                    </td>
                  </tr>
                )}

                {!loading && processedArrivals.map((arrival, idx) => {
                  const isDeparted = arrival.computedStatus === 'DEPARTED';

                  return (
                    <motion.tr
                      key={`${arrival.train_number}-${idx}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                      /* 3. ROW LEFT BORDER (4px colored by severity) & 5. DEPARTED ROW MUTING */
                      className={`transition-colors border-l-4 ${arrival.severity.borderLeftClass} ${
                        isDeparted 
                          ? 'opacity-55 hover:opacity-80 bg-slate-50/40 dark:bg-slate-900/20' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* TRAIN: Train Number & Name */}
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/train/${arrival.train_number}`}
                          className={`font-bold font-mono text-sm inline-block transition-colors ${
                            isDeparted 
                              ? 'text-[#667085] dark:text-slate-400 hover:text-navy dark:hover:text-blue-300' 
                              : 'text-[#17324D] dark:text-[#93C5FD] hover:text-blue-600 dark:hover:text-blue-300'
                          }`}
                        >
                          #{arrival.train_number}
                        </Link>
                        <div className={`text-[11px] truncate max-w-[220px] ${
                          isDeparted ? 'text-slate-400 dark:text-slate-500' : 'text-[#667085] dark:text-slate-400'
                        }`}>
                          {arrival.train_name}
                        </div>
                      </td>

                      {/* PLATFORM: Platform Chip */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                          isDeparted
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                            : 'bg-slate-100 dark:bg-slate-800 border-[#D9DEE5] dark:border-slate-700 text-[#17324D] dark:text-slate-200'
                        }`}>
                          PF {arrival.platform}
                        </span>
                      </td>

                      {/* EXP ARRIVAL: Expected Arrival Time vs Scheduled */}
                      <td className="px-4 py-3.5">
                        <div className={`font-mono text-sm font-bold ${
                          isDeparted ? 'text-slate-500 dark:text-slate-400' : 'text-[#1F2933] dark:text-slate-100'
                        }`}>
                          {offsetToTime(arrival.scheduled_arrival_offset_min, arrival.predicted_delay_min)}
                        </div>
                        <div className="text-[10px] text-[#667085] dark:text-slate-400 font-mono">
                          SCH: {offsetToTime(arrival.scheduled_arrival_offset_min)}
                        </div>
                      </td>

                      {/* 1. STATUS & 2. DELAY SEVERITY BADGES (independent) */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          {/* 1. Status badge (APPROACHING / AT PLATFORM / DEPARTED) */}
                          <StatusBadge status={arrival.computedStatus} />
                          {/* 2. Delay severity badge (ON TIME / +Xm / +Xm LATE) */}
                          <DelaySeverityBadge delayMinutes={arrival.predicted_delay_min} />
                        </div>
                      </td>

                      {/* HALT: Halt duration */}
                      <td className="px-4 py-3.5">
                        <span className={`font-mono text-xs font-semibold ${
                          arrival.halt_min > 0 
                            ? isDeparted ? 'text-slate-400 dark:text-slate-500' : 'text-[#1F2933] dark:text-slate-200'
                            : 'text-[#667085] dark:text-slate-500'
                        }`}>
                          {arrival.halt_min > 0 ? `${arrival.halt_min} min` : '—'}
                        </span>
                      </td>

                      {/* DIRECTION */}
                      <td className="px-4 py-3.5">
                        <span className={`text-xs truncate max-w-[180px] block ${
                          isDeparted ? 'text-slate-400 dark:text-slate-500' : 'text-[#667085] dark:text-slate-300'
                        }`}>
                          {arrival.direction}
                        </span>
                      </td>

                      {/* ACTION: Track Button */}
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/train/${arrival.train_number}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all shadow-2xs ${
                            isDeparted
                              ? 'bg-slate-200 dark:bg-slate-800 text-[#17324D] dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                              : 'bg-[#17324D] dark:bg-blue-600 text-white hover:bg-[#24476B] dark:hover:bg-blue-500'
                          }`}
                        >
                          <span>Track</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && processedArrivals.length > 0 && (
          <p className="text-[11px] text-[#667085] dark:text-slate-400 text-right">
            Showing {processedArrivals.length} upcoming arrivals · {sortBy === 'delay' ? 'Sorted by delay severity' : 'Sorted by expected arrival time'}
          </p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root Export — Dispatches based on :stationCode
// ---------------------------------------------------------------------------
export default function AdminPage() {
  const { stationCode } = useParams();
  if (stationCode) return <ArrivalsBoard stationCode={stationCode.toUpperCase()} />;
  return <StationPickerView />;
}
