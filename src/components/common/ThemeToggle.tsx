'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      className={`relative inline-flex items-center h-8 md:h-9 w-[68px] md:w-[74px] p-1 rounded-full cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-[#0d162d] to-[#1e1b4b] border border-blue-500/35 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6),0_0_15px_rgba(59,130,246,0.15)]'
          : 'bg-gradient-to-r from-amber-100 via-sky-100 to-amber-200 border border-amber-300/70 shadow-[inset_0_2px_4px_rgba(245,158,11,0.15),0_2px_8px_rgba(245,158,11,0.1)]'
      } ${className}`}
    >
      {/* Background ambient stars/clouds */}
      <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden pointer-events-none">
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="dark-bg-stars"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-start pl-2"
            >
              {/* Star dots */}
              <span className="w-1 h-1 rounded-full bg-blue-200/90 shadow-[0_0_4px_#93c5fd] animate-pulse" />
              <span className="w-0.5 h-0.5 rounded-full bg-indigo-200/70 ml-2 -mt-2" />
              <Sparkles size={9} className="text-blue-300/80 ml-1.5 opacity-75" />
            </motion.div>
          ) : (
            <motion.div
              key="light-bg-sun"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-end pr-2"
            >
              {/* Warm daytime clouds / rays */}
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50 mr-1" />
              <span className="text-[10px] font-black text-amber-600/70 tracking-widest uppercase">
                ☼
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The Animated Knob */}
      <motion.div
        layout
        transition={{
          type: 'spring',
          stiffness: 520,
          damping: 28,
        }}
        className={`relative z-10 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shadow-md transition-shadow duration-300 ${
          isDark
            ? 'ml-auto bg-gradient-to-tr from-indigo-600 to-blue-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)]'
            : 'mr-auto bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon-icon"
              initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Moon size={13} className="text-blue-100 fill-blue-100/30" />
            </motion.div>
          ) : (
            <motion.div
              key="sun-icon"
              initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Sun size={14} className="text-amber-900 fill-amber-300" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
}
