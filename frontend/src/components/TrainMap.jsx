import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Maximize2, Gauge, Layers, Eye } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { getTrainColor } from '../utils/trainColors';

// Fix standard Leaflet default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Custom Map Controller for pan and bounds fitting.
 * Preserves user's manual zoom/pan across background polling cycles.
 */
function MapController({ bounds, currentPosition, followTrain, routeKey, recenterTrigger, onUserInteracted }) {
  const map = useMap();
  const hasFittedInitialRef = useRef(false);
  const prevRouteKeyRef = useRef(routeKey);

  // Reset fitted state when tracked routes change
  useEffect(() => {
    if (prevRouteKeyRef.current !== routeKey) {
      hasFittedInitialRef.current = false;
      prevRouteKeyRef.current = routeKey;
    }
  }, [routeKey]);

  // Turn off auto-follow if user manually drags/pans the map
  useEffect(() => {
    const handleDrag = () => {
      if (onUserInteracted) onUserInteracted();
    };
    map.on('dragstart', handleDrag);
    return () => {
      map.off('dragstart', handleDrag);
    };
  }, [map, onUserInteracted]);

  // Initial bounds fitting only once per route set load
  useEffect(() => {
    if (bounds && bounds.length > 0 && !hasFittedInitialRef.current) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
      hasFittedInitialRef.current = true;
    }
  }, [bounds, map]);

  // Explicit recenter when user clicks the Recenter button
  useEffect(() => {
    if (recenterTrigger > 0 && bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    }
  }, [recenterTrigger, bounds, map]);

  // Follow focused train movement when followTrain mode is active
  useEffect(() => {
    if (followTrain && currentPosition?.lat && currentPosition?.lng) {
      const targetZoom = map.getZoom() < 8 ? 8.5 : map.getZoom();
      map.flyTo([currentPosition.lat, currentPosition.lng], targetZoom, {
        duration: 1.0,
      });
    }
  }, [currentPosition?.lat, currentPosition?.lng, followTrain, map]);

  return null;
}

/**
 * Creates clean railway station node markers
 */
