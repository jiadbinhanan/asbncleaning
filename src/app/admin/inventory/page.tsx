"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, History, Plus, Minus, Search, 
  Loader2, CheckCircle2, AlertTriangle, ArrowRightLeft, FileText, Calendar, X 
} from "lucide-react";
import { format } from "date-fns";

export default function InventoryManagement() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'stock' | 'ledger'>('stock');
  const [loading, setLoading] = useState(true);
  
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [ledgerLogs, setLedgerLogs] = useState<any[]>([]);
  
  // 🚨 FIXED: Search State added
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adjData, setAdjData] = useState({
    equipment_id: "",
    type: "in",
    quantity: "",
    remarks: ""
  });

  const fetchData = async () => {
    setLoading(true);
    const [eqRes, logsRes] = await Promise.all([
      supabase.from('equipment_master').select('*').order('item_name'),
      supabase.from('inventory_transaction_logs').select(`
        *,
        equipment_master ( item_name ),
        units ( unit_number )
      `).order('created_at', { ascending: false }).limit(100)
    ]);

    if (eqRes.data) setEquipmentList(eqRes.data);
    if (logsRes.data) setLedgerLogs(logsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🚨 FIXED: Search Filter Logic
  const filteredEquipment = equipmentList.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toString().includes(searchTerm)
  );

  // Handle Manual Stock Adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjData.equipment_id || !adjData.quantity || !adjData.remarks) return alert("Please fill all fields.");

    setProcessing(true);
    try {
      const eq = equipmentList.find(e => e.id.toString() === adjData.equipment_id);
      if (!eq) throw new Error("Equipment not found");

      const qty = parseInt(adjData.quantity);
      if (qty <= 0) throw new Error("Quantity must be greater than 0");

      const currentStock = eq.current_stock || 0;
      let newStock = currentStock;

      if (adjData.type === 'in') {
        newStock += qty;
      } else {
        if (qty > currentStock) throw new Error("Cannot deduct more than current stock!");
        newStock -= qty;
      }

      // 1. Update Master Stock
      const { error: eqError } = await supabase
        .from('equipment_master')
        .update({ current_stock: newStock })
        .eq('id', eq.id);
      
      if (eqError) throw eqError;

      // 2. Add Ledger Entry
      const { error: logError } = await supabase
        .from('inventory_transaction_logs')
        .insert({
          equipment_id: eq.id,
          transaction_type: adjData.type,
          quantity: qty,
          reference_type: 'manual_adjustment',
          balance_after: newStock,
          remarks: adjData.remarks
        });

      if (logError) throw logError;

      alert(`Stock updated successfully! New Balance: ${newStock}`);
      setIsModalOpen(false);
      setAdjData({ equipment_id: "", type: "in", quantity: "", remarks: "" });
      fetchData(); 

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const openAdjustModal = (id?: string) => {
    setAdjData({ ...adjData, equipment_id: id || "", type: "in", quantity: "", remarks: "" });
    setIsModalOpen(true);
  };

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] pb-24 font-sans relative">
      
      {/* Premium Header — Prism Horizon & Molten Amethyst Waves (dark) */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-12 pb-24 px-4 md:px-8 shadow-2xl relative overflow-hidden dark:border-b dark:border-amber-500/20 dark:shadow-[0_12px_40px_rgba(245,158,11,0.15)]">
        {/* Light mode gradient */}
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:hidden' />

        {/* Dark mode multi-color prism obsidian gradient */}
        <div className='absolute inset-0 hidden dark:block' style={{ background: 'linear-gradient(135deg, #06060d 0%, #150826 18%, #200e38 38%, #17183e 62%, #0d1a29 82%, #05070f 100%)' }} />

        {/* Dark mode glowing prism orbs */}
        <div className='absolute -top-12 -right-12 w-96 h-96 hidden dark:block bg-purple-600/25 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute bottom-0 -left-10 w-80 h-80 hidden dark:block bg-amber-500/22 rounded-full blur-[90px] pointer-events-none' />
        <div className='absolute top-1/4 left-1/3 w-72 h-72 hidden dark:block bg-blue-600/18 rounded-full blur-[85px] pointer-events-none' />
        <div className='absolute -bottom-10 right-1/4 w-64 h-64 hidden dark:block bg-emerald-500/15 rounded-full blur-[80px] pointer-events-none' />

        {/* Dark mode SVG Prism Horizon Waves */}
        <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block'>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="inv-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.32" />
                <stop offset="35%" stopColor="#3B82F6" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="inv-grad-wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
                <stop offset="40%" stopColor="#D97706" stopOpacity="0.20" />
                <stop offset="75%" stopColor="#8B5CF6" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="inv-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C084FC" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#818CF8" stopOpacity="0.95" />
                <stop offset="85%" stopColor="#38BDF8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="inv-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FB923C" stopOpacity="0.8" />
              </linearGradient>
              <filter id="inv-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="inv-glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Background Prism Wave */}
            <path d="M0,160 C300,80 580,240 880,140 C1180,40 1340,200 1440,120 L1440,320 L0,320 Z" fill="url(#inv-grad-wave1)" />
            <path d="M0,160 C300,80 580,240 880,140 C1180,40 1340,200 1440,120" stroke="url(#inv-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#inv-glow-purple)" />
            {/* Foreground Molten Wave */}
            <path d="M0,220 C280,270 520,130 800,210 C1080,290 1280,150 1440,200 L1440,320 L0,320 Z" fill="url(#inv-grad-wave2)" />
            <path d="M0,220 C280,270 520,130 800,210 C1080,290 1280,150 1440,200" stroke="url(#inv-crest-2)" strokeWidth="2" strokeLinecap="round" filter="url(#inv-glow-gold)" />
          </svg>
        </div>

        {/* Light mode decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden" />

        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 w-full">
        
           <div className="w-full xl:w-auto">
              <p className="text-blue-300 dark:text-amber-300 font-bold uppercase tracking-widest text-xs mb-1">Master Inventory & Ledger</p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                 <Package className="text-blue-500 dark:text-amber-400 shrink-0" size={36}/> Stock Management
              </h1>
           </div>
           
           {/* View Switcher with flex-wrap to prevent overflow */}
           <div className="flex flex-wrap items-center bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-full xl:w-auto">
              <button 
                onClick={() => setActiveTab('stock')}
                className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'stock' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <Package size={16}/> Current Stock
              </button>
              <button 
                onClick={() => setActiveTab('ledger')}
                className={`flex-1 sm:flex-none px-4 md:px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'ledger' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <History size={16}/> Transaction Ledger
              </button>
           </div>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-12 relative z-20">
        
        {/* ======================= STOCK VIEW ======================= */}
        {activeTab === 'stock' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#0c1427] p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                {/* 🚨 FIXED: Search Input deep color & state binding */}
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search equipment..." 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm font-black text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-500 transition-all" 
                />
              </div>
              <button onClick={() => openAdjustModal()} className="w-full md:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm shrink-0">
                <ArrowRightLeft size={16}/> Adjust Stock
              </button>
            </div>

            {filteredEquipment.length === 0 ? (
               <div className="p-10 bg-white dark:bg-[#0c1427] rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm text-center text-gray-400 dark:text-slate-500 font-bold">
                 No equipment found matching your search.
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredEquipment.map(item => (
                  <div key={item.id} className="bg-white dark:bg-[#0c1427] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between group hover:border-blue-300 dark:hover:border-slate-700 transition-colors">
                    <div>
                      <h3 className="font-black text-gray-800 dark:text-white text-lg leading-tight mb-1">{item.item_name}</h3>
                      <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Code: EQ-{item.id.toString().padStart(4, '0')}</p>
                    </div>
                    <div className="flex items-end justify-between border-t border-gray-50 dark:border-slate-800/80 pt-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Current Stock</p>
                        <span className={`text-3xl font-black ${item.current_stock < 10 ? 'text-red-500' : 'text-blue-700 dark:text-blue-400'}`}>
                          {item.current_stock || 0}
                        </span>
                      </div>
                      <button onClick={() => openAdjustModal(item.id.toString())} className="p-2 bg-gray-50 dark:bg-[#090d1a] hover:bg-blue-50 dark:hover:bg-slate-800 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent dark:border-slate-800 rounded-lg transition-colors">
                        <Plus size={18}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ======================= LEDGER VIEW ======================= */}
        {activeTab === 'ledger' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0c1427] rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#090d1a] border-b border-gray-100 dark:border-slate-800">
                    <th className="p-5 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Date & Time</th>
                    <th className="p-5 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Item Name</th>
                    <th className="p-5 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="p-5 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Qty</th>
                    <th className="p-5 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Balance</th>
                    <th className="p-5 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Reference / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                  {ledgerLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-5">
                        <p className="font-bold text-gray-800 dark:text-white text-sm">{format(new Date(log.created_at), 'dd MMM yyyy')}</p>
                        <p className="text-xs font-bold text-gray-400 dark:text-slate-500">{format(new Date(log.created_at), 'hh:mm a')}</p>
                      </td>
                      <td className="p-5 font-black text-gray-700 dark:text-slate-200">{log.equipment_master?.item_name}</td>
                      <td className="p-5">
                        {log.transaction_type === 'in' 
                          ? <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md text-xs font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800/50"><Plus size={12}/> IN</span>
                          : <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 px-2 py-1 rounded-md text-xs font-black uppercase tracking-widest border border-red-200 dark:border-red-800/50"><Minus size={12}/> OUT</span>
                        }
                      </td>
                      <td className="p-5 font-black text-gray-900 dark:text-white text-lg">{log.quantity}</td>
                      <td className="p-5 font-black text-blue-600 dark:text-blue-400 text-lg">{log.balance_after}</td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-transparent dark:border-indigo-900/40 px-2 py-0.5 rounded uppercase tracking-widest w-fit">
                            {log.reference_type.replace('_', ' ')}
                            {log.units?.unit_number && ` • Unit ${log.units.unit_number}`}
                          </span>
                          <span className="text-sm font-medium text-gray-600 dark:text-slate-400 line-clamp-1">{log.remarks}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ledgerLogs.length === 0 && (
                <div className="p-10 text-center text-gray-400 dark:text-slate-500 font-bold">No transaction history found.</div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ======================= ADJUSTMENT MODAL ======================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0c1427] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-800"
            >
              <div className="bg-gray-50 dark:bg-[#090d1a] p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><ArrowRightLeft className="text-blue-600 dark:text-blue-400"/> Adjust Stock</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"><X size={24}/></button>
              </div>

              <form onSubmit={handleAdjustmentSubmit} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Select Item</label>
                  <select 
                    value={adjData.equipment_id} 
                    onChange={e => setAdjData({...adjData, equipment_id: e.target.value})}
                    className="w-full p-3.5 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose Equipment --</option>
                    {equipmentList.map(e => <option key={e.id} value={e.id}>{e.item_name} (Stock: {e.current_stock})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Action Type</label>
                    <select 
                      value={adjData.type} 
                      onChange={e => setAdjData({...adjData, type: e.target.value})}
                      className={`w-full p-3.5 border rounded-xl outline-none font-bold ${adjData.type === 'in' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400'}`}
                    >
                      <option value="in">Add Stock (+)</option>
                      <option value="out">Deduct Stock (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Quantity</label>
                    <input 
                      type="number" min="1" required
                      value={adjData.quantity} 
                      onChange={e => setAdjData({...adjData, quantity: e.target.value})}
                      className="w-full p-3.5 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-black text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Remarks / Reason</label>
                  <textarea 
                    required
                    value={adjData.remarks} 
                    onChange={e => setAdjData({...adjData, remarks: e.target.value})}
                    className="w-full p-3.5 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 resize-none h-24"
                    placeholder="e.g. New purchase via Invoice #1024 or Damaged items removed"
                  ></textarea>
                </div>

                <button 
                  type="submit" disabled={processing}
                  className="w-full py-4 bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white font-black rounded-xl text-sm shadow-xl shadow-gray-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {processing ? <><Loader2 className="animate-spin" size={18}/> Updating...</> : <><CheckCircle2 size={18}/> Confirm Adjustment</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
