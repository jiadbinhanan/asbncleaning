'use client';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, Building2, CalendarCheck, 
  FileText, Settings, LogOut, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { name: 'Overview', icon: LayoutDashboard, path: '/admin' },
  { name: 'Cleaning Teams', icon: Users, path: '/admin/teams' },
  { name: 'Companies', icon: Building2, path: '/admin/companies' },
  { name: 'Bookings', icon: CalendarCheck, path: '/admin/bookings' },
  { name: 'Quotations', icon: FileText, path: '/admin/quotations' },
  { name: 'Settings', icon: Settings, path: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="h-screen w-72 bg-white border-r border-gray-100 flex flex-col p-6 fixed left-0 top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
          A
        </div>
        <span className="font-bold text-xl text-gray-800 tracking-tight">ASBN Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.name} href={item.path}>
              <motion.div
                whileHover={{ x: 5 }}
                className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
                  isActive 
                  ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`font-medium ${isActive ? 'text-blue-700' : ''}`}>
                    {item.name}
                  </span>
                </div>
                {isActive && <ChevronRight size={16} />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button className="mt-auto flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all font-semibold">
        <LogOut size={20} />
        Logout
      </button>
    </div>
  );
}
