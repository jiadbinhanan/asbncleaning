'use client';
import {
  LayoutDashboard, Users, Building2, CalendarCheck,
  FileText, User, LogOut, X, ChevronRight, Contact, DollarSign,
  ClipboardList, FileDigit, FileCheck, Package, ClipboardCheck, WashingMachine
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
  isDesktopCollapsed: boolean;
  setIsDesktopCollapsed: (value: boolean) => void;
}

/* ─── Categorized Menu Structure ─── */
const menuCategories = [
  {
    label: 'Main',
    items: [
      { name: 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Work Records', icon: FileCheck, path: '/admin/work-records' },
      { name: 'QC Report', icon: ClipboardCheck, path: '/team/qc-portal?source=admin' },
      { name: 'Laundry Records', icon: WashingMachine, path: '/admin/laundry' },
      { name: 'Bookings', icon: CalendarCheck, path: '/admin/bookings' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Invoices', icon: FileDigit, path: '/admin/invoices' },
      { name: 'Revenue', icon: DollarSign, path: '/admin/revenue' },
      { name: 'Quotations', icon: FileText, path: '/admin/quotations' },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Cleaning Teams', icon: Users, path: '/admin/teams' },
      { name: 'Companies', icon: Building2, path: '/admin/companies' },
      { name: 'Employees', icon: Contact, path: '/admin/employees' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { name: 'Checklists', icon: ClipboardList, path: '/admin/checklists' },
      { name: 'Stock Management', icon: Package, path: '/admin/inventory' },
      { name: 'Equipment Setup', icon: Package, path: '/admin/equipment' },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Profile', icon: User, path: '/admin/profile' },
    ],
  },
];

type MenuItem = { name: string; icon: React.ElementType; path: string };

/* ─── Collapsed Item ─── */
function CollapsedItem({
  item,
  isActive,
  setTooltip,
  onClick
}: {
  item: MenuItem;
  isActive: boolean;
  setTooltip: (val: any) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <Link 
      href={item.path} 
      onClick={onClick}
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
          show: true,
          text: item.name,
          top: rect.top + rect.height / 2,
          left: rect.right + 12 
        });
      }}
      onMouseLeave={() => setTooltip((prev: any) => ({ ...prev, show: false }))}
      className="block w-full py-1 relative z-20"
    >
      <div className="relative group flex items-center justify-center h-[42px] w-[42px] mx-auto">
        {/* Hover Highlight Box */}
        {!isActive && (
          <div className="absolute inset-0 bg-slate-50 border border-slate-200/80 rounded-[14px] opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm" />
        )}

        {/* Active Highlight Box */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 rounded-[14px] bg-gradient-to-br from-blue-50 to-cyan-50/80 border border-blue-200/80 shadow-sm"
          />
        )}

        {/* Cyan Mark on Hover */}
        {!isActive && (
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-[4px] h-5 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        )}

        {/* Active Blue Mark */}
        {isActive && (
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-[4px] h-6 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        )}

        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.15, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={`relative z-10 flex items-center justify-center transition-colors duration-200
            ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-cyan-600'}
          `}
        >
          <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        </motion.div>
      </div>
    </Link>
  );
}

