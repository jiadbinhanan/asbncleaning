'use client';
import { useEffect, useRef } from 'react';

export type ShortcutCategory = 'Navigation' | 'Actions' | 'Modals' | 'General' | 'Filters' | 'Views' | string;

export interface ShortcutDefinition {
  key?: string;
  combo?: string;
  ctrlKey?: boolean;
  ctrl?: boolean;
  metaKey?: boolean;
  meta?: boolean;
  altKey?: boolean;
  alt?: boolean;
  shiftKey?: boolean;
  shift?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  action?: () => void;
  handler?: () => void;
  description?: string;
  category?: ShortcutCategory;
  preventDefault?: boolean;
  allowInInputs?: boolean;
  enabled?: boolean;
}

// Global shortcut registry for the cheat sheet
export interface RegisteredShortcutInfo {
  id: string;
  keyLabel: string[];
  description: string;
  category: ShortcutCategory;
}

const globalRegistry = new Map<string, RegisteredShortcutInfo>();
const listeners = new Set<() => void>();

export function getRegisteredShortcuts(): RegisteredShortcutInfo[] {
  return Array.from(globalRegistry.values());
}

export function subscribeToShortcutRegistry(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyRegistry() {
  listeners.forEach((cb) => cb());
}

// Pre-populate core standard shortcuts so the cheat sheet is always rich and complete!
const coreShortcuts: RegisteredShortcutInfo[] = [
  { id: 'core-shortcuts-help', keyLabel: ['?'], description: 'Open Keyboard Shortcuts Cheat Sheet', category: 'General' },
  { id: 'core-command-palette', keyLabel: ['Ctrl', 'K'], description: 'Open Universal Command Palette', category: 'General' },
  { id: 'core-theme-toggle', keyLabel: ['Alt', 'T'], description: 'Toggle Dark / Light Mode', category: 'General' },
  { id: 'core-esc-close', keyLabel: ['Esc'], description: 'Close any active modal, drawer, or dropdown', category: 'Modals' },
  { id: 'core-nav-dashboard', keyLabel: ['Alt', '1'], description: 'Go to Admin Dashboard', category: 'Navigation' },
  { id: 'core-nav-bookings', keyLabel: ['Alt', '2'], description: 'Go to Bookings Management', category: 'Navigation' },
  { id: 'core-nav-invoices', keyLabel: ['Alt', '3'], description: 'Go to Invoices & POS', category: 'Navigation' },
  { id: 'core-nav-teams', keyLabel: ['Alt', '4'], description: 'Go to Teams & Rosters', category: 'Navigation' },
  { id: 'core-nav-employees', keyLabel: ['Alt', '5'], description: 'Go to Staff & Employees', category: 'Navigation' },
  { id: 'core-nav-equipment', keyLabel: ['Alt', '6'], description: 'Go to Equipment & Inventory', category: 'Navigation' },
  { id: 'core-nav-expenses', keyLabel: ['Alt', '7'], description: 'Go to Expenses Tracker', category: 'Navigation' },
  { id: 'core-nav-revenue', keyLabel: ['Alt', '8'], description: 'Go to Revenue & Analytics', category: 'Navigation' },
  { id: 'core-nav-laundry', keyLabel: ['Alt', '9'], description: 'Go to Laundry Management', category: 'Navigation' },
  { id: 'core-action-new', keyLabel: ['Alt', 'N'], description: 'Create New Entry (Booking, Invoice, Item, etc.)', category: 'Actions' },
  { id: 'core-action-search', keyLabel: ['/'], description: 'Focus Page Search Box', category: 'Actions' },
  { id: 'core-action-refresh', keyLabel: ['Alt', 'R'], description: 'Refresh Data / Tables', category: 'Actions' },
  { id: 'core-action-export', keyLabel: ['Alt', 'E'], description: 'Export Records / Generate Report', category: 'Actions' },
  { id: 'core-action-save', keyLabel: ['Ctrl', 'Enter'], description: 'Submit Form / Save Changes', category: 'Actions' },
  { id: 'core-modal-teams', keyLabel: ['Alt', 'Shift', 'T'], description: 'Quick Open Teams Manager Modal', category: 'Modals' },
  { id: 'core-modal-bookings', keyLabel: ['Alt', 'Shift', 'B'], description: 'Quick Open Bookings Manager Modal', category: 'Modals' },
];

coreShortcuts.forEach((item) => globalRegistry.set(item.id, item));

function normalizeShortcut(s: ShortcutDefinition) {
  let key = s.key || '';
  let ctrl = s.ctrlKey ?? s.ctrl ?? false;
  let meta = s.metaKey ?? s.meta ?? false;
  let alt = s.altKey ?? s.alt ?? false;
  let shift = s.shiftKey ?? s.shift ?? false;

  if (s.combo) {
    const parts = s.combo.split('+').map((p) => p.trim());
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === 'ctrl') ctrl = true;
      else if (lower === 'cmd' || lower === 'meta') meta = true;
      else if (lower === 'alt' || lower === 'option') alt = true;
      else if (lower === 'shift') shift = true;
      else key = part;
    }
  }

  const handler = s.onKeyDown || s.action || s.handler || (() => {});

  return {
    key,
    ctrl,
    meta,
    alt,
    shift: s.shiftKey !== undefined || s.shift !== undefined ? shift : undefined,
    handler,
    description: s.description,
    category: s.category || 'Actions',
    preventDefault: s.preventDefault,
    allowInInputs: s.allowInInputs,
    enabled: s.enabled,
  };
}

export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    // Register shortcuts with descriptions into registry
    const registeredIds: string[] = [];
    shortcuts.forEach((rawS, idx) => {
      const s = normalizeShortcut(rawS);
      if (s.description && s.key) {
        const id = `${s.key}-${s.ctrl ? 'ctrl-' : ''}${s.alt ? 'alt-' : ''}${s.shift ? 'shift-' : ''}${idx}`;
        const keyLabel: string[] = [];
        if (s.ctrl || s.meta) keyLabel.push('Ctrl');
        if (s.alt) keyLabel.push('Alt');
        if (s.shift) keyLabel.push('Shift');
        keyLabel.push(s.key.toUpperCase());

        globalRegistry.set(id, {
          id,
          keyLabel,
          description: s.description,
          category: s.category as any,
        });
        registeredIds.push(id);
      }
    });

    if (registeredIds.length > 0) notifyRegistry();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      for (const rawShortcut of shortcutsRef.current) {
        const shortcut = normalizeShortcut(rawShortcut);
        if (shortcut.enabled === false) continue;
        if (!shortcut.key) continue;

        const matchKey =
          e.key.toLowerCase() === shortcut.key.toLowerCase() ||
          e.code.toLowerCase() === shortcut.key.toLowerCase();

        const matchCtrl = (shortcut.ctrl || shortcut.meta) === (e.ctrlKey || e.metaKey);
        const matchAlt = shortcut.alt === e.altKey;
        const matchShift = shortcut.shift === undefined || shortcut.shift === e.shiftKey;

        if (matchKey && matchCtrl && matchAlt && matchShift) {
          // Check if we are in an input field
          const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
          const isEsc = e.key === 'Escape';

          if (isInput && !shortcut.allowInInputs && !hasModifier && !isEsc) {
            continue; // Skip single key shortcuts while typing in inputs
          }

          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }

          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      registeredIds.forEach((id) => globalRegistry.delete(id));
      if (registeredIds.length > 0) notifyRegistry();
    };
  }, [shortcuts]);
}
