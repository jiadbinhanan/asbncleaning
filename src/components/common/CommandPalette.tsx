'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Calendar,
  Receipt,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  WashingMachine,
  Layers,
  Moon,
  Sun,
  Keyboard,
  FileText,
  User,
  ArrowRight,
} from 'lucide-react';
import { useModalStore } from '@/store/modalStore';
import { useTheme } from '@/context/ThemeContext';
import Kbd from '@/components/common/Kbd';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  category: 'Navigation' | 'Actions' | 'Preferences';
  shortcut?: string[];
  action: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    openShortcutHelp,
    openBookingsModal,
    openTeamsModal,
  } = useModalStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        subtitle: 'Overview of business performance and live metrics',
        icon: LayoutDashboard,
        category: 'Navigation',
        shortcut: ['Alt', '1'],
        action: () => router.push('/admin/dashboard'),
      },
      {
        id: 'nav-bookings',
        title: 'Bookings Management',
        subtitle: 'Schedule, calendar, customer units, and duties',
        icon: Calendar,
        category: 'Navigation',
        shortcut: ['Alt', '2'],
        action: () => router.push('/admin/bookings'),
      },
      {
        id: 'nav-invoices',
        title: 'Invoices & POS',
        subtitle: 'Generate customer invoices and Instant POS tickets',
        icon: Receipt,
        category: 'Navigation',
        shortcut: ['Alt', '3'],
        action: () => router.push('/admin/invoices'),
      },
      {
        id: 'nav-teams',
        title: 'Teams & Rosters',
        subtitle: 'Manage duty rosters, assignments, and supervisor teams',
        icon: Users,
        category: 'Navigation',
        shortcut: ['Alt', '4'],
        action: () => router.push('/admin/teams'),
      },
      {
        id: 'nav-employees',
        title: 'Employees & Staff',
        subtitle: 'Staff directories, roles, documents, and profiles',
        icon: Briefcase,
        category: 'Navigation',
        shortcut: ['Alt', '5'],
        action: () => router.push('/admin/employees'),
      },
      {
        id: 'nav-equipment',
        title: 'Equipment & Inventory',
        subtitle: 'Track returnable machines, vacuums, and cleaning items',
        icon: Layers,
        category: 'Navigation',
        shortcut: ['Alt', '6'],
        action: () => router.push('/admin/equipment'),
      },
      {
        id: 'nav-expenses',
        title: 'Expenses Tracker',
        subtitle: 'Daily operational expenses and fixed overheads',
        icon: DollarSign,
        category: 'Navigation',
        shortcut: ['Alt', '7'],
        action: () => router.push('/admin/expenses'),
      },
      {
        id: 'nav-revenue',
        title: 'Revenue Analytics',
        subtitle: 'Financial breakdowns, payment types, and revenue trends',
        icon: TrendingUp,
        category: 'Navigation',
        shortcut: ['Alt', '8'],
        action: () => router.push('/admin/revenue'),
      },
      {
        id: 'nav-laundry',
        title: 'Laundry Tracker',
        subtitle: 'Track laundry batches, bags, and return statuses',
        icon: WashingMachine,
        category: 'Navigation',
        shortcut: ['Alt', '9'],
        action: () => router.push('/admin/laundry'),
      },
      {
        id: 'nav-quotations',
        title: 'Quotations & Templates',
        subtitle: 'Build proposals, price estimates, and custom templates',
        icon: FileText,
        category: 'Navigation',
        shortcut: ['Alt', 'Q'],
        action: () => router.push('/admin/quotations'),
      },
      {
        id: 'nav-profile',
        title: 'My Profile & Settings',
        subtitle: 'Admin profile, account security, and company info',
        icon: User,
        category: 'Navigation',
        shortcut: ['Alt', 'P'],
        action: () => router.push('/admin/profile'),
      },
      {
        id: 'action-quick-booking',
        title: 'Quick Bookings Manager',
        subtitle: 'Open instant bookings management drawer',
        icon: Calendar,
        category: 'Actions',
        shortcut: ['Alt', 'Shift', 'B'],
        action: () => openBookingsModal(),
      },
      {
        id: 'action-quick-teams',
        title: 'Quick Teams Manager',
        subtitle: 'Open instant team management drawer',
        icon: Users,
        category: 'Actions',
        shortcut: ['Alt', 'Shift', 'T'],
        action: () => openTeamsModal(),
      },
      {
        id: 'pref-theme',
        title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle between dark obsidian and crisp light theme',
        icon: theme === 'dark' ? Sun : Moon,
        category: 'Preferences',
        shortcut: ['Alt', 'T'],
        action: () => toggleTheme(),
      },
      {
        id: 'pref-shortcuts',
        title: 'Keyboard Shortcuts Cheat Sheet',
        subtitle: 'View comprehensive list of all system hotkeys',
        icon: Keyboard,
        category: 'Preferences',
        shortcut: ['?'],
        action: () => openShortcutHelp(),
      },
    ],
    [router, theme, toggleTheme, openShortcutHelp, openBookingsModal, openTeamsModal]
  );

  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(lower)) ||
        c.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation within the command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        closeCommandPalette();
        selected.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
    }
  };

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 sm:px-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCommandPalette}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Palette Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
          >
            {/* Input Bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/50">
              <Search size={20} className="text-blue-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search pages... (e.g. Bookings, POS, Dark Mode)"
                className="w-full bg-transparent text-sm sm:text-base outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 font-medium"
                autoFocus
              />
              <Kbd size="xs" variant="outline" keys={['Esc']} />
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              className="max-h-[380px] overflow-y-auto p-3 space-y-1 scrollbar-thin"
            >
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-slate-500">
                  <p className="text-sm font-semibold">No commands matching &quot;{query}&quot;</p>
                </div>
              ) : (
                filteredCommands.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        closeCommandPalette();
                        item.action();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-2xl cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800/60 text-gray-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate leading-snug">{item.title}</p>
                          {item.subtitle && (
                            <p
                              className={`text-xs truncate ${
                                isSelected
                                  ? 'text-white/80'
                                  : 'text-gray-400 dark:text-slate-500'
                              }`}
                            >
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {item.shortcut && (
                          <Kbd
                            keys={item.shortcut}
                            size="xs"
                            variant={isSelected ? 'dark' : 'default'}
                          />
                        )}
                        <ArrowRight
                          size={14}
                          className={`transition-transform ${
                            isSelected ? 'translate-x-0.5 text-white' : 'opacity-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Bar */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800/80 bg-gray-50/50 dark:bg-slate-900/40 flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Kbd size="xs" variant="subtle" keys={['↑', '↓']} /> to navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <Kbd size="xs" variant="subtle" keys={['↵']} /> to select
                </span>
                <span className="inline-flex items-center gap-1">
                  <Kbd size="xs" variant="subtle" keys={['Esc']} /> to close
                </span>
              </div>
              <span className="hidden sm:inline font-bold text-blue-600 dark:text-blue-400">
                Command Palette
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
