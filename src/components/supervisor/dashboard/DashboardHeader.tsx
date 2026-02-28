"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, UserCircle, BellRing, ChevronDown, Filter, X, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";

export default function DashboardHeader({ 
  profile, 
  filter, 
  setFilter,
  pendingReviewCount // 🚨 New Prop added for alerts
}: { 
  profile: any, 
  filter: any, 
  setFilter: (val: any) => void,
  pendingReviewCount: number
}) {
  const [greeting, setGreeting] = useState("Welcome");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); // 🚨 Alert Drawer State
  const dropdownRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // 🚨 Auto-expand alert drawer on page load (with a small delay for cool animation)
  useEffect(() => {
    if (pendingReviewCount > 0) {
      const timer = setTimeout(() => setIsAlertOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [pendingReviewCount]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsFilterOpen(false);
      if (alertRef.current && !alertRef.current.contains(event.target as Node)) setIsAlertOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getFilterLabel = () => {
    if (filter.type === 'month') return format(parseISO(`${filter.month}-01`), 'MMMM yyyy');
    if (filter.type === 'date') return format(parseISO(filter.singleDate), 'dd MMM yyyy');
    return `${format(parseISO(filter.startDate), 'dd MMM')} - ${format(parseISO(filter.endDate), 'dd MMM')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A192F] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900 via-[#0A192F] to-indigo-950 rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-blue-900/20 text-white flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative overflow-visible w-full border border-blue-800/50"
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-10 w-64 h-64 bg-teal-500/10 rounded-full blur-[60px] pointer-events-none"></div>

      <div className="flex items-center gap-4 relative z-10 w-full min-w-0">
        <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 shadow-lg bg-white/5 flex items-center justify-center shrink-0 backdrop-blur-md p-1">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
          ) : (
            <UserCircle size={40} className="text-blue-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2 truncate">
            {greeting}, {profile?.full_name?.split(' ')[0] || "Supervisor"}! <span className="text-yellow-400 animate-pulse drop-shadow-md">✨</span>
          </h1>
          <p className="text-blue-200/80 text-sm font-medium mt-1 truncate">Here is your operational overview.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto relative z-20">
        
        {/* Filter Dropdown */}
        <div className="relative flex-1 xl:flex-none" ref={dropdownRef}>
           {/* ... (Filter button code remains identical to previous) ... */}
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full xl:w-auto bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-sm group active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-300 group-hover:text-white transition-colors"><CalendarIcon size={18}/></div>
              <span className="font-bold text-sm tracking-wide">{getFilterLabel()}</span>
            </div>
            <ChevronDown size={16} className={`text-blue-300 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}/>
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-gray-800 p-4"
              >
                {/* ... (Filter menu code remains identical to previous) ... */}
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                  <h3 className="font-black flex items-center gap-2"><Filter size={16} className="text-blue-600"/> Data Filter</h3>
                  <button onClick={() => setIsFilterOpen(false)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                  {['month', 'date', 'range'].map((type) => (
                    <button key={type} onClick={() => setFilter({ ...filter, type })} className={`flex-1 text-xs font-bold py-1.5 rounded-lg capitalize transition-all ${filter.type === type ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>{type}</button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filter.type === 'month' && (
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Select Month</label><input type="month" value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500" /></div>
                  )}
                  {filter.type === 'date' && (
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Select Date</label><input type="date" value={filter.singleDate} onChange={(e) => setFilter({ ...filter, singleDate: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500" /></div>
                  )}
                  {filter.type === 'range' && (
                    <div className="flex gap-2">
                      <div className="flex-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Start Date</label><input type="date" value={filter.startDate} onChange={(e) => setFilter({ ...filter, startDate: e.target.value })} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-blue-500" /></div>
                      <div className="flex-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">End Date</label><input type="date" value={filter.endDate} onChange={(e) => setFilter({ ...filter, endDate: e.target.value })} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-blue-500" /></div>
                    </div>
                  )}
                </div>
                <button onClick={() => setIsFilterOpen(false)} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl transition-colors">Apply Filter</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* 🚨 Notification Bell & Drawer */}
        <div className="relative" ref={alertRef}>
          <button 
            onClick={() => setIsAlertOpen(!isAlertOpen)}
            className="p-3.5 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 rounded-2xl transition-all relative shrink-0 active:scale-95 group"
          >
            <BellRing size={20} className="text-blue-200 group-hover:text-white transition-colors"/>
            {pendingReviewCount > 0 && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0A192F] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            )}
          </button>

          <AnimatePresence>
            {isAlertOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-5 text-gray-800"
              >
                {pendingReviewCount > 0 ? (
                  <div className="space-y-4">
                    <div className="flex gap-3 items-start bg-red-50 p-4 rounded-2xl border border-red-100">
                      <AlertTriangle className="text-red-500 shrink-0 mt-0.5 animate-pulse" size={20}/>
                      <div>
                        <h4 className="font-black text-red-700 text-sm mb-1">Action Needed</h4>
                        <p className="text-xs font-medium text-red-600 leading-relaxed">
                          <span className="font-black text-sm">{pendingReviewCount}</span> completed works are waiting for your final pricing review!
                        </p>
                      </div>
                    </div>
                    <Link href="/supervisor/reviews" className="w-full flex items-center justify-center py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition-colors shadow-sm">
                      Review Now
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BellRing size={20} className="text-gray-400"/>
                    </div>
                    <p className="text-sm font-bold text-gray-800">No new notifications</p>
                    <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
                  </div>
                )}
                
                {/* 🚨 Click here to close message */}
                <button 
                  onClick={() => setIsAlertOpen(false)} 
                  className="w-full mt-4 pt-4 border-t border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Click here to close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}
