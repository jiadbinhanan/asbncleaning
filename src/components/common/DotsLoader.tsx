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
  xs: 'w-1 h-1 gap-1',
  sm: 'w-1.5 h-1.5 gap-1.5',
  md: 'w-2 h-2 gap-2',
  lg: 'w-3 h-3 gap-2.5',
};

const dotSizeMap = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

const variantColorMap: Record<DotsLoaderVariant, string> = {
  white: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]',
  primary: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
  emerald: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
  amber: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
  slate: 'bg-slate-400 dark:bg-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.4)]',
  indigo: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]',
  dark: 'bg-gray-900 dark:bg-black shadow-[0_0_8px_rgba(0,0,0,0.5)]',
  warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
  danger: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
  secondary: 'bg-gray-600 dark:bg-gray-400 shadow-[0_0_8px_rgba(75,85,99,0.4)]',
  rose: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
  violet: 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]',
};

const textSizeMap = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
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
      <span className={`rounded-full ${dotSize} ${dotColor} animate-dot-1`} />
      <span className={`rounded-full ${dotSize} ${dotColor} animate-dot-2`} />
      <span className={`rounded-full ${dotSize} ${dotColor} animate-dot-3`} />
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
