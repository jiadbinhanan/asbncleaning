'use client';
import { Search, Bell, UserCircle, Menu } from 'lucide-react';

interface TopNavProps {
  onMenuClick: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      
      {/* Left Side: Mobile Menu Button & Search */}
      <div className="flex items-center gap-4">
        {/* Hamburger Menu (Mobile Only) */}
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu size={24} />
        </button>

        {/* Search Bar (Hidden on small mobile) */}
        <div className="relative w-full max-w-xs hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">
        <button className="p-2 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-blue-600 relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-1 cursor-pointer">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
            <UserCircle size={24} />
          </div>
          <div className="hidden md:block text-sm">
             <p className="font-bold text-gray-800">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
