'use client';
import {
  LayoutDashboard, Calendar, CheckCircle2,
  DollarSign, User, LogOut, X, ChevronLeft, ChevronRight, TrendingUp, Clock
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (value: boolean) => void;
}

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/agent/dashboard', disabled: false },
  { name: 'My Tasks', icon: Calendar, path: '#', disabled: true },
  { name: 'Work History', icon: CheckCircle2, path: '#', disabled: true },
  { name: 'Time Tracking', icon: Clock, path: '#', disabled: true },
  { name: 'Earnings', icon: DollarSign, path: '#', disabled: true },
  { name: 'Performance', icon: TrendingUp, path: '#', disabled: true },
  { name: 'Profile', icon: User, path: '#', disabled: true },
];

export default function AgentSidebar({
  isMobileOpen, setIsMobileOpen,
  isDesktopCollapsed, setIsDesktopCollapsed
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* ---------------- MOBILE OVERLAY (Backdrop) ---------------- */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ---------------- SIDEBAR CONTAINER ---------------- */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out
          ${/* Mobile Logic: Slide in/out */ ''}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}

          ${/* Desktop Logic: Always visible but width changes */ ''}
          md:translate-x-0
          ${isDesktopCollapsed ? 'md:w-20' : 'md:w-72'}
          w-72
        `}
      >
        {/* Header: Logo & Toggle Buttons */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
              A
            </div>
            {/* Show Text only if NOT collapsed on desktop OR if on Mobile */}
            <span className={`font-bold text-xl text-gray-800 tracking-tight ${isDesktopCollapsed ? 'md:hidden' : 'block'}`}>
              Agent Panel
            </span>
          </div>

          {/* Close Button (Mobile Only) */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1 text-gray-500 hover:text-red-500"
          >
            <X size={24} />
          </button>

          {/* Collapse Button (Desktop Only) */}
          <button
            onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            className="hidden md:flex w-6 h-6 bg-gray-50 border border-gray-200 rounded-full items-center justify-center text-gray-500 hover:text-green-600 absolute -right-3 top-7 shadow-sm"
          >
            {isDesktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = !item.disabled && pathname === item.path;
            
            const MenuItemContent = (
              <div
                className={`flex items-center gap-4 p-3 rounded-xl transition-all group relative
                  ${isDesktopCollapsed ? 'md:justify-center' : ''}
                  ${isActive
                    ? 'bg-green-50 text-green-600'
                    : item.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 cursor-pointer'
                  }
                `}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />

                <span className={`font-medium whitespace-nowrap ${isDesktopCollapsed ? 'md:hidden' : 'block'}`}>
                  {item.name}
                </span>
                
                {/* Desktop Tooltip */}
                {isDesktopCollapsed && (
                  <div className="hidden md:block absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                    {item.disabled ? 'Coming Soon' : item.name}
                  </div>
                )}
                 {/* Tooltip for disabled items when NOT collapsed */}
                 {item.disabled && !isDesktopCollapsed && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                      Coming Soon
                    </div>
                  )}
              </div>
            );

            if (item.disabled) {
              return (
                <div key={item.name}>
                  {MenuItemContent}
                </div>
              );
            }

            return (
              <Link key={item.name} href={item.path} onClick={() => setIsMobileOpen(false)}>
                {MenuItemContent}
              </Link>
            );
          })}
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={async () => {
              const { createClient } = await import('@/utils/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/agent/login';
            }}
            className={`flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all w-full ${isDesktopCollapsed ? 'md:justify-center' : ''}`}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className={`font-semibold ${isDesktopCollapsed ? 'md:hidden' : 'block'}`}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}