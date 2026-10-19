"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RotateCw, WashingMachine, CheckCircle2, AlertTriangle, ArrowRight, PackageCheck, 
  History, Send, Search, Calendar, Building2, Trash2, ShieldAlert, Layers, Info
} from "lucide-react";
import { format } from "date-fns";
import { PageSkeleton } from "@/components/common/Skeleton";
import DotsLoader from "@/components/common/DotsLoader";
import Kbd from "@/components/common/Kbd";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function AdminLaundryManagement() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [laundryItems, setLaundryItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');

  const fetchLaundry = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('laundry_records')
      .select(`
        id, sent_qty, received_qty, shortage_qty, status, sent_at, received_at,
        units ( id, unit_number, building_name, companies ( name ) ),
        equipment_master ( id, item_name, current_stock ),
        booking_inventory_logs ( booking_id, bookings ( booking_ref ) )
      `)
      .order('sent_at', { ascending: false });

    if (data) {
      setLaundryItems(data.map(item => ({ ...item, inputReceived: item.sent_qty, error: "" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchLaundry(); }, []);

  useKeyboardShortcuts([
    {
      combo: '1',
      description: 'Switch to Send to Laundry',
      category: 'Navigation',
      handler: () => {
        setActiveTab('send');
        setViewMode('pending');
      },
    },
    {
      combo: '2',
      description: 'Switch to Receive Clean Stock',
      category: 'Navigation',
      handler: () => {
        setActiveTab('receive');
        setViewMode('pending');
      },
    },
    {
      combo: '3',
      description: 'Switch to Laundry History',
      category: 'Navigation',
      handler: () => setViewMode('history'),
    },
    {
      combo: 'Alt+R',
      description: 'Refresh laundry records',
      category: 'Actions',
      handler: fetchLaundry,
    },
    {
      combo: '/',
      description: 'Focus laundry search',
      category: 'Navigation',
      handler: () => searchRef.current?.focus(),
    },
  ]);

  // Filter Logic
  const filteredItems = laundryItems.filter(item => {
    if (activeTab === 'send') {
      if (viewMode === 'pending' && item.status !== 'pooled_dirty') return false;
      if (viewMode === 'history' && (item.status === 'pooled_dirty' || item.status === 'pending_washing')) return false; 
    } else {
      if (viewMode === 'pending' && item.status !== 'at_laundry') return false; 
      if (viewMode === 'history' && item.status !== 'received') return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.booking_inventory_logs?.bookings?.booking_ref?.toLowerCase().includes(q) || 
             item.units?.unit_number?.toLowerCase().includes(q) ||
             item.units?.companies?.name?.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by Date -> Then Group by Equipment
  const groupedData = filteredItems.reduce((acc: any, item: any) => {
    const dateStr = format(new Date(item.sent_at || new Date()), 'yyyy-MM-dd');
    
    // 🚨 FIXED: Removed the unused 'items: []' from root which was causing the crash
    if (!acc[dateStr]) acc[dateStr] = { totals: {} }; 
    
    const eqName = item.equipment_master?.item_name || "Unknown Item";
    if (!acc[dateStr][eqName]) acc[dateStr][eqName] = { totalSent: 0, items: [] };

    acc[dateStr][eqName].items.push(item);
    acc[dateStr][eqName].totalSent += item.sent_qty;
    
    // For Top Summary
    if (!acc[dateStr].totals[eqName]) acc[dateStr].totals[eqName] = 0;
    acc[dateStr].totals[eqName] += item.sent_qty;

    return acc;
  }, {});

  const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // --- Handlers ---
  const handleInputChange = (id: string, value: string) => {
    const val = parseInt(value) || 0;
    setLaundryItems(prev => prev.map(item => item.id === id ? { ...item, inputReceived: val, error: val > item.sent_qty ? "Exceeds sent qty" : "" } : item));
  };

  const handleDispatch = async (id: string) => {
    setProcessingId(id);
    try {
      await supabase.from('laundry_records').update({ status: 'at_laundry', sent_at: new Date().toISOString() }).eq('id', id);
      fetchLaundry();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setProcessingId(null); }
  };

  const handleBulkDispatch = async (dateStr: string) => {
    if (!window.confirm("Send all listed items for this date to the laundry?")) return;
    setProcessingId(dateStr); 
    
    let itemsToUpdate: string[] = [];
    Object.values(groupedData[dateStr]).forEach((eqGroup: any) => {
      if(eqGroup.items) itemsToUpdate.push(...eqGroup.items.map((i:any) => i.id));
    });
    
    try {
      await supabase.from('laundry_records').update({ status: 'at_laundry', sent_at: new Date().toISOString() }).in('id', itemsToUpdate);
      alert("Successfully dispatched batch to laundry!");
      fetchLaundry();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setProcessingId(null); }
  };

  const handleDiscard = async (item: any) => {
    const qtyStr = window.prompt(`How many ${item.equipment_master.item_name}s are totally damaged/unwashable?\n(Max available in pool: ${item.sent_qty})`, "1");
    if (!qtyStr) return; 
    
    const discardQty = parseInt(qtyStr);
    if (isNaN(discardQty) || discardQty <= 0 || discardQty > item.sent_qty) {
      return alert("Invalid quantity. Please enter a valid number up to " + item.sent_qty);
    }

    setProcessingId(item.id + '_discard');
    try {
      const newSentQty = item.sent_qty - discardQty;
      
      if (newSentQty === 0) {
        await supabase.from('laundry_records').update({ status: 'discarded' }).eq('id', item.id);
      } else {
        await supabase.from('laundry_records').update({ sent_qty: newSentQty }).eq('id', item.id);
      }
      
      await supabase.from('inventory_transaction_logs').insert({
        equipment_id: item.equipment_master.id, transaction_type: 'out', quantity: discardQty,
        reference_type: 'damaged_discarded', unit_id: item.units.id, booking_id: item.booking_inventory_logs?.booking_id,
        balance_after: item.equipment_master.current_stock, remarks: `${discardQty} items permanently discarded from dirty pool.`
      });
      
      alert(`${discardQty} item(s) moved to Dustbin and marked as Loss.`);
      fetchLaundry();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setProcessingId(null); }
  };

  const handleReceive = async (item: any) => {
    if (item.error || item.inputReceived < 0) return alert("Fix errors first.");
    const shortageQty = item.sent_qty - item.inputReceived;
    if (shortageQty > 0 && !window.confirm(`⚠️ ${shortageQty} items missing. Mark as lost?`)) return;

    setProcessingId(item.id);
    try {
      const newStock = (item.equipment_master.current_stock || 0) + item.inputReceived;
      
      await supabase.from('laundry_records').update({
        received_qty: item.inputReceived, shortage_qty: shortageQty, status: 'received', received_at: new Date().toISOString()
      }).eq('id', item.id);

      if (item.inputReceived > 0) {
        await supabase.from('equipment_master').update({ current_stock: newStock }).eq('id', item.equipment_master.id);
        await supabase.from('inventory_transaction_logs').insert({
          equipment_id: item.equipment_master.id, transaction_type: 'in', quantity: item.inputReceived,
          reference_type: 'laundry_received', unit_id: item.units.id, booking_id: item.booking_inventory_logs?.booking_id,
          balance_after: newStock, remarks: `Received from laundry.`
        });
      }

      if (shortageQty > 0) {
        await supabase.from('inventory_transaction_logs').insert({
          equipment_id: item.equipment_master.id, transaction_type: 'out', quantity: shortageQty,
          reference_type: 'laundry_shortage', unit_id: item.units.id, booking_id: item.booking_inventory_logs?.booking_id,
          balance_after: newStock, remarks: `Lost at laundry.`
        });
      }
      fetchLaundry();
    } catch (error: any) { alert("Error: " + error.message); }
    finally { setProcessingId(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] p-6 md:p-12">
        <PageSkeleton layout="table" showStats={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] pb-24 font-sans relative overflow-hidden">
      
      {/* 1. PREMIUM ADMIN HEADER — Bioluminescent Ocean & Tidal Waves (dark) */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-20 px-4 md:px-8 shadow-2xl relative overflow-hidden dark:border-b dark:border-cyan-500/20 dark:shadow-[0_12px_40px_rgba(6,182,212,0.18)]">
        {/* Light mode gradient */}
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:hidden' />

        {/* Dark mode multi-color oceanic abyss gradient */}
        <div className='absolute inset-0 hidden dark:block' style={{ background: 'linear-gradient(135deg, #010914 0%, #031b26 18%, #082d44 38%, #043844 62%, #021a2b 82%, #010812 100%)' }} />

        {/* Dark mode glowing aquatic orbs */}
        <div className='absolute -top-12 -left-12 w-96 h-96 hidden dark:block bg-cyan-500/22 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute bottom-0 right-10 w-96 h-96 hidden dark:block bg-teal-500/20 rounded-full blur-[95px] pointer-events-none' />
        <div className='absolute top-1/4 right-1/3 w-72 h-72 hidden dark:block bg-blue-600/18 rounded-full blur-[85px] pointer-events-none' />
        <div className='absolute -bottom-10 left-1/3 w-64 h-64 hidden dark:block bg-indigo-500/12 rounded-full blur-[75px] pointer-events-none' />

        {/* Dark mode SVG Bioluminescent Ocean Waves */}
        <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block'>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="laundry-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.32" />
                <stop offset="35%" stopColor="#0D9488" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.10" />
              </linearGradient>
              <linearGradient id="laundry-grad-wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.28" />
                <stop offset="40%" stopColor="#0EA5E9" stopOpacity="0.22" />
                <stop offset="75%" stopColor="#2563EB" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.06" />
              </linearGradient>
              <linearGradient id="laundry-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#2DD4BF" stopOpacity="0.95" />
                <stop offset="85%" stopColor="#38BDF8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#A5F3FC" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="laundry-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0.8" />
              </linearGradient>
              <filter id="laundry-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="laundry-glow-teal" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Background Tidal Wave */}
            <path d="M0,150 C320,60 560,220 860,120 C1160,20 1340,190 1440,110 L1440,320 L0,320 Z" fill="url(#laundry-grad-wave1)" />
            <path d="M0,150 C320,60 560,220 860,120 C1160,20 1340,190 1440,110" stroke="url(#laundry-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#laundry-glow-cyan)" />
            {/* Counter Tidal Wave */}
            <path d="M0,210 C260,260 480,130 760,200 C1040,270 1260,150 1440,190 L1440,320 L0,320 Z" fill="url(#laundry-grad-wave2)" />
            <path d="M0,210 C260,260 480,130 760,200 C1040,270 1260,150 1440,190" stroke="url(#laundry-crest-2)" strokeWidth="2" strokeLinecap="round" filter="url(#laundry-glow-teal)" />
          </svg>
        </div>

        {/* Light mode decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
              <p className="text-blue-300 dark:text-cyan-300 font-bold uppercase tracking-widest text-xs mb-1">Central Operations</p>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                 <WashingMachine className="text-blue-500 dark:text-cyan-400" size={32}/> Laundry Records
              </h1>
           </div>
           
           {/* 🚨 FIXED: Used flex-col-reverse for mobile (Tabs top, Search bottom) and md:flex-row for desktop */}
           <div className="flex flex-col-reverse md:flex-row items-center gap-4 w-full md:w-auto">
             
             {/* Search Bar */}
             <div className="relative w-full md:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-200 z-10 pointer-events-none" size={18} />
                <input 
                  ref={searchRef}
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search Ref, Unit... [/]" 
                  className="w-full pl-10 pr-9 py-2.5 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20 text-sm font-bold text-white placeholder:text-blue-200/60 backdrop-blur-md transition-all" 
                />
                {!searchQuery && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Kbd variant="glass" size="xs">/</Kbd>
                  </div>
                )}
             </div>

             {/* Main Navigation Tabs */}
             <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
                <button onClick={() => {setActiveTab('send'); setViewMode('pending')}} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'send' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <Send size={16}/> Dispatch List <Kbd variant="glass" size="xs">1</Kbd>
                </button>
                <button onClick={() => {setActiveTab('receive'); setViewMode('pending')}} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'receive' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <PackageCheck size={16}/> Receive Stock <Kbd variant="glass" size="xs">2</Kbd>
                </button>
                <button
                  onClick={fetchLaundry}
                  title="Refresh Laundry (Alt+R)"
                  aria-label="Refresh Laundry"
                  className="p-2.5 hover:bg-white/20 text-white rounded-xl transition-all flex items-center justify-center"
                >
                  <RotateCw size={16} />
                </button>
             </div>
             
           </div>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-8 relative z-20">
        
        {/* SUB-TABS (Pending / History) */}
        <div className="flex bg-white dark:bg-[#0c1427] p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 w-fit mb-6">
            <button onClick={() => setViewMode('pending')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'pending' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
              Action Needed
            </button>
            <button onClick={() => setViewMode('history')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${viewMode === 'history' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <History size={14}/> History Log
            </button>
        </div>

        {/* CONTENT AREA */}
        {sortedDates.length === 0 ? (
          <div className="bg-white dark:bg-[#0c1427] p-20 rounded-[3rem] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-4">
            <CheckCircle2 size={64} className="text-gray-200 dark:text-slate-700" />
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">All Clear!</h2>
              <p className="text-gray-500 dark:text-slate-400 font-bold text-sm mt-1">No laundry records found for the selected filters.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedDates.map((dateStr) => (
              <div key={dateStr} className="space-y-4">
                
                <h3 className="text-sm font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
                  <Calendar size={16}/> {format(new Date(dateStr), 'EEEE, dd MMMM yyyy')}
                </h3>

                {/* 🚨 SUMMARY BLOCK (Only in Send > Pending Tab) */}
                {activeTab === 'send' && viewMode === 'pending' && (
                  <div className="mb-6 bg-white dark:bg-[#0c1427] p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                          <h4 className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Layers size={16}/> Consolidated Dispatch Summary</h4>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(groupedData[dateStr].totals).map(([itemName, total]: any) => (
                              <div key={itemName} className="bg-gray-50 dark:bg-[#090d1a] px-4 py-2 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{itemName}</span>
                                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg">{total}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleBulkDispatch(dateStr)} disabled={processingId === dateStr}
                          className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-70"
                        >
                          {processingId === dateStr ? <DotsLoader size="sm" variant="white" label="Dispatching..." /> : <><Send size={20}/> Dispatch Batch to Laundry</>}
                        </button>
                    </div>
                  </div>
                )}

                {/* EQUIPMENT CARDS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(groupedData[dateStr]).map(([eqName, data]: any) => {
                    // 🚨 FIXED: Added safety check (!data.items) to prevent any future undefined crashes
                    if (eqName === 'totals' || !data.items) return null; 
                    
                    return (
                      <div key={eqName} className="bg-white dark:bg-[#0c1427] rounded-3xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
                        
                        {/* Card Header (Equipment Name) */}
                        <div className="bg-gray-50 dark:bg-[#090d1a] px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                          <h4 className="font-black text-lg text-gray-900 dark:text-white">{eqName}</h4>
                          <span className="bg-white dark:bg-[#0c1427] px-3 py-1.5 rounded-lg text-xs font-black text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 shadow-sm">{data.items.length} Units</span>
                        </div>

                        {/* Card Body (Unit Rows) */}
                        <div className="p-3 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                          {data.items.map((item: any) => (
                            <div key={item.id} className="p-4 mb-3 bg-white dark:bg-[#090d1a] hover:bg-gray-50 dark:hover:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                              
                              {/* Unit & Company Info */}
                              <div>
                                <p className="font-black text-gray-900 dark:text-white text-base flex items-center gap-2">
                                  <Building2 size={16} className="text-indigo-500 dark:text-indigo-400"/> Unit {item.units?.unit_number}
                                </p>
                                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">{item.units?.companies?.name} • {item.units?.building_name}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/40 uppercase tracking-widest">Ref: {item.booking_inventory_logs?.bookings?.booking_ref}</span>
                                  {item.status === 'discarded' && <span className="text-[10px] font-black text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-md border border-red-100 dark:border-red-900/40 uppercase tracking-widest">Dustbin</span>}
                                </div>
                              </div>

                              {/* Actions based on Tab */}
                              {activeTab === 'send' && viewMode === 'pending' ? (
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#070b14] p-2 rounded-xl border border-gray-200 dark:border-slate-700">
                                  <div className="text-center px-3 border-r border-gray-200 dark:border-slate-700">
                                    <span className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Qty</span>
                                    <span className="text-xl font-black text-gray-900 dark:text-white">{item.sent_qty}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleDispatch(item.id)} disabled={processingId === item.id} className="px-4 py-2 bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 text-xs font-black disabled:opacity-50">
                                      <Send size={14}/> Send
                                    </button>
                                    <button onClick={() => handleDiscard(item)} disabled={processingId === item.id + '_discard'} className="p-2.5 bg-white dark:bg-[#0c1427] hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/40 rounded-lg shadow-sm transition-all disabled:opacity-50" title="Throw to Dustbin">
                                      {processingId === item.id + '_discard' ? <DotsLoader size="xs" variant="primary" /> : <Trash2 size={16}/>}
                                    </button>
                                  </div>
                                </div>
                              ) : activeTab === 'receive' && viewMode === 'pending' ? (
                                <div className="flex flex-col items-end gap-2 bg-gray-50 dark:bg-[#070b14] p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 w-full md:w-auto">
                                  <div className="flex items-center gap-3 w-full justify-between md:justify-end">
                                    <span className="text-sm font-black text-gray-500 dark:text-slate-400 bg-white dark:bg-[#0c1427] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 whitespace-nowrap">Sent: {item.sent_qty}</span> 
                                    <ArrowRight size={14} className="text-gray-400 dark:text-slate-500 shrink-0"/>
                                    <input 
                                      type="number" min="0" max={item.sent_qty} value={item.inputReceived} onChange={(e) => handleInputChange(item.id, e.target.value)} 
                                      className="w-16 text-center p-2 rounded-lg border-2 border-emerald-200 dark:border-slate-700 bg-white dark:bg-[#0c1427] outline-none font-black text-emerald-900 dark:text-emerald-300 focus:border-emerald-500 shadow-sm"
                                    />
                                  </div>
                                  <button onClick={() => handleReceive(item)} disabled={processingId === item.id} className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                                    {processingId === item.id ? <DotsLoader size="xs" variant="white" label="Receiving..." /> : <><PackageCheck size={14}/> Receive Clean Stock</>}
                                  </button>
                                </div>
                              ) : (
                                <div className="text-right bg-gray-50 dark:bg-[#070b14] px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700">
                                  <span className="block text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1">Final Restored</span>
                                  <span className={`text-2xl font-black leading-none ${item.status === 'discarded' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {item.received_qty || item.sent_qty}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Card Footer (Total Aggregate) */}
                        <div className="bg-gray-100 dark:bg-[#090d1a] px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                          <span className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Total Pooled Items</span>
                          <span className="text-2xl font-black text-gray-900 dark:text-white">{data.totalSent} <span className="text-sm text-gray-500 dark:text-slate-400">Pcs</span></span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
