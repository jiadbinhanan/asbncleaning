"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, WashingMachine, CheckCircle2, AlertTriangle, ArrowRight, PackageCheck, 
  History, Send, Search, Calendar, Building2, Trash2, ShieldAlert
} from "lucide-react";
import { format } from "date-fns";

export default function LaundryTracking() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [laundryItems, setLaundryItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');

  const fetchLaundry = async () => {
    setLoading(true);
    // 🚨 FIXED: Removed .eq('status', 'pending_washing') so ALL statuses load for both tabs
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
             item.units?.unit_number?.toLowerCase().includes(q);
    }
    return true;
  });

  // 🚨 NEW LOGIC: Group by Date -> Then Group by Equipment
  const groupedData = filteredItems.reduce((acc: any, item: any) => {
    const dateStr = format(new Date(item.sent_at || new Date()), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = {};
    
    const eqName = item.equipment_master?.item_name || "Unknown Item";
    if (!acc[dateStr][eqName]) acc[dateStr][eqName] = { totalSent: 0, items: [] };

    acc[dateStr][eqName].items.push(item);
    acc[dateStr][eqName].totalSent += item.sent_qty;

    return acc;
  }, {});

  const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // --- Handlers ---
  const handleInputChange = (id: string, value: string) => {
    const val = parseInt(value) || 0;
    setLaundryItems(prev => prev.map(item => item.id === id ? { ...item, inputReceived: val, error: val > item.sent_qty ? "Exceeds sent qty" : "" } : item));
  };

  // Dispatch Single Item
  const handleDispatch = async (id: string) => {
    setProcessingId(id);
    try {
      await supabase.from('laundry_records').update({ status: 'at_laundry', sent_at: new Date().toISOString() }).eq('id', id);
      fetchLaundry();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setProcessingId(null); }
  };

  // 🚨 NEW: Partial Discard/Dustbin Logic
  const handleDiscard = async (item: any) => {
    const qtyStr = window.prompt(`How many ${item.equipment_master.item_name}s are totally damaged/unwashable?\n(Max available in pool: ${item.sent_qty})`, "1");
    if (!qtyStr) return; // User cancelled
    
    const discardQty = parseInt(qtyStr);
    if (isNaN(discardQty) || discardQty <= 0 || discardQty > item.sent_qty) {
      return alert("Invalid quantity. Please enter a valid number up to " + item.sent_qty);
    }

    setProcessingId(item.id + '_discard');
    try {
      const newSentQty = item.sent_qty - discardQty;
      
      // 1. Update Laundry Pool Quantity
      if (newSentQty === 0) {
        await supabase.from('laundry_records').update({ status: 'discarded' }).eq('id', item.id);
      } else {
        await supabase.from('laundry_records').update({ sent_qty: newSentQty }).eq('id', item.id);
      }
      
      // 2. Log as Permanent Loss in Ledger
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

  // Receive Stock
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

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      
      {/* 1. PREMIUM HEADER (Rounded Bottom) */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-purple-600 text-white pt-8 pb-16 px-4 md:px-8 shadow-xl rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><WashingMachine size={32}/> Laundry Manager</h1>
            <p className="text-blue-200 font-bold text-sm mt-1 opacity-90">Dispatch to Laundry & Receive Stocks</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
            <input 
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Ref, Unit..." 
              className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20 text-sm font-bold text-white placeholder:text-white/50 backdrop-blur-sm" 
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-8 relative z-20">
        
        {/* TABS CONTAINER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-8 flex flex-col md:flex-row justify-between gap-4">
          <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-full md:w-auto">
            <button onClick={() => {setActiveTab('send'); setViewMode('pending')}} className={`flex-1 md:px-8 py-2.5 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'send' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}><Send size={16}/> Send to Laundry</button>
            <button onClick={() => {setActiveTab('receive'); setViewMode('pending')}} className={`flex-1 md:px-8 py-2.5 rounded-lg text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'receive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}><PackageCheck size={16}/> Receive Stock</button>
          </div>
          <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100 shrink-0">
             <button onClick={() => setViewMode('pending')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'pending' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>Pending</button>
             <button onClick={() => setViewMode('history')} className={`px-6 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${viewMode === 'history' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}><History size={14}/> History</button>
          </div>
        </div>

        {/* CONTENT AREA */}
        {sortedDates.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl text-center border border-gray-100"><CheckCircle2 size={64} className="text-emerald-400 mx-auto mb-4 opacity-50" /><h2 className="text-xl font-black text-gray-900">All Clear!</h2></div>
        ) : (
          <div className="space-y-10">
            {sortedDates.map((dateStr) => (
              <div key={dateStr} className="space-y-4">
                
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b border-gray-200 pb-2"><Calendar size={16}/> {format(new Date(dateStr), 'EEEE, dd MMMM yyyy')}</h3>

                {/* EQUIPMENT CARDS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(groupedData[dateStr]).map(([eqName, data]: any) => (
                    
                    <div key={eqName} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                      
                      {/* Card Header (Equipment Name) */}
                      <div className="bg-indigo-50/50 px-5 py-4 border-b border-indigo-100 flex justify-between items-center shrink-0">
                        <h4 className="font-black text-lg text-indigo-900">{eqName}</h4>
                        <span className="bg-white px-3 py-1 rounded-lg text-xs font-black text-indigo-600 border border-indigo-100 shadow-sm">{data.items.length} Units</span>
                      </div>

                      {/* Card Body (Unit Rows) */}
                      <div className="p-2 flex-1 overflow-y-auto max-h-80 custom-scrollbar">
                        {data.items.map((item: any) => (
                          <div key={item.id} className="p-4 mb-3 bg-white hover:bg-indigo-50/30 rounded-2xl border border-gray-100 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            
                            {/* 🚨 UPDATED: Unit & Company Info */}
                            <div>
                              <p className="font-black text-gray-900 text-base flex items-center gap-2">
                                <Building2 size={16} className="text-indigo-500"/> Unit {item.units?.unit_number}
                              </p>
                              <p className="text-xs font-bold text-gray-500 mt-1">{item.units?.companies?.name} • {item.units?.building_name}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 uppercase tracking-widest">Ref: {item.booking_inventory_logs?.bookings?.booking_ref}</span>
                                {item.status === 'discarded' && <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100 uppercase tracking-widest">Dustbin</span>}
                              </div>
                            </div>

                            {/* Actions based on Tab */}
                            {activeTab === 'send' && viewMode === 'pending' ? (
                              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                <div className="text-center px-2 border-r border-gray-200">
                                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</span>
                                  <span className="text-xl font-black text-gray-900">{item.sent_qty}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handleDispatch(item.id)} disabled={processingId === item.id} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 text-xs font-black">
                                    <Send size={14}/> Send
                                  </button>
                                  <button onClick={() => handleDiscard(item)} disabled={processingId === item.id + '_discard'} className="p-2 bg-white hover:bg-red-50 text-red-500 border border-red-100 rounded-lg shadow-sm transition-all" title="Throw to Dustbin">
                                    {processingId === item.id + '_discard' ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16}/>}
                                  </button>
                                </div>
                              </div>
                            ) : activeTab === 'receive' && viewMode === 'pending' ? (
                              <div className="flex flex-col items-end gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-gray-400 bg-white px-3 py-1.5 rounded-lg border border-gray-200">Sent: {item.sent_qty}</span> 
                                  <ArrowRight size={14} className="text-gray-400"/>
                                  <input type="number" min="0" max={item.sent_qty} value={item.inputReceived} onChange={(e) => handleInputChange(item.id, e.target.value)} className="w-16 text-center p-1.5 rounded-lg border-2 border-indigo-200 outline-none font-black text-indigo-700 focus:border-indigo-500 shadow-sm"/>
                                </div>
                                <button onClick={() => handleReceive(item)} disabled={processingId === item.id} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5">
                                  <PackageCheck size={14}/> Receive Clean Stock
                                </button>
                              </div>
                            ) : (
                              <div className="text-right bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                                <span className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Final Restored</span>
                                <span className="text-2xl font-black text-emerald-700 leading-none">{item.received_qty || item.sent_qty}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Card Footer (Total Aggregate) */}
                      <div className="bg-gray-100 px-5 py-3 border-t border-gray-200 flex justify-between items-center shrink-0">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Collection</span>
                        <span className="text-xl font-black text-gray-900">{data.totalSent} <span className="text-sm text-gray-500">Pcs</span></span>
                      </div>

                    </div>
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