function createRailwayStationIcon(status, code, colorHex, isDark = false) {
  let dotBg = colorHex || (isDark ? '#3B82F6' : '#17324D');
  let dotBorder = isDark ? '#0F172A' : '#FFFFFF';
  let textColor = isDark ? '#F1F5F9' : '#17324D';
  let labelBg = isDark ? '#1E293B' : '#FFFFFF';
  let labelBorder = isDark ? '#334155' : '#D9DEE5';

  if (status === 'reached') {
    dotBg = '#10B981';
    textColor = isDark ? '#6EE7B7' : '#059669';
  } else if (status === 'delayed') {
    dotBg = '#F59E0B';
    textColor = isDark ? '#FDE68A' : '#D97706';
  }

  return L.divIcon({
    className: 'railway-station-node',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
        <div style="
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background-color: ${dotBg};
          border: 2px solid ${dotBorder};
          box-shadow: 0 1px 3px rgba(0,0,0,0.35);
        "></div>
        <div style="
          margin-top: 2px;
          padding: 1px 3px;
          background: ${labelBg};
          border: 1px solid ${labelBorder};
          border-radius: 3px;
          font-family: 'Inter', sans-serif;
          font-size: 8px;
          font-weight: 700;
          color: ${textColor};
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
          white-space: nowrap;
        ">
          ${code}
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/**
 * Creates live locomotive position marker for a specific train
 */
function createLiveTrainIcon(trainNumber, speed, colorHex, isFocused = false, isDark = false) {
  const bg = colorHex || (isDark ? '#1E3A8A' : '#17324D');
  const border = isFocused ? '#FFFFFF' : (isDark ? '#64748B' : '#CBD2D9');

  return L.divIcon({
    className: 'railway-locomotive-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); z-index: ${isFocused ? 1000 : 500};">
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          background-color: ${bg};
          color: #FFFFFF;
          border: 2px solid ${border};
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.45);
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          transform: scale(${isFocused ? 1.08 : 0.95});
          transition: transform 0.2s ease;
        ">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
          <span>#${trainNumber || 'TRAIN'}</span>
          <span style="font-size: 9px; opacity: 0.9; font-weight: 500;">${speed || 0} km/h</span>
        </div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid ${bg};
        "></div>
      </div>
    `,
    iconSize: [84, 38],
    iconAnchor: [42, 38],
  });
}

export default function TrainMap({ 
  stations = [], 
  currentPosition = null, 
  trainNumber = '', 
  trainName = '',
  onSelectStation = null,
  // Multi-train support props:
  trains = [],
  focusedTrainNumber = null,
  onFocusTrain = null
}) {
  const { theme, t } = useSettings();
  const isDark = theme === 'dark';

  const [followTrain, setFollowTrain] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Normalize trains input: support both unified trains array and single-train legacy props
  const normalizedTrains = useMemo(() => {
    if (Array.isArray(trains) && trains.length > 0) {
      return trains.map((t, idx) => ({
        ...t,
        color: t.color || getTrainColor(idx, isDark),
        isFocused: focusedTrainNumber ? t.trainNumber === focusedTrainNumber : idx === 0
      }));
    }
    // Single train fallback
    return [{
      trainNumber: trainNumber || 'TRAIN',
      trainName: trainName || '',
      stations: stations || [],
      currentPosition: currentPosition || null,
      color: getTrainColor(0, isDark),
      isFocused: true
    }];
  }, [trains, trainNumber, trainName, stations, currentPosition, focusedTrainNumber, isDark]);

  // Find currently focused train
  const focusedTrain = useMemo(() => {
    return normalizedTrains.find(t => t.isFocused) || normalizedTrains[0];
  }, [normalizedTrains]);

  // Combined bounds across all tracked trains
  const { allBounds, defaultCenter, routeKey } = useMemo(() => {
    const coords = [];
    normalizedTrains.forEach(t => {
      (t.stations || []).forEach(stn => {
        if (stn.lat && stn.lng) coords.push([stn.lat, stn.lng]);
      });
      if (t.currentPosition?.lat && t.currentPosition?.lng) {
        coords.push([t.currentPosition.lat, t.currentPosition.lng]);
      }
    });

    const center = coords.length > 0
      ? coords[Math.floor(coords.length / 2)]
      : [22.5, 78.5];

    const key = normalizedTrains.map(t => t.trainNumber).sort().join('-');

    return {
      allBounds: coords.length > 0 ? coords : null,
      defaultCenter: center,
      routeKey: key
    };
  }, [normalizedTrains]);

  return (
    <div className="relative w-full h-[360px] sm:h-[480px] lg:h-[620px] bg-slate-100 dark:bg-slate-900 rounded-lg border border-border dark:border-slate-800 shadow-card overflow-hidden font-sans transition-colors">
      
      {/* Top Left Floating Status Card */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-[1000] flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto max-w-[calc(100%-120px)]">
        {focusedTrain && (
          <div className="px-2.5 sm:px-3 py-1.5 rounded-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-border dark:border-slate-700 shadow-sm text-xs text-foreground dark:text-slate-100 flex items-center gap-1.5 sm:gap-2 font-medium">
            <span 
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
              style={{ backgroundColor: focusedTrain.color.currentHex }}
            />
            <span className="font-bold font-mono" style={{ color: focusedTrain.color.currentHex }}>
              #{focusedTrain.trainNumber}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden xs:inline">|</span>
            <span className="text-muted dark:text-slate-300 text-[11px] truncate max-w-[140px] hidden xs:inline">
              {focusedTrain.trainName || t('routeMap')}
            </span>
          </div>
        )}

        {focusedTrain?.currentPosition?.speed_kmh !== undefined && (
          <div className="hidden sm:flex px-3 py-1.5 rounded-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-border dark:border-slate-700 shadow-sm text-xs text-foreground dark:text-slate-100 items-center gap-1.5 font-sans">
            <Gauge className="w-3.5 h-3.5 text-navy dark:text-blue-400" />
            <span className="font-bold text-navy dark:text-blue-400">{focusedTrain.currentPosition.speed_kmh}</span>
            <span className="text-muted dark:text-slate-400 text-[11px]">{t('km')}/h</span>
          </div>
        )}
      </div>

      {/* Top Right Controls Overlay */}
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-[1000] flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <button
          onClick={() => setFollowTrain(!followTrain)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-md text-xs font-semibold border shadow-sm transition-all active:scale-95 ${
            followTrain 
              ? 'bg-navy dark:bg-blue-600 text-white border-navy dark:border-blue-500' 
              : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-muted dark:text-slate-300 hover:text-navy dark:hover:text-white border-border dark:border-slate-700'
          }`}
          title={focusedTrain ? `Auto-follow Train #${focusedTrain.trainNumber}` : 'Auto-follow train'}
        >
          <Navigation className={`w-3.5 h-3.5 ${followTrain ? 'fill-white' : ''}`} />
          <span className="hidden xs:inline">{followTrain ? 'Tracking' : 'Follow'}</span>
        </button>

        <button
          onClick={() => {
            setFollowTrain(false);
            setRecenterTrigger(prev => prev + 1);
          }}
          className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-muted dark:text-slate-300 hover:text-navy dark:hover:text-white border border-border dark:border-slate-700 shadow-sm transition-all active:scale-95"
          title={t('recenterRoute')}
          aria-label={t('recenterRoute')}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Multi-Train Color Key Legend (Shown when tracking 2+ trains) */}
      {normalizedTrains.length > 1 && (
        <div className="absolute bottom-3 left-3 z-[1000] w-48 sm:w-56 max-h-36 overflow-y-auto rounded-lg border border-border dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-2 shadow-card space-y-1 text-xs">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-border dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-muted dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-navy dark:text-blue-400" />
              <span>Tracked ({normalizedTrains.length})</span>
            </span>
            <span className="text-[9px] font-normal lowercase">click to focus</span>
          </div>

          <div className="space-y-0.5 pt-0.5">
            {normalizedTrains.map((t) => (
              <button
                key={t.trainNumber}
                type="button"
                onClick={() => onFocusTrain && onFocusTrain(t.trainNumber)}
                className={`w-full flex items-center justify-between gap-1.5 px-1.5 py-1 rounded text-left transition-all ${
                  t.isFocused
                    ? 'bg-slate-100 dark:bg-slate-800 font-semibold shadow-2xs'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: t.color.currentHex }}
                  />
                  <span className="font-mono text-xs text-foreground dark:text-slate-100">
                    #{t.trainNumber}
                  </span>
                  <span className="text-[10px] text-muted dark:text-slate-400 truncate max-w-[90px] hidden sm:inline">
                    {t.trainName}
                  </span>
                </div>
                {t.isFocused && (
                  <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase" style={{ backgroundColor: `${t.color.currentHex}22`, color: t.color.currentHex }}>
                    Focus
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaflet Map with OpenStreetMap / Esri Tiles (No API key / watermark required) */}
      <MapContainer
        center={defaultCenter}
        zoom={6}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          key={isDark ? 'dark-tiles' : 'light-tiles'}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            isDark
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          maxZoom={18}
        />

        <MapController 
          bounds={allBounds} 
          currentPosition={focusedTrain?.currentPosition} 
          followTrain={followTrain}
          routeKey={routeKey}
          recenterTrigger={recenterTrigger}
          onUserInteracted={() => setFollowTrain(false)}
        />

        {/* Polylines and Markers for Each Tracked Train */}
        {normalizedTrains.map((train) => {
          const stns = train.stations || [];
          const completed = [];
          const upcoming = [];
          let passedCurrent = false;

          stns.forEach((stn) => {
            if (stn.lat && stn.lng) {
              if (stn.status === 'reached') {
                completed.push([stn.lat, stn.lng]);
              } else {
                if (!passedCurrent && completed.length > 0) {
                  completed.push([stn.lat, stn.lng]);
                }
                upcoming.push([stn.lat, stn.lng]);
                passedCurrent = true;
              }
            }
          });

          const colorHex = train.color.currentHex;
          const isFocused = train.isFocused;

          return (
            <React.Fragment key={train.trainNumber}>
              
              {/* Completed Route Segment */}
              {completed.length > 1 && (
                <Polyline
                  positions={completed}
                  pathOptions={{
                    color: colorHex,
                    weight: isFocused ? 5 : 3.5,
                    opacity: isFocused ? 0.95 : 0.75,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

              {/* Upcoming Route Segment */}
              {upcoming.length > 1 && (
                <Polyline
                  positions={upcoming}
                  pathOptions={{
                    color: colorHex,
                    weight: isFocused ? 3.5 : 2.5,
                    opacity: isFocused ? 0.7 : 0.45,
                    dashArray: '6, 8',
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

              {/* Station Node Markers */}
              {stns.map((stn, sIdx) => {
                if (!stn.lat || !stn.lng) return null;
                return (
                  <Marker
                    key={`${train.trainNumber}-${stn.code}-${sIdx}`}
                    position={[stn.lat, stn.lng]}
                    icon={createRailwayStationIcon(stn.status, stn.code, colorHex, isDark)}
                  >
                    <Popup>
                      <div className="font-sans text-xs space-y-1.5 text-foreground dark:text-slate-100 min-w-[200px]">
                        <div className="flex items-center justify-between border-b border-border dark:border-slate-700 pb-1">
                          <span className="font-bold text-xs" style={{ color: colorHex }}>
                            #{train.trainNumber} — {stn.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-muted dark:text-slate-300 font-bold text-[10px]">
                            {stn.code}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted dark:text-slate-400 pt-0.5">
                          <div>{t('distance')} <span className="text-foreground dark:text-slate-200 font-semibold">{stn.distance_km || 0} {t('km')}</span></div>
                          <div>Status: <span className={stn.status === 'delayed' ? 'text-transit-orange font-semibold' : stn.status === 'reached' ? 'text-transit-green font-semibold' : 'font-medium'}>{stn.status === 'reached' ? 'Departed' : stn.status === 'delayed' ? 'Delayed' : 'Upcoming'}</span></div>
                          <div>{t('scheduled')} <span className="text-foreground dark:text-slate-200 font-medium">+{stn.scheduled_offset_min}m</span></div>
                          <div>Delay: <span className={stn.predicted_delay_min > 2 ? 'text-transit-red dark:text-red-400 font-semibold' : 'text-transit-green dark:text-emerald-400 font-semibold'}>+{stn.predicted_delay_min || 0}m</span></div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Live Locomotive Marker */}
              {train.currentPosition?.lat && train.currentPosition?.lng && (
                <Marker
                  position={[train.currentPosition.lat, train.currentPosition.lng]}
                  icon={createLiveTrainIcon(train.trainNumber, train.currentPosition.speed_kmh, colorHex, isFocused, isDark)}
                  zIndexOffset={isFocused ? 1000 : 500}
                >
                  <Popup autoPan={false}>
                    <div className="font-sans text-xs space-y-1.5 min-w-[220px] text-foreground dark:text-slate-100">
                      <div className="flex items-center justify-between border-b border-border dark:border-slate-700 pb-1">
                        <span className="font-bold text-xs" style={{ color: colorHex }}>
                          #{train.trainNumber} {train.trainName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-transit-green-light dark:bg-emerald-950 text-transit-green dark:text-emerald-400 font-bold">
                          {t('liveTrack')}
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] text-muted dark:text-slate-400">
                        <div className="flex justify-between">
                          <span>{t('currentSpeed')}:</span>
                          <span className="font-bold" style={{ color: colorHex }}>
                            {train.currentPosition.speed_kmh || 0} {t('km')}/h
                          </span>
                        </div>
                        {train.currentPosition.next_station_name && (
                          <div className="flex justify-between">
                            <span>{t('nextStation')}:</span>
                            <span className="font-semibold text-foreground dark:text-slate-200">
                              {train.currentPosition.next_station_name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="pt-1 border-t border-border dark:border-slate-700 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onFocusTrain && onFocusTrain(train.trainNumber)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold text-navy dark:text-blue-400 hover:underline"
                        >
                          Focus Timeline & Metrics
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
