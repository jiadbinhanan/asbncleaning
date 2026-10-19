'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useModalStore } from '@/store/modalStore';
import { useTheme } from '@/context/ThemeContext';
import CommandPalette from '@/components/common/CommandPalette';
import ShortcutCheatSheetModal from '@/components/common/ShortcutCheatSheetModal';

export default function GlobalShortcutManager() {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const {
    toggleShortcutHelp,
    closeShortcutHelp,
    toggleCommandPalette,
    closeCommandPalette,
    isShortcutHelpOpen,
    isCommandPaletteOpen,
    isBookingsModalOpen,
    isTeamsModalOpen,
    closeAllModals,
    openBookingsModal,
    openTeamsModal,
  } = useModalStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // 1. ESCAPE: Close topmost open modal
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          e.preventDefault();
          closeCommandPalette();
          return;
        }
        if (isShortcutHelpOpen) {
          e.preventDefault();
          closeShortcutHelp();
          return;
        }
        if (isBookingsModalOpen || isTeamsModalOpen) {
          e.preventDefault();
          closeAllModals();
          return;
        }
      }

      // 2. Ctrl+K or Cmd+K: Open/Toggle Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // 3. Question mark (?) / Shift+/: Open Shortcuts Cheat Sheet (when not typing in an input)
      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleShortcutHelp();
        return;
      }

      // 4. Ctrl+/ or Cmd+/: Alternate shortcut for Cheat Sheet
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleShortcutHelp();
        return;
      }

      // 5. Alt+T: Toggle Dark / Light Theme
      if (e.altKey && (e.key === 't' || e.key === 'T') && !e.shiftKey) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // 6. Alt+Shift+T: Open Teams modal
      if (e.altKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        openTeamsModal();
        return;
      }

      // 7. Alt+Shift+B: Open Bookings modal
      if (e.altKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        openBookingsModal();
        return;
      }

      // 8. Alt + Number: Quick Navigation
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            router.push('/admin/dashboard');
            break;
          case '2':
            e.preventDefault();
            router.push('/admin/bookings');
            break;
          case '3':
            e.preventDefault();
            router.push('/admin/invoices');
            break;
          case '4':
            e.preventDefault();
            router.push('/admin/teams');
            break;
          case '5':
            e.preventDefault();
            router.push('/admin/employees');
            break;
          case '6':
            e.preventDefault();
            router.push('/admin/equipment');
            break;
          case '7':
            e.preventDefault();
            router.push('/admin/expenses');
            break;
          case '8':
            e.preventDefault();
            router.push('/admin/revenue');
            break;
          case '9':
            e.preventDefault();
            router.push('/admin/laundry');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    router,
    toggleTheme,
    toggleShortcutHelp,
    closeShortcutHelp,
    toggleCommandPalette,
    closeCommandPalette,
    isShortcutHelpOpen,
    isCommandPaletteOpen,
    isBookingsModalOpen,
    isTeamsModalOpen,
    closeAllModals,
    openBookingsModal,
    openTeamsModal,
  ]);

  return (
    <>
      <CommandPalette />
      <ShortcutCheatSheetModal />
    </>
  );
}
