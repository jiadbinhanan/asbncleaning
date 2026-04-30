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

  // সব মোডাল একসাথে বন্ধ করার জন্য একটা ইমার্জেন্সি বাটন!
  closeAllModals: () => void;
}

// ২. স্টোর তৈরি করা
// 'create' ফাংশনটি Zustand থেকে আসে। 
export const useModalStore = create<ModalState>((set) => ({
  // শুরুর অবস্থায় (Initial State) সব মোডাল বন্ধ থাকবে
  isTeamsModalOpen: false,
  isBookingsModalOpen: false,

  // টিমস মোডাল কন্ট্রোল
  openTeamsModal: () => set({ isTeamsModalOpen: true }),
  closeTeamsModal: () => set({ isTeamsModalOpen: false }),

  // বুকিংস মোডাল কন্ট্রোল
  openBookingsModal: () => set({ isBookingsModalOpen: true }),
  closeBookingsModal: () => set({ isBookingsModalOpen: false }),

  // সব মোডাল বন্ধ করার লজিক
  closeAllModals: () => set({ 
    isTeamsModalOpen: false, 
    isBookingsModalOpen: false 
  }),
}));