/* ─── Expanded Item (Rich Pop-up & Drop Shadow) ─── */
function ExpandedItem({ item, isActive, onClick }: { item: MenuItem; isActive: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <Link href={item.path} onClick={onClick} className="block w-full">
      <motion.div
        whileHover={!isActive ? { scale: 1.035, y: -2, x: 2 } : {}}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group
          ${isActive ? 'text-blue-600 font-semibold' : 'text-slate-600 font-medium'}
        `}
      >
        {/* Active background */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-r from-blue-50/90 to-cyan-50/40 rounded-xl border border-blue-200/60 shadow-sm"
          />
        )}

        {/* Rich Pop-up Hover effect (non-active) - White bg & Prominent Shadow */}
        {!isActive && (
          <div className="
            absolute inset-0 rounded-xl
            opacity-0 group-hover:opacity-100
            transition-all duration-300 ease-out
            bg-white
            border border-slate-200
            shadow-[0_10px_25px_-5px_rgba(100,116,133,0.25)]
          " />
        )}

        {/* Active left accent bar */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute left-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full shadow-sm"
            />
          )}
        </AnimatePresence>

        {/* Hover Cyan Mark */}
        {!isActive && (
          <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 scale-y-50 group-hover:scale-y-100 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
        )}

        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.15, rotate: -6 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className={`relative z-10 flex-shrink-0 transition-colors duration-150
            ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-cyan-600'}
          `}
        >
          <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        </motion.div>

        {/* Label */}
        <span className="relative z-10 text-[13.5px] whitespace-nowrap tracking-wide group-hover:text-slate-800 transition-colors duration-150">
          {item.name}
        </span>

        {/* Active dot */}
        {isActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-300"
          />
        )}

        {/* Hover arrow */}
        {!isActive && (
          <ChevronRight
            size={14}
            className="relative z-10 ml-auto text-slate-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
          />
        )}
      </motion.div>
    </Link>
  );
}

/* ─── Glowing Category Divider ─── */
function CategoryLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-6 h-[2px] bg-gradient-to-r from-blue-400/60 to-cyan-400/60 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-3 pt-6 pb-2.5 select-none relative">
      {/* Glowing Dot */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-3 h-3 bg-cyan-400/40 rounded-full blur-[3px]" />
        <div className="relative w-1.5 h-1.5 bg-cyan-400 rounded-full" />
      </div>

      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] relative z-10">
        {label}
      </p>

      {/* Glowing Line */}
      <div className="h-[2px] flex-1 bg-gradient-to-r from-blue-400/50 via-cyan-300/30 to-transparent relative z-10 shadow-[0_0_8px_rgba(56,189,248,0.3)] rounded-full" />
    </div>
  );
}

export default function Sidebar({
  isMobileOpen, setIsMobileOpen,
  isDesktopCollapsed, setIsDesktopCollapsed,
}: SidebarProps) {
  const pathname = usePathname();

  const [tooltip, setTooltip] = useState({ show: false, text: '', top: 0, left: 0 });

  return (
    <>
      {/* ── Global Tooltip ── */}
      <AnimatePresence>
        {tooltip.show && isDesktopCollapsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -6 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-[9999] pointer-events-none bg-slate-800 text-white text-[11.5px] tracking-wide font-medium px-3 py-2 rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] flex items-center"
            style={{ top: tooltip.top, left: tooltip.left, transform: 'translateY(-50%)' }}
          >
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-800 rotate-45 rounded-sm" />
            {tooltip.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Overlay ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside
        onClick={() => {
          if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            setIsDesktopCollapsed(!isDesktopCollapsed);
          }
        }}
        // Width configuration: Expanded=210px, Collapsed=64px
        animate={{ width: isDesktopCollapsed ? 64 : 210 }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        className={`
          fixed top-0 left-0 h-screen z-50 flex flex-col
          bg-white/96 backdrop-blur-sm
          border-r border-slate-200/80
          shadow-[4px_0_28px_-4px_rgba(148,163,184,0.15)]
          cursor-pointer
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          w-[210px] md:w-auto
        `}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-200" />

        {/* ── Header ── */}
        <div
          className="h-[68px] flex items-center justify-between px-3 border-b border-slate-100/80 shrink-0 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`flex items-center gap-3 min-w-0 ${isDesktopCollapsed ? 'mx-auto' : ''}`}>
            <motion.div
              whileHover={{ scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex-shrink-0 w-8 h-8 rounded-xl overflow-hidden border border-blue-100/80 shadow-sm bg-white"
            >
              <Image
                src="/logo_btm_invoice.png"
                alt="BTM Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </motion.div>

            <AnimatePresence initial={false}>
              {!isDesktopCollapsed && (
                <motion.p
                  key="brand"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="hidden md:block text-[15px] font-bold text-slate-800 tracking-tight whitespace-nowrap"
                >
                  BTM Admin
                </motion.p>
              )}
            </AnimatePresence>

            <p className="md:hidden text-[15px] font-bold text-slate-800 tracking-tight">BTM Admin</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={19} />
          </motion.button>

          {/* Desktop Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsDesktopCollapsed(!isDesktopCollapsed);
            }}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2
              w-6 h-6 bg-white border border-slate-200 rounded-full
              items-center justify-center text-slate-500
              hover:text-blue-600 hover:border-blue-300
              shadow-sm transition-colors z-10"
          >
            <motion.div
              animate={{ rotate: isDesktopCollapsed ? 0 : 180 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ChevronRight size={13} />
            </motion.div>
          </motion.button>
        </div>

        {/* ── Menu Container ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 custom-scrollbar relative z-10">
          {menuCategories.map((category, catIdx) => (
            <div key={category.label}>
              {catIdx === 0 ? (
                !isDesktopCollapsed && (
                  <div className="hidden md:flex items-center gap-3 px-3 pt-2 pb-2 select-none relative">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-3 h-3 bg-cyan-400/40 rounded-full blur-[3px]" />
                      <div className="relative w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] drop-shadow-sm">
                      {category.label}
                    </p>
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-blue-400/50 via-cyan-300/30 to-transparent shadow-[0_0_8px_rgba(56,189,248,0.3)] rounded-full" />
                  </div>
                )
              ) : (
                <CategoryLabel label={category.label} collapsed={isDesktopCollapsed} />
              )}

              <div className="space-y-1">
                {category.items.map((item, itemIdx) => {
                  const isActive =
                    pathname === item.path ||
                    (item.path !== '/' && pathname.startsWith(item.path.split('?')[0]));

                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: (catIdx * 3 + itemIdx) * 0.025,
                        duration: 0.28,
                        ease: 'easeOut',
                      }}
                    >
                      <div className="hidden md:block">
                        {isDesktopCollapsed ? (
                          <CollapsedItem 
                            item={item} 
                            isActive={isActive} 
                            setTooltip={setTooltip}
                            onClick={(e) => e.stopPropagation()} 
                          />
                        ) : (
                          <ExpandedItem 
                            item={item} 
                            isActive={isActive} 
                            onClick={(e) => e.stopPropagation()} 
                          />
                        )}
                      </div>
                      <div className="md:hidden">
                        <ExpandedItem
                          item={item}
                          isActive={isActive}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMobileOpen(false);
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── Logout Section (Always Red) ── */}
        <div
          className="px-2 pb-4 pt-3 border-t border-slate-100 shrink-0"
          onClick={(e) => e.stopPropagation()} 
        >
          <motion.button
            whileHover={isDesktopCollapsed ? { scale: 1.1 } : { x: 4, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={async () => {
              const { createClient } = await import('@/utils/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/admin/login';
            }}
            className={`
              group relative flex items-center gap-3 w-full rounded-xl
              text-red-600 bg-red-50/80 hover:bg-red-500 hover:text-white
              border border-red-100 hover:border-red-500
              transition-all duration-300 ease-out shadow-sm hover:shadow-lg hover:shadow-red-500/30
              overflow-hidden
              ${isDesktopCollapsed ? 'justify-center h-[42px] w-[42px] mx-auto px-0 rounded-[14px]' : 'px-3 py-2.5'}
            `}
          >
            <motion.div
              whileHover={{ rotate: -18, scale: 1.18 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="relative z-10 flex-shrink-0"
            >
              <LogOut size={18} strokeWidth={2.2} />
            </motion.div>
            <AnimatePresence initial={false}>
              {!isDesktopCollapsed && (
                <motion.span
                  key="logout-label"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="hidden md:block relative z-10 text-[13px] font-bold tracking-wide"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
            <span className="md:hidden relative z-10 text-[13px] font-bold tracking-wide">Logout</span>
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}