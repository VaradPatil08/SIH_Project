import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for client-side dead reckoning of train coordinates.
 * When a train has real RailRadar telemetry (source === 'railradar'), this calculates
 * projected coordinates every ~1s between the 6s polling ticks using great-circle projection
 * from speed and bearing, without triggering additional API requests.
 */
export function useDeadReckonedPosition(currentPosition) {
  const [projectedPosition, setProjectedPosition] = useState(currentPosition);
  const anchorRef = useRef(null);

  // Update anchor when currentPosition updates (e.g. from 6s polling)
  useEffect(() => {
    if (!currentPosition) {
      setProjectedPosition(null);
      anchorRef.current = null;
      return;
    }

    // Only apply dead reckoning when telemetry is from RailRadar with valid bearing and timestamp
    const isRailRadar = currentPosition.source === 'railradar';
    const hasBearing = currentPosition.bearing_degrees != null && !isNaN(currentPosition.bearing_degrees);
    const hasSpeed = currentPosition.speed_kmh && currentPosition.speed_kmh > 0;
    const syncedTime = currentPosition.synced_at ? new Date(currentPosition.synced_at).getTime() : null;

    if (!isRailRadar || !hasBearing || !hasSpeed || !syncedTime || isNaN(syncedTime)) {
      setProjectedPosition(currentPosition);
      anchorRef.current = null;
      return;
    }

    // Re-anchor if synced_at changed or coordinates changed
    const prevAnchor = anchorRef.current;
    if (!prevAnchor || prevAnchor.syncedAt !== currentPosition.synced_at || prevAnchor.lat !== currentPosition.lat || prevAnchor.lng !== currentPosition.lng) {
      anchorRef.current = {
        lat: currentPosition.lat,
        lng: currentPosition.lng,
        speedKmh: Number(currentPosition.speed_kmh) || 0,
        bearingDegrees: Number(currentPosition.bearing_degrees) || 0,
        syncedAt: currentPosition.synced_at,
        syncedTimestamp: syncedTime,
      };
    }

    setProjectedPosition(currentPosition);
  }, [
    currentPosition?.lat,
    currentPosition?.lng,
    currentPosition?.speed_kmh,
    currentPosition?.bearing_degrees,
    currentPosition?.synced_at,
    currentPosition?.source,
  ]);

  // 1-second dead reckoning interval
  useEffect(() => {
    if (!anchorRef.current) return;

    const interval = setInterval(() => {
      const anchor = anchorRef.current;
      if (!anchor || anchor.speedKmh <= 0) return;

      const now = Date.now();
      const elapsedSeconds = (now - anchor.syncedTimestamp) / 1000;

      // Extrapolate if elapsed is between 0 and 600s (10 min safety cap)
      if (elapsedSeconds > 0 && elapsedSeconds < 600) {
        const R = 6371.0; // Earth radius in km
        const distanceKm = anchor.speedKmh * (elapsedSeconds / 3600.0);
        const delta = distanceKm / R; // Angular distance in radians

        const phi1 = (anchor.lat * Math.PI) / 180;
        const lambda1 = (anchor.lng * Math.PI) / 180;
        const theta = (anchor.bearingDegrees * Math.PI) / 180;

        const sinPhi1 = Math.sin(phi1);
        const cosPhi1 = Math.cos(phi1);
        const sinDelta = Math.sin(delta);
        const cosDelta = Math.cos(delta);

        const phi2 = Math.asin(sinPhi1 * cosDelta + cosPhi1 * sinDelta * Math.cos(theta));
        const lambda2 =
          lambda1 +
          Math.atan2(
            Math.sin(theta) * sinDelta * cosPhi1,
            cosDelta - sinPhi1 * Math.sin(phi2)
          );

        const newLat = (phi2 * 180) / Math.PI;
        const newLng = (lambda2 * 180) / Math.PI;

        setProjectedPosition(prev => ({
          ...prev,
          lat: Number(newLat.toFixed(4)),
          lng: Number(newLng.toFixed(4)),
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return projectedPosition || currentPosition;
}

