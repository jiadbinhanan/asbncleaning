'use client';
import { 
  LayoutDashboard, Users, Building2, CalendarCheck, 
  FileText, User, LogOut, X, ChevronLeft, ChevronRight, Contact, ClipboardList
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
  { name: 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
  { name: 'Employees', icon: Contact, path: '/admin/employees' },
  { name: 'Cleaning Teams', icon: Users, path: '/admin/teams' },
  { name: 'Companies', icon: Building2, path: '/admin/companies' },
  { name: 'Checklists', icon: ClipboardList, path: '/admin/checklists' },
  { name: 'Bookings', icon: CalendarCheck, path: '/admin/bookings' },
  { name: 'Quotations', icon: FileText, path: '/admin/quotations' },
  { name: 'Profile', icon: User, path: '/admin/profile' },
];

export default function Sidebar({ 
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
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
              A
            </div>
            {/* Show Text only if NOT collapsed on desktop OR if on Mobile */}
            <span className={`font-bold text-xl text-gray-800 tracking-tight ${isDesktopCollapsed ? 'md:hidden' : 'block'}`}>
              ASBN Admin
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
            className="hidden md:flex w-6 h-6 bg-gray-50 border border-gray-200 rounded-full items-center justify-center text-gray-500 hover:text-blue-600 absolute -right-3 top-7 shadow-sm"
          >
            {isDesktopCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.name} href={item.path} onClick={() => setIsMobileOpen(false)}>
                <div
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer group relative
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    } 
                    ${isDesktopCollapsed ? 'md:justify-center' : ''}
                  `}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                  
                  <span className={`font-medium whitespace-nowrap ${isDesktopCollapsed ? 'md:hidden' : 'block'}`}>
                    {item.name}
                  </span>

                  {/* Desktop Tooltip when collapsed */}
                  {isDesktopCollapsed && (
                    <div className="hidden md:block absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-gray-100">
          <button className={`flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all w-full ${isDesktopCollapsed ? 'md:justify-center' : ''}`}>
            <LogOut size={20} className="flex-shrink-0" />
            <span className={`font-semibold ${isDesktopCollapsed ? 'md:hidden' : 'block'}`}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
