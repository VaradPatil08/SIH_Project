/**
 * Formats minute offset from base departure time (e.g., base "17:00" + 35 min -> "17:35")
 */
export function formatOffsetToTime(offsetMin, baseTimeStr = '06:00') {
  if (offsetMin === undefined || offsetMin === null) return '--:--';
  
  const [baseH, baseM] = (baseTimeStr || '06:00').split(':').map(Number);
  const totalMin = (baseH * 60 + baseM + offsetMin) % (24 * 60);
  
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Formats minute duration into "Xh Ym" or "X min"
 */
export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '--';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`;
  }
  return `${mins} min`;
}

/**
 * Formats delay badge label
 */
export function getDelayBadgeInfo(delayMin, status) {
  if (status === 'reached') {
    return {
      text: 'Reached',
      bgClass: 'bg-slate-700/60 text-slate-300 border-slate-600',
      dotColor: '#94A3B8',
      type: 'reached'
    };
  }
  
  if (!delayMin || delayMin <= 2) {
    return {
      text: 'On Time',
      bgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      dotColor: '#10B981',
      type: 'on_time'
    };
  }

  if (delayMin <= 20) {
    return {
      text: `+${delayMin}m Late`,
      bgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      dotColor: '#F59E0B',
      type: 'delayed_minor'
    };
  }

  return {
    text: `+${delayMin}m Late`,
    bgClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dotColor: '#EF4444',
    type: 'delayed_severe'
  };
}

