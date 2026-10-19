'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Search, Navigation, Zap, Layers, Command } from 'lucide-react';
import { useModalStore } from '@/store/modalStore';
import Kbd from '@/components/common/Kbd';
import {
  getRegisteredShortcuts,
  subscribeToShortcutRegistry,
  RegisteredShortcutInfo,
} from '@/hooks/useKeyboardShortcuts';

export default function ShortcutCheatSheetModal() {
  const { isShortcutHelpOpen, closeShortcutHelp } = useModalStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [shortcuts, setShortcuts] = useState<RegisteredShortcutInfo[]>(getRegisteredShortcuts());

  useEffect(() => {
    return subscribeToShortcutRegistry(() => {
      setShortcuts(getRegisteredShortcuts());
    });
  }, []);

  // Listen for Escape to close
  useEffect(() => {
    if (!isShortcutHelpOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeShortcutHelp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutHelpOpen, closeShortcutHelp]);

  const categories = [
    { id: 'all', label: 'All Shortcuts', icon: Command },
    { id: 'General', label: 'System & Global', icon: Keyboard },
    { id: 'Navigation', label: 'Quick Navigation', icon: Navigation },
    { id: 'Actions', label: 'Page Actions', icon: Zap },
    { id: 'Modals', label: 'Modals & Dialogs', icon: Layers },
  ];

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((sc) => {
      const matchCat = activeCategory === 'all' || sc.category === activeCategory;
      const matchSearch =
        searchTerm === '' ||
        sc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sc.keyLabel.join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [shortcuts, activeCategory, searchTerm]);

  return (
    <AnimatePresence>
      {isShortcutHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeShortcutHelp}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Keyboard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Keyboard Shortcuts & Hotkeys
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Use quick keystrokes across every page for high-speed productivity
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Kbd size="xs" variant="outline" keys={['Esc']} />
                <button
                  onClick={closeShortcutHelp}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="p-5 border-b border-gray-100 dark:border-slate-800/80 space-y-3 bg-white dark:bg-[#0c1427]">
              {/* Search bar */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Search shortcuts by action or key..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#11192e] border border-gray-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-all"
                  autoFocus
                />
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-slate-800/60 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon size={13} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shortcuts List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5 max-h-[50vh]">
              {filteredShortcuts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                  <Keyboard size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No keyboard shortcuts found matching your search.</p>
                </div>
              ) : (
                filteredShortcuts.map((sc) => (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-slate-900/50 hover:bg-blue-50/60 dark:hover:bg-slate-800/60 border border-gray-100/80 dark:border-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500/60" />
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
                        {sc.description}
                      </span>
                    </div>
                    <Kbd keys={sc.keyLabel} size="sm" variant="default" />
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                Pro-tip: Press <Kbd size="xs" variant="subtle" keys={['?']} /> anywhere to view this cheat sheet!
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {filteredShortcuts.length} Shortcuts Available
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
