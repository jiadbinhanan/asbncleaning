import { create } from 'zustand';

// ১. টাইপ ডিফাইন করা (TypeScript এর জন্য)
// আমাদের স্টোরে কী কী জিনিস থাকবে তার একটা লিস্ট
interface ModalState {
  // টিমস মোডাল
  isTeamsModalOpen: boolean;
  openTeamsModal: () => void;
  closeTeamsModal: () => void;
  
  // বুকিংস মোডাল
  isBookingsModalOpen: boolean;
  openBookingsModal: () => void;
  closeBookingsModal: () => void;

  // কীবোর্ড শর্টকাট চিটশীট মোডাল
  isShortcutHelpOpen: boolean;
  openShortcutHelp: () => void;
  closeShortcutHelp: () => void;
  toggleShortcutHelp: () => void;

  // কমান্ড প্যালেট
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  // সব মোডাল একসাথে বন্ধ করার জন্য একটা ইমার্জেন্সি বাটন!
  closeAllModals: () => void;
}

// ২. স্টোর তৈরি করা
export const useModalStore = create<ModalState>((set) => ({
  // শুরুর অবস্থায় (Initial State) সব মোডাল বন্ধ থাকবে
  isTeamsModalOpen: false,
  isBookingsModalOpen: false,
  isShortcutHelpOpen: false,
  isCommandPaletteOpen: false,

  // টিমস মোডাল কন্ট্রোল
  openTeamsModal: () => set({ isTeamsModalOpen: true }),
  closeTeamsModal: () => set({ isTeamsModalOpen: false }),

  // বুকিংস মোডাল কন্ট্রোল
  openBookingsModal: () => set({ isBookingsModalOpen: true }),
  closeBookingsModal: () => set({ isBookingsModalOpen: false }),

  // কীবোর্ড শর্টকাট মোডাল কন্ট্রোল
  openShortcutHelp: () => set({ isShortcutHelpOpen: true }),
  closeShortcutHelp: () => set({ isShortcutHelpOpen: false }),
  toggleShortcutHelp: () => set((state) => ({ isShortcutHelpOpen: !state.isShortcutHelpOpen })),

  // কমান্ড প্যালেট কন্ট্রোল
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  // সব মোডাল বন্ধ করার লজিক
  closeAllModals: () => set({ 
    isTeamsModalOpen: false, 
    isBookingsModalOpen: false,
    isShortcutHelpOpen: false,
    isCommandPaletteOpen: false,
  }),
}));