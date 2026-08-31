import React from 'react';

export function TrainRowSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-border dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
      <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded hidden md:block"></div>
      <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
    </div>
  );
}

export function TrainCardSkeleton() {
  return (
    <div className="p-5 rounded-lg border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded mt-4"></div>
    </div>
  );
}

export function TrackingHeaderSkeleton() {
  return (
    <div className="p-5 rounded-lg border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card animate-pulse space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          </div>
          <div className="h-8 w-80 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-16 w-32 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-16 w-32 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="rounded-lg border border-border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-5 space-y-4 animate-pulse">
      <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
      {[1, 2, 3, 4, 5, 6].map((idx) => (
        <div key={idx} className="flex items-center justify-between py-3 border-b border-border/60 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700"></div>
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-[450px] lg:h-[620px] rounded-lg border border-border dark:border-slate-800 bg-slate-100 dark:bg-slate-900 animate-pulse flex flex-col items-center justify-center p-6 text-muted font-sans text-xs space-y-3">
      <div className="w-10 h-10 rounded-full border-2 border-navy dark:border-blue-400 border-t-transparent animate-spin"></div>
      <p className="font-semibold text-navy dark:text-blue-400 tracking-wide text-sm">Loading Live Route Map...</p>
      <span className="text-muted dark:text-slate-400 text-xs">Loading station coordinates and route...</span>
    </div>
  );
}




