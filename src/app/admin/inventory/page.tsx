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

  if (loading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative">
      
      {/* 🚨 FIXED: Responsive Premium Header (overflow-hidden & flex-wrap added) */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-12 pb-24 px-4 md:px-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 w-full">
        
           <div className="w-full xl:w-auto">
              <p className="text-blue-300 font-bold uppercase tracking-widest text-xs mb-1">Master Inventory & Ledger</p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                 <Package className="text-blue-500 shrink-0" size={36}/> Stock Management
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

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 relative z-20">
        
        {/* ======================= STOCK VIEW ======================= */}
        {activeTab === 'stock' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-3xl border border-gray-100 shadow-sm gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                {/* 🚨 FIXED: Search Input deep color & state binding */}
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search equipment..." 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm font-black text-gray-900 placeholder:text-gray-500 transition-all" 
                />
              </div>
              <button onClick={() => openAdjustModal()} className="w-full md:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm shrink-0">
                <ArrowRightLeft size={16}/> Adjust Stock
              </button>
            </div>

            {filteredEquipment.length === 0 ? (
               <div className="p-10 bg-white rounded-3xl border border-gray-100 shadow-sm text-center text-gray-400 font-bold">
                 No equipment found matching your search.
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredEquipment.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:border-blue-300 transition-colors">
                    <div>
                      <h3 className="font-black text-gray-800 text-lg leading-tight mb-1">{item.item_name}</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Code: EQ-{item.id.toString().padStart(4, '0')}</p>
                    </div>
                    <div className="flex items-end justify-between border-t border-gray-50 pt-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Current Stock</p>
                        <span className={`text-3xl font-black ${item.current_stock < 10 ? 'text-red-500' : 'text-blue-700'}`}>
                          {item.current_stock || 0}
                        </span>
                      </div>
                      <button onClick={() => openAdjustModal(item.id.toString())} className="p-2 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Date & Time</th>
                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Item Name</th>
                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Type</th>
                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Qty</th>
                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Balance</th>
                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Reference / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ledgerLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5">
                        <p className="font-bold text-gray-800 text-sm">{format(new Date(log.created_at), 'dd MMM yyyy')}</p>
                        <p className="text-xs font-bold text-gray-400">{format(new Date(log.created_at), 'hh:mm a')}</p>
                      </td>
                      <td className="p-5 font-black text-gray-700">{log.equipment_master?.item_name}</td>
                      <td className="p-5">
                        {log.transaction_type === 'in' 
                          ? <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-black uppercase tracking-widest"><Plus size={12}/> IN</span>
                          : <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-black uppercase tracking-widest"><Minus size={12}/> OUT</span>
                        }
                      </td>
                      <td className="p-5 font-black text-gray-900 text-lg">{log.quantity}</td>
                      <td className="p-5 font-black text-blue-600 text-lg">{log.balance_after}</td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest w-fit">
                            {log.reference_type.replace('_', ' ')}
                            {log.units?.unit_number && ` • Unit ${log.units.unit_number}`}
                          </span>
                          <span className="text-sm font-medium text-gray-600 line-clamp-1">{log.remarks}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ledgerLogs.length === 0 && (
                <div className="p-10 text-center text-gray-400 font-bold">No transaction history found.</div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ======================= ADJUSTMENT MODAL ======================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            >
              <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><ArrowRightLeft className="text-blue-600"/> Adjust Stock</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={24}/></button>
              </div>

              <form onSubmit={handleAdjustmentSubmit} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Select Item</label>
                  <select 
                    value={adjData.equipment_id} 
                    onChange={e => setAdjData({...adjData, equipment_id: e.target.value})}
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold text-gray-900"
                    required
                  >
                    <option value="">-- Choose Equipment --</option>
                    {equipmentList.map(e => <option key={e.id} value={e.id}>{e.item_name} (Stock: {e.current_stock})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Action Type</label>
                    <select 
                      value={adjData.type} 
                      onChange={e => setAdjData({...adjData, type: e.target.value})}
                      className={`w-full p-3.5 border rounded-xl outline-none font-bold ${adjData.type === 'in' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                    >
                      <option value="in">Add Stock (+)</option>
                      <option value="out">Deduct Stock (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Quantity</label>
                    <input 
                      type="number" min="1" required
                      value={adjData.quantity} 
                      onChange={e => setAdjData({...adjData, quantity: e.target.value})}
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-black text-gray-900"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Remarks / Reason</label>
                  <textarea 
                    required
                    value={adjData.remarks} 
                    onChange={e => setAdjData({...adjData, remarks: e.target.value})}
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-800 resize-none h-24"
                    placeholder="e.g. New purchase via Invoice #1024 or Damaged items removed"
                  ></textarea>
                </div>

                <button 
                  type="submit" disabled={processing}
                  className="w-full py-4 bg-gray-900 hover:bg-black text-white font-black rounded-xl text-sm shadow-xl shadow-gray-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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
