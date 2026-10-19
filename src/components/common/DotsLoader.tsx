'use client';
import React from 'react';

export type DotsLoaderVariant = 'white' | 'primary' | 'emerald' | 'amber' | 'slate' | 'indigo' | 'dark' | 'warning' | 'danger' | 'secondary' | 'rose' | 'violet';

export interface DotsLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: DotsLoaderVariant;
  label?: string;
  labelPosition?: 'right' | 'bottom';
  className?: string;
}

const sizeMap = {
  xs: 'gap-1.5',
  sm: 'gap-2',
  md: 'gap-2.5',
  lg: 'gap-3',
};

const dotSizeMap = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3.5 h-3.5',
};

const variantColorMap: Record<DotsLoaderVariant, string> = {
  white: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]',
  primary: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]',
  emerald: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
  amber: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
  slate: 'bg-slate-400 dark:bg-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.6)]',
  indigo: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]',
  dark: 'bg-gray-900 dark:bg-black shadow-[0_0_8px_rgba(0,0,0,0.6)]',
  warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
  danger: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
  secondary: 'bg-gray-600 dark:bg-gray-400 shadow-[0_0_8px_rgba(75,85,99,0.6)]',
  rose: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
  violet: 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]',
};

const textSizeMap = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-sm font-semibold',
  lg: 'text-base font-semibold',
};

export default function DotsLoader({
  size = 'sm',
  variant = 'white',
  label,
  labelPosition = 'right',
  className = '',
}: DotsLoaderProps) {
  const dotColor = variantColorMap[variant] || variantColorMap.white;
  const dotSize = dotSizeMap[size] || dotSizeMap.sm;

  const dots = (
    <div className={`inline-flex items-center ${sizeMap[size] || sizeMap.sm}`}>
      <span className={`inline-block rounded-full ${dotSize} ${dotColor} animate-dot-1 origin-center`} />
      <span className={`inline-block rounded-full ${dotSize} ${dotColor} animate-dot-2 origin-center`} />
      <span className={`inline-block rounded-full ${dotSize} ${dotColor} animate-dot-3 origin-center`} />
    </div>
  );

  if (!label) {
    return <div className={`inline-flex items-center justify-center ${className}`}>{dots}</div>;
  }

  const isBottom = labelPosition === 'bottom';

  return (
    <div
      className={`inline-flex items-center justify-center ${
        isBottom ? 'flex-col gap-2' : 'gap-2.5'
      } ${className}`}
    >
      {dots}
      <span className={`font-semibold tracking-wide ${textSizeMap[size] || 'text-xs'} opacity-90`}>
        {label}
      </span>
    </div>
  );
}
