import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Star, 
  ArrowRight, 
  Table, 
  LayoutGrid, 
  Train, 
  Sparkles,
  FileText,
  AlertTriangle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { getTrains, getTrainsSearch, lookupPNR } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

// Staggered motion container variants for hero entry
const heroContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 }
  }
};

const heroItem = {
  hidden: { opacity: 0, y: 14 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } 
  }
};

const gridContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

// Preset quick search categories
const SEARCH_PRESETS = ['Vande Bharat', 'Rajdhani', 'Shatabdi', 'Superfast', 'Duronto'];

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useSettings();
  const { favorites = [], isFavorite = () => false, toggleFavorite = () => {}, isAuthenticated, openLoginModal } = useAuth();

  const [featuredTrains, setFeaturedTrains] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [searchMode, setSearchMode] = useState('train'); // 'train' | 'pnr'
  const [activeDirectoryTab, setActiveDirectoryTab] = useState('all'); // 'all' | 'saved'
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // PNR Search State
  const [pnrQuery, setPnrQuery] = useState('');
  const [pnrLoading, setPnrLoading] = useState(false);
  const [pnrResult, setPnrResult] = useState(null);

  const debounceTimer = useRef(null);

  // Load featured trains on initial mount
  useEffect(() => {
    async function loadFeatured() {
      try {
        setInitialLoading(true);
        const data = await getTrains({ featured: true });
        setFeaturedTrains(data || []);
      } catch (err) {
        console.error('Failed to load featured trains:', err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadFeatured();
  }, []);

  // Debounced server-side search (300ms)
  const runSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await getTrainsSearch(trimmed, 20);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!val.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceTimer.current = setTimeout(() => {
      runSearch(val);
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchLoading(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  };

  const isSearchActive = searchQuery.trim().length >= 2;

  // Active trains displayed based on tab and search query
  const displayedTrains = useMemo(() => {
    if (activeDirectoryTab === 'saved') {
      const allKnown = [...featuredTrains, ...searchResults];
      const uniqueMap = new Map();
      allKnown.forEach(t => uniqueMap.set(t.train_number, t));
      return favorites.map(num => uniqueMap.get(num) || {
        train_number: num,
        name: `Train #${num}`,
        origin: 'Saved Service',
        destination: 'Saved Service',
        type: 'Express',
        zone: 'Indian Railways',
        featured: true
      });
    }

    if (isSearchActive) {
      return searchResults;
    }

    return featuredTrains;
  }, [activeDirectoryTab, isSearchActive, searchResults, featuredTrains, favorites]);

  const handleSelectTrain = (trainNumber) => {
    navigate(`/train/${trainNumber}`);
  };

  const handlePNRLookup = async (e) => {
    if (e) e.preventDefault();
    const cleanPnr = pnrQuery.trim();
    if (cleanPnr.length !== 10) {
      setPnrResult({
        found: false,
        message: 'Please enter a valid 10-digit Indian Railways PNR number.'
      });
      return;
    }

    try {
      setPnrLoading(true);
      const res = await lookupPNR(cleanPnr);
      setPnrResult(res);
      if (res && res.found && res.train_number) {
        setTimeout(() => navigate(`/train/${res.train_number}`), 1000);
      }
    } catch (err) {
      setPnrResult({
        found: false,
        message: err.message || "PNR lookup isn't available yet — please enter your train number manually."
      });
    } finally {
      setPnrLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-between font-sans text-foreground dark:text-slate-100 transition-colors">
      
      {/* Hero Header & Quick Select Section with Staggered Entrance */}
      <motion.section 
        variants={heroContainer}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 w-full space-y-6"
      >
        
        {/* Header Title & Context */}
        <div className="space-y-3 max-w-3xl">
          <motion.div variants={heroItem} className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-navy-subtle dark:bg-blue-950/60 border border-navy-border dark:border-blue-800 text-navy dark:text-blue-300 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-transit-green inline-block animate-pulse"></span>
            <span>{t('portalBadge')}</span>
          </motion.div>

          <motion.h1 variants={heroItem} className="font-bold text-2xl sm:text-3xl lg:text-4xl text-navy dark:text-blue-400 tracking-tight leading-tight">
            {t('heroTitle')}
          </motion.h1>

          <motion.p variants={heroItem} className="text-sm sm:text-base text-muted dark:text-slate-400 leading-relaxed">
            {t('heroSubtitle')}
          </motion.p>

          {/* Quick-Select Flagship Trains */}
          <motion.div variants={heroItem} className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted dark:text-slate-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-navy dark:text-blue-400" />
              <span>Popular Trains:</span>
            </span>
            {[
              { id: '12951', label: '12951 Tejas Rajdhani' },
              { id: '22436', label: '22436 Vande Bharat' },
              { id: '12009', label: '12009 Shatabdi' },
              { id: '12301', label: '12301 Rajdhani' },
              { id: '20608', label: '20608 VB Express' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => handleSelectTrain(pill.id)}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-navy hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-muted dark:text-slate-300 font-medium transition-all duration-150 border border-border dark:border-slate-700 shadow-2xs active:scale-95"
              >
                #{pill.label}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Search & Query Hub Card */}
        <motion.div variants={heroItem} className="p-4 sm:p-5 rounded-xl border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-4">
          
          {/* Query Mode Switcher */}
          <div className="flex items-center justify-between border-b border-border dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSearchMode('train'); setPnrResult(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  searchMode === 'train'
                    ? 'bg-navy dark:bg-blue-600 text-white shadow-xs'
                    : 'text-muted dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Train className="w-3.5 h-3.5" />
                <span>Train Search</span>
              </button>

              <button
                onClick={() => setSearchMode('pnr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  searchMode === 'pnr'
                    ? 'bg-navy dark:bg-blue-600 text-white shadow-xs'
                    : 'text-muted dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PNR Status</span>
              </button>
            </div>

            <div className="text-xs text-muted dark:text-slate-400 hidden sm:block font-medium">
              9,525+ trains covered
            </div>
          </div>

          {/* Mode A: Train Search Input & Presets */}
          {searchMode === 'train' && (
            <div className="space-y-3">
              <div className="relative">
                {searchLoading ? (
                  <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy dark:text-blue-400 animate-spin" />
                ) : (
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted dark:text-slate-400" />
                )}
                
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by train number, name, origin, or destination (e.g. 12951, Mumbai, Vande Bharat)..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground dark:text-slate-400 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Filter Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted dark:text-slate-400 font-medium">Quick Filter:</span>
                {SEARCH_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      if (searchQuery.toLowerCase() === preset.toLowerCase()) {
                        clearSearch();
                      } else {
                        setSearchQuery(preset);
                        runSearch(preset);
                      }
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                      searchQuery.toLowerCase() === preset.toLowerCase()
                        ? 'bg-navy dark:bg-blue-600 text-white border-navy dark:border-blue-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-muted dark:text-slate-300 border-border dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode B: PNR Lookup Input */}
          {searchMode === 'pnr' && (
            <form onSubmit={handlePNRLookup} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted dark:text-slate-400" />
                  <input
                    type="text"
                    maxLength={10}
                    value={pnrQuery}
                    onChange={(e) => {
                      setPnrQuery(e.target.value.replace(/\D/g, ''));
                      setPnrResult(null);
                    }}
                    placeholder="Enter 10-digit Indian Railways PNR number..."
                    className="w-full pl-10 pr-16 py-2.5 rounded-lg border border-border dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-blue-500 tracking-wider transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted dark:text-slate-400 font-mono">
                    {pnrQuery.length}/10
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={pnrLoading || pnrQuery.length !== 10}
                  className="px-5 py-2.5 rounded-lg bg-navy dark:bg-blue-600 text-white text-xs font-semibold hover:bg-navy-light dark:hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs shrink-0"
                >
                  {pnrLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Tracking...</span>
                    </>
                  ) : (
                    <>
                      <span>Track PNR</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {/* PNR Feedback Banner */}
              {pnrResult && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    pnrResult.found
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">{pnrResult.found ? 'PNR Located' : 'Notice'}</div>
                    <div>{pnrResult.message}</div>
                  </div>
                </motion.div>
              )}
            </form>
          )}

        </motion.div>

      </motion.section>

      {/* Directory & Results Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full space-y-4">
        
        {/* Sub-header Bar: Tabs, View Toggle, Full Network Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          
          {/* Left: Filter Tabs (All/Featured vs Saved Favorites) */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveDirectoryTab('all')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  activeDirectoryTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-navy dark:text-blue-300 shadow-xs'
                    : 'text-muted dark:text-slate-400 hover:text-foreground'
                }`}
              >
                {isSearchActive 
                  ? `Search Results (${displayedTrains.length})` 
                  : `Popular Trains (${featuredTrains.length})`}
              </button>

              <button
                onClick={() => {
                  if (!isAuthenticated && openLoginModal) {
                    openLoginModal();
                  } else {
                    setActiveDirectoryTab('saved');
                  }
                }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  activeDirectoryTab === 'saved'
                    ? 'bg-white dark:bg-slate-900 text-navy dark:text-blue-300 shadow-xs'
                    : 'text-muted dark:text-slate-400 hover:text-foreground'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Saved Trains ({favorites.length})</span>
              </button>
            </div>

            {/* Scope Badge */}
            {!isSearchActive && activeDirectoryTab !== 'saved' && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-navy dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold hidden md:inline-block">
                Popular Trains ({featuredTrains.length})
              </span>
            )}
          </div>

          {/* Right Controls: Table/Grid Toggle */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-white dark:bg-slate-900 text-navy dark:text-blue-400 shadow-2xs' 
                    : 'text-muted dark:text-slate-400 hover:text-foreground'
                }`}
                title="Table Directory View"
                aria-label="Table View"
              >
                <Table className="w-4 h-4" />
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-900 text-navy dark:text-blue-400 shadow-2xs' 
                    : 'text-muted dark:text-slate-400 hover:text-foreground'
                }`}
                title="Grid Card View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Loading Skeletons */}
        {(initialLoading || searchLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="p-5 rounded-xl border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!initialLoading && !searchLoading && displayedTrains.length === 0 && (
          <div className="p-12 text-center rounded-xl border border-dashed border-border dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <Train className="w-10 h-10 text-muted dark:text-slate-500 mx-auto opacity-60" />
            <p className="text-sm font-semibold text-foreground dark:text-slate-200">
              {activeDirectoryTab === 'saved'
                ? 'No saved favorites found. Star any train to access it here quickly.'
                : `No services matching "${searchQuery}"`}
            </p>
            {activeDirectoryTab === 'saved' ? (
              <button
                onClick={() => setActiveDirectoryTab('all')}
                className="px-4 py-2 rounded-lg bg-navy dark:bg-blue-600 text-white text-xs font-semibold hover:bg-navy-light transition-all"
              >
                Browse Popular Trains
              </button>
            ) : (
              <button
                onClick={clearSearch}
                className="px-4 py-2 rounded-lg border border-border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-all"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}

        {/* View Mode 1: Responsive Card Grid (Modern Inter/Navy) */}
        {!initialLoading && !searchLoading && viewMode === 'grid' && displayedTrains.length > 0 && (
          <motion.div 
            variants={gridContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {displayedTrains.map((train) => (
                <motion.div
                  key={train.train_number}
                  variants={cardVariant}
                  layout
                  onClick={() => handleSelectTrain(train.train_number)}
                  className="group relative p-5 rounded-xl border border-border dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-navy/40 dark:hover:border-blue-500/50 hover:shadow-card-hover transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTrain(train.train_number)}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(train.train_number);
                        }}
                        className="p-1 text-slate-300 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400 transition-colors"
                        title={isFavorite(train.train_number) ? 'Remove Favorite' : 'Save Favorite'}
                        aria-label="Toggle favorite"
                      >
                        <Star className={`w-4 h-4 ${
                          isFavorite(train.train_number) ? 'text-amber-500 fill-amber-500' : ''
                        }`} />
                      </button>

                      <span className="font-mono font-bold text-navy dark:text-blue-400 text-sm">
                        #{train.train_number}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-muted dark:text-slate-300 border border-border dark:border-slate-700">
                        {train.type || 'Express'}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-transit-green dark:text-emerald-400 flex items-center gap-1.5 shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-transit-green opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-transit-green"></span>
                      </span>
                      <span>{t('liveTrack')}</span>
                    </span>
                  </div>

                  {/* Train Name & Zone */}
                  <div className="space-y-0.5">
                    <h2 className="font-bold text-base text-navy dark:text-blue-400 group-hover:text-railway-red dark:group-hover:text-blue-300 transition-colors leading-snug line-clamp-1">
                      {train.name}
                    </h2>
                    <p className="text-xs text-muted dark:text-slate-400">
                      {train.zone || 'Indian Railways'}
                    </p>
                  </div>

                  {/* Route & Distance Card Box */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs transition-colors group-hover:border-slate-300 dark:group-hover:border-slate-600">
                    <div className="flex items-center justify-between font-semibold text-foreground dark:text-slate-200 gap-1">
                      <span className="truncate">{train.origin}</span>
                      <span className="text-navy dark:text-blue-400 font-bold mx-1.5 group-hover:translate-x-0.5 transition-transform shrink-0">→</span>
                      <span className="truncate">{train.destination}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                      <span>{t('departs')} <strong className="text-foreground dark:text-slate-200">{train.scheduled_departure || '17:00'}</strong></span>
                      <span>{t('distance')} <strong className="text-foreground dark:text-slate-200">{train.total_distance_km || 1000} {t('km')}</strong></span>
                    </div>
                  </div>

                  {/* CTA Link Button */}
                  <div className="pt-1 flex items-center justify-between text-xs font-semibold text-navy dark:text-blue-400">
                    <span className="flex items-center gap-1.5 group-hover:text-navy-light dark:group-hover:text-blue-300 transition-colors">
                      <span>{t('viewRouteEta')}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* View Mode 2: Modern Tabular Directory */}
        {!initialLoading && !searchLoading && viewMode === 'table' && displayedTrains.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden"
          >
            <div className="overflow-x-auto w-full">
              <div className="min-w-[680px]">
                
                <div className="grid grid-cols-12 gap-4 py-3 px-5 bg-slate-50 dark:bg-slate-800/80 border-b border-border dark:border-slate-800 text-xs font-semibold text-muted dark:text-slate-400">
                  <div className="col-span-3">{t('trainNumber')}</div>
                  <div className="col-span-4">{t('serviceZone')}</div>
                  <div className="col-span-3">{t('originDestination')}</div>
                  <div className="col-span-2 text-right">{t('action')}</div>
                </div>

                <div className="divide-y divide-border dark:divide-slate-800">
                  <AnimatePresence mode="popLayout">
                    {displayedTrains.map((train, idx) => (
                      <motion.div
                        key={train.train_number}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                        onClick={() => handleSelectTrain(train.train_number)}
                        className="py-3.5 px-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer grid grid-cols-12 gap-3 items-center text-xs group"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleSelectTrain(train.train_number)}
                      >
                        {/* Train Number & Favorite */}
                        <div className="col-span-3 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(train.train_number);
                            }}
                            className="p-1 text-slate-300 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400 transition-colors"
                            aria-label="Toggle favorite"
                          >
                            <Star className={`w-3.5 h-3.5 ${
                              isFavorite(train.train_number) ? 'text-amber-500 fill-amber-500' : ''
                            }`} />
                          </button>

                          <span className="font-mono font-bold text-navy dark:text-blue-400 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                            #{train.train_number}
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-muted dark:text-slate-300 border border-border dark:border-slate-700 hidden sm:inline-block">
                            {train.type || 'Express'}
                          </span>
                        </div>

                        {/* Train Name & Zone */}
                        <div className="col-span-4">
                          <div className="font-semibold text-foreground dark:text-slate-200 group-hover:text-navy dark:group-hover:text-blue-300 transition-colors truncate">
                            {train.name}
                          </div>
                          <div className="text-[11px] text-muted dark:text-slate-400 truncate">
                            {train.zone} • {train.type}
                          </div>
                        </div>

                        {/* Route Info */}
                        <div className="col-span-3 text-xs text-muted dark:text-slate-400">
                          <div className="flex items-center gap-1 text-foreground dark:text-slate-200 font-medium truncate">
                            <span>{train.origin}</span>
                            <span className="text-navy dark:text-blue-400 font-bold mx-1">→</span>
                            <span>{train.destination}</span>
                          </div>
                          {train.total_distance_km && (
                            <div className="text-muted dark:text-slate-400 text-[11px]">
                              {train.total_distance_km} {t('km')} • Dep: {train.scheduled_departure || '17:00'}
                            </div>
                          )}
                        </div>

                        {/* Action Link */}
                        <div className="col-span-2 flex items-center justify-end">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-navy dark:bg-blue-600 text-white text-xs font-semibold hover:bg-navy-light dark:hover:bg-blue-500 transition-all shadow-xs group-hover:shadow-sm">
                            <span>{t('track')}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>

                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </section>

    </div>
  );
}
