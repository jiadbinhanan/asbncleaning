"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, Zap, Building2, Calendar, Loader2, 
  Clock, CheckCircle2, ShieldAlert, Sparkles, Lock, RotateCcw
} from "lucide-react";
import { format, parseISO, isToday } from "date-fns";

// --- Types ---
type Booking = {
  id: number;
  status: string;
  cleaning_time: string;
  cleaning_date: string;
  service_type: string;
  units?: { unit_number: string; companies?: { name: string } };
  teams?: { team_name: string };
};

export default function ActivationsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  // 1. SINGLE OPTIMIZED API FETCH
  const fetchActivations = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, status, cleaning_time, cleaning_date, service_type,
        units ( unit_number, companies ( name ) ),
        teams ( team_name )
      `)
      .in('status', ['pending', 'active'])
      // API লেভেলে ডেট এবং টাইম অনুযায়ী সর্টিং করে নিচ্ছি
      .order('cleaning_date', { ascending: true })
      .order('cleaning_time', { ascending: true });

    if (!error && data) {
      setBookings(data as any);
    } else if (error) {
      console.error("Error fetching activations:", error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivations();
  }, [supabase]);

  // 2. OPTIMISTIC UI ACTIVATION (Instant Feedback)
  const handleActivate = async (id: number) => {
    setActivatingId(id);

    // Optimistic Update: UI তে সাথে সাথে Active করে দেওয়া
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'active' } : b));

    // Background API Call (1 Update Request)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      alert("Failed to activate. Reverting...");
      // Error হলে আগের স্ট্যাটাসে ফেরত নেওয়া
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'pending' } : b));
    }
    setActivatingId(null);
  };

  // 2.5 OPTIMISTIC UI DEACTIVATION (ভুল ঠিক করার জন্য)
  const handleDeactivate = async (id: number) => {
    setActivatingId(id);
    
    // UI তে সাথে সাথে Pending করে দেওয়া
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'pending' } : b));

    // Background API Call (Update Status)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'pending' })
      .eq('id', id);

    if (error) {
      alert("Failed to undo. Reverting...");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'active' } : b));
    }
    setActivatingId(null);
  };

  // 3. GROUPING & SORTING LOGIC
  const { todayBookings, groupedOtherBookings } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const todayList: Booking[] = [];
    const othersMap: Record<string, Booking[]> = {};

    bookings.forEach(booking => {
      if (booking.cleaning_date === todayStr) {
        todayList.push(booking);
      } else {
        if (!othersMap[booking.cleaning_date]) {
          othersMap[booking.cleaning_date] = [];
        }
        othersMap[booking.cleaning_date].push(booking);
      }
    });

    return { todayBookings: todayList, groupedOtherBookings: othersMap };
  }, [bookings]);

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#F8FAFC]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen bg-[#F8FAFC] font-sans pb-24">
      
      {/* HEADER */}
      <div className="mb-10 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-gradient-to-br from-yellow-100 to-amber-100 text-amber-600 rounded-2xl shadow-inner"><Zap size={28} /></div>
            Morning Activations
          </h1>
          <p className="text-gray-500 font-medium mt-2">Manage and activate daily schedules for the cleaning teams.</p>
        </div>
        <div className="px-6 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 shadow-sm flex items-center gap-2">
          Total Tasks: {bookings.length}
        </div>
      </div>

      <div className="space-y-12">

        {/* --- SECTION 1: TODAY'S HIGHLIGHTED MISSIONS --- */}
        <div>
          <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2 pl-2">
            <Sparkles className="text-blue-600" size={24}/> Today's Schedule
          </h2>
          
          {todayBookings.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border border-gray-100 text-center text-gray-400 shadow-sm">
              <CheckCircle2 size={56} className="mx-auto mb-4 opacity-30 text-green-500"/>
              <p className="text-xl font-black text-gray-800 mb-1">No tasks for today!</p>
              <p className="text-sm">You are all caught up for today's schedule.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              <AnimatePresence>
                {todayBookings.map((booking) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    key={booking.id} 
                    className={`p-6 md:p-8 rounded-[2rem] transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group ${
                      booking.status === 'active' 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 shadow-md' 
                        : 'bg-white border border-gray-200 shadow-xl shadow-gray-200/40'
                    }`}
                  >
                    {/* Glowing background for pending tasks */}
                    {booking.status === 'pending' && <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-50 rounded-full blur-3xl pointer-events-none"></div>}

                    <div className="relative z-10 w-full md:w-auto">
                      <div className="flex items-center gap-3 mb-3">
                        {booking.status === 'pending' ? (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg uppercase tracking-widest shadow-sm flex items-center gap-1.5 border border-amber-200"><ShieldAlert size={14}/> Pending Activation</span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg uppercase tracking-widest shadow-sm flex items-center gap-1.5"><Zap size={14} className="fill-white"/> Live / Active</span>
                        )}
                        <span className="text-sm font-black text-gray-600 flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-gray-100"><Clock size={16} className="text-blue-500"/> {booking.cleaning_time}</span>
                      </div>
                      
                      <h3 className="text-2xl font-black text-gray-900 mb-1 flex items-center gap-2">
                        {booking.units?.companies?.name || "N/A"} 
                        <span className="text-gray-400 font-bold text-lg ml-1">| Unit {booking.units?.unit_number}</span>
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <p className="text-sm text-gray-700 font-medium bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">Team: <span className="text-gray-900 font-black">{booking.teams?.team_name || "Unassigned"}</span></p>
                        <p className="text-sm text-gray-700 font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">{booking.service_type}</p>
                      </div>
                    </div>
                    
                    <div className="relative z-10 w-full md:w-auto mt-2 md:mt-0">
                      {booking.status === 'pending' ? (
                        <button 
                          onClick={() => handleActivate(booking.id)}
                          disabled={activatingId === booking.id}
                          className="w-full md:w-auto px-10 py-5 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg shadow-xl shadow-gray-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                          {activatingId === booking.id ? <Loader2 className="animate-spin" size={24}/> : <CheckCircle size={24}/>}
                          Activate Now
                        </button>
                      ) : (
                        <div className="flex flex-col items-end gap-2 w-full md:w-auto mt-2 md:mt-0">
                          <div className="w-full md:w-auto px-10 py-5 bg-blue-100/50 text-blue-700 border border-blue-200 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-sm">
                            <CheckCircle2 size={24} className="text-blue-600"/> Activated
                          </div>
                          {/* ছোট্ট Undo বাটন */}
                          <button 
                            onClick={() => handleDeactivate(booking.id)}
                            disabled={activatingId === booking.id}
                            className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 pr-2"
                          >
                            <RotateCcw size={12}/> Undo Activation
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* --- SECTION 2: OTHER / PREVIOUS / UPCOMING DAYS --- */}
        {Object.keys(groupedOtherBookings).length > 0 && (
          <div className="space-y-8 pt-8 border-t-2 border-gray-200 border-dashed">
            <h2 className="text-xl font-black text-gray-500 mb-6 pl-2">Other Days</h2>
            
            {Object.entries(groupedOtherBookings).map(([dateStr, dateBookings]) => (
              <div key={dateStr} className="space-y-4">
                <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2 bg-gray-100 w-fit px-4 py-1.5 rounded-lg">
                  <Calendar size={16}/> {format(parseISO(dateStr), 'EEEE, dd MMM yyyy')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dateBookings.map(booking => (
                    <motion.div layout key={booking.id} className={`p-5 rounded-2xl border transition-all relative ${booking.status === 'active' ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-gray-200 shadow-sm'}`}>
                       <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-2">
                            {booking.status === 'pending' ? (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">Pending</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">Active</span>
                            )}
                         </div>
                         <span className="text-xs font-black text-gray-500 flex items-center gap-1"><Clock size={12}/> {booking.cleaning_time}</span>
                       </div>

                       <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{booking.units?.companies?.name || "N/A"}</h4>
                       <p className="text-sm text-gray-500 font-bold mb-4">Unit {booking.units?.unit_number} • {booking.teams?.team_name || "Unassigned"}</p>
                       
                       {booking.status === 'pending' ? (
                        <button 
                          disabled={true} // 🚨 লক করে দেওয়া হয়েছে
                          className="w-full py-2.5 bg-gray-50 text-gray-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-gray-100"
                          title="Can only be activated on the scheduled date"
                        >
                          <Lock size={14}/> Locked until {format(parseISO(booking.cleaning_date), 'dd MMM')}
                        </button>
                        ) : (
                          <div className="w-full py-2.5 bg-white border border-blue-100 text-blue-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                             <CheckCircle2 size={16}/> Live
                          </div>
                       )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
