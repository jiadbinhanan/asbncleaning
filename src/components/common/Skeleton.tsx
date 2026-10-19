'use client';
import React from 'react';

export interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

// 1. Primitive Skeleton element
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={`bg-slate-200/80 dark:bg-slate-800/80 rounded-xl animate-shimmer ${className}`}
    />
  );
}

// 2. Table Skeleton for table views (Bookings, Invoices, Employees, Teams, etc.)
export function TableSkeleton({
  rows = 6,
  columns,
  cols,
  showHeader = true,
}: {
  rows?: number;
  columns?: number;
  cols?: number;
  showHeader?: boolean;
}) {
  const actualColumns = columns ?? cols ?? 5;
  return (
    <div className="w-full bg-white dark:bg-[#0c1427] rounded-3xl border border-gray-100 dark:border-slate-800/80 p-5 shadow-sm space-y-4 overflow-hidden">
      {showHeader && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl hidden md:block" />
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      )}

      {/* Table Header Row */}
      <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50/80 dark:bg-slate-900/60 rounded-xl">
        {Array.from({ length: actualColumns }).map((_, i) => (
          <div
            key={i}
            className={`h-4 ${
              actualColumns === 5
                ? i === 0
                  ? 'col-span-3'
                  : i === 1
                  ? 'col-span-3'
                  : i === 2
                  ? 'col-span-2'
                  : i === 3
                  ? 'col-span-2'
                  : 'col-span-2'
                : 'col-span-2'
            }`}
          >
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </div>
        ))}
      </div>

      {/* Table Body Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="grid grid-cols-12 gap-3 px-3 py-3.5 items-center border-b border-gray-50 dark:border-slate-800/40 last:border-0 hover:bg-gray-50/40 dark:hover:bg-slate-800/20 rounded-xl transition-colors"
          >
            <div className="col-span-3 flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            </div>
            <div className="col-span-3 space-y-1.5">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/3 rounded-md" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Card Grid Skeleton
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#0c1427] rounded-3xl p-5 border border-gray-100 dark:border-slate-800/80 shadow-sm space-y-4 overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-2xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          <div className="space-y-2 py-2">
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-4/5 rounded-md" />
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-slate-800/60 flex items-center justify-between">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 4. Dashboard Skeleton matching Admin Dashboard layout
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome / Header skeleton */}
      <div className="bg-white dark:bg-[#0c1427] rounded-3xl p-6 border border-gray-100 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-60 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#0c1427] rounded-3xl p-5 border border-gray-100 dark:border-slate-800/80 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-32 rounded-lg" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-3 w-12 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts & Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#0c1427] rounded-3xl p-6 border border-gray-100 dark:border-slate-800/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>

        <div className="bg-white dark:bg-[#0c1427] rounded-3xl p-6 border border-gray-100 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="w-6 h-6 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4 rounded-md" />
                  <Skeleton className="h-2.5 w-1/2 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. General Page Skeleton
export function PageSkeleton({
  titleWidth = 'w-48',
  showStats = false,
  layout = 'table',
}: {
  titleWidth?: string;
  showStats?: boolean;
  layout?: 'table' | 'cards' | 'mixed' | 'form' | 'detail' | 'dashboard';
}) {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className={`h-8 ${titleWidth} rounded-xl`} />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Optional Stats row */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#0c1427] rounded-2xl p-4 border border-gray-100 dark:border-slate-800/80 shadow-sm space-y-2"
            >
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {layout === 'cards' ? (
        <CardGridSkeleton count={6} />
      ) : layout === 'form' ? (
        <FormSkeleton fields={6} />
      ) : layout === 'detail' ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <FormSkeleton fields={4} />
        </div>
      ) : layout === 'dashboard' ? (
        <DashboardSkeleton />
      ) : (
        <TableSkeleton rows={7} />
      )}
    </div>
  );
}

// 6. Form Skeleton
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <div className="pt-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default Skeleton;
