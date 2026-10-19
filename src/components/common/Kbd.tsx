'use client';
import React from 'react';

export type KbdVariant = 'default' | 'subtle' | 'outline' | 'dark' | 'glass' | 'primary' | 'warning' | 'success';

export interface KbdProps {
  keys?: string[];
  children?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md';
  variant?: KbdVariant;
  className?: string;
}

const keySymbols: Record<string, string> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: '⌥',
  opt: '⌥',
  shift: '⇧',
  cmd: '⌘',
  command: '⌘',
  enter: '↵',
  return: '↵',
  esc: 'Esc',
  escape: 'Esc',
  backspace: '⌫',
  delete: 'Del',
  tab: '⇥',
  space: 'Space',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  slash: '/',
};

const sizeStyles = {
  xs: 'text-[9px] px-1 py-0.5 min-w-[16px] h-4',
  sm: 'text-[10px] px-1.5 py-0.5 min-w-[20px] h-5',
  md: 'text-xs px-2 py-1 min-w-[24px] h-6',
};

const variantStyles: Record<KbdVariant, string> = {
  default:
    'bg-gray-100 dark:bg-[#11192e] text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700/80 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
  subtle:
    'bg-black/[0.04] dark:bg-white/[0.06] text-gray-600 dark:text-slate-400 border border-transparent',
  outline:
    'bg-transparent text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-700',
  dark:
    'bg-slate-900 text-slate-100 border border-slate-700 shadow-sm',
  glass:
    'bg-white/10 dark:bg-white/10 backdrop-blur-sm text-current border border-white/20 shadow-sm',
  primary:
    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  warning:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  success:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
};

export function KbdKey({
  text,
  size = 'sm',
  variant = 'default',
}: {
  text: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: KbdVariant;
}) {
  const normalized = text.trim().toLowerCase();
  const display = keySymbols[normalized] || text.trim().toUpperCase();

  return (
    <kbd
      className={`inline-flex items-center justify-center font-mono font-bold rounded-md select-none tracking-tight transition-colors ${sizeStyles[size]} ${variantStyles[variant]}`}
    >
      {display}
    </kbd>
  );
}

export default function Kbd({
  keys,
  children,
  size = 'sm',
  variant = 'default',
  className = '',
}: KbdProps) {
  if (children) {
    return (
      <kbd
        className={`inline-flex items-center justify-center font-mono font-bold rounded-md select-none tracking-tight transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      >
        {children}
      </kbd>
    );
  }

  if (!keys || keys.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 select-none ${className}`}>
      {keys.map((k, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">+</span>}
          <KbdKey text={k} size={size} variant={variant} />
        </React.Fragment>
      ))}
    </span>
  );
}
