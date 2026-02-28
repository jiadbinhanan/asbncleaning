
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  Plus, Trash2, Package, Settings, 
  Building2, Loader2, X, Info, 
  Search, Hash, CircleDollarSign, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Custom simple icon for the switcher
function LayoutGrid({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export default function EquipmentSetup() {
  const supabase = createClient();

  // --- States ---
  const [activeView, setActiveView] = useState<'master' | 'config'>('master');
  const [units, setUnits] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  // Master List Inputs
  const [newItemName, setNewItemName] = useState("");
  const [newBasePrice, setNewBasePrice] = useState("");

  // Config Inputs
  const [selectedUnit, setSelectedUnit] = useState("");
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);
  const [configItemId, setConfigItemId] = useState("");
  const [configStdQty, setConfigStdQty] = useState("");
  const [configExtraPrice, setConfigExtraPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initial Fetch (Companies, Units & Master Items)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [cRes, uRes, mRes] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('units').select('id, unit_number, building_name, company_id').order('unit_number'),
        supabase.from('equipment_master').select('*').order('item_name')
      ]);
      if (cRes.data) setCompanies(cRes.data);
      if (uRes.data) setUnits(uRes.data);
      if (mRes.data) setMasterItems(mRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  // 2. Fetch Config for Selected Unit
  useEffect(() => {
    if (selectedUnit) {
      const fetchUnitConfig = async () => {
        const { data } = await supabase
          .from('unit_equipment_config')
          .select('*, equipment_master(item_name)')
          .eq('unit_id', selectedUnit);
        setUnitConfigs(data || []);
      };
      fetchUnitConfig();
    } else {
      setUnitConfigs([]);
    }
  }, [selectedUnit]);

  // --- Master Item Logic ---
  const addMasterItem = async () => {
    if (!newItemName) return;
    setIsSaving(true);
    const { data, error } = await supabase
      .from('equipment_master')
      .insert([{ item_name: newItemName, base_price: parseFloat(newBasePrice) || 0 }])
      .select();
    
    if (data) {
      setMasterItems([...masterItems, data[0]]);
      setNewItemName(""); setNewBasePrice("");
    } else if (error) alert(error.message);
    setIsSaving(false);
  };

  const deleteMasterItem = async (id: number) => {
    if (!confirm("Are you sure? This will remove this item from all unit configs!")) return;
    const { error } = await supabase.from('equipment_master').delete().eq('id', id);
    if (!error) setMasterItems(masterItems.filter(i => i.id !== id));
  };

  // --- Unit Config Logic ---
  const addUnitConfig = async () => {
    if (!selectedUnit || !configItemId) return;
    setIsSaving(true);
    
    const { data, error } = await supabase
      .from('unit_equipment_config')
      .upsert({ 
        unit_id: parseInt(selectedUnit), 
        equipment_id: parseInt(configItemId), 
        standard_qty: parseInt(configStdQty) || 0, 
        extra_unit_price: parseFloat(configExtraPrice) || 0 
      }, { onConflict: 'unit_id, equipment_id' }) // Assumes unique constraint on unit_id + equipment_id
      .select('*, equipment_master(item_name)');
    
    if (error) {
      alert("Error saving config: " + error.message);
    } else if (data) {
      // Update local state: replace if exists, else add
      setUnitConfigs(prev => {
        const filtered = prev.filter(c => c.equipment_id !== parseInt(configItemId));
        return [...filtered, data[0]];
      });
      setConfigItemId(""); setConfigStdQty(""); setConfigExtraPrice("");
    }
    setIsSaving(false);
  };

  const deleteConfig = async (id: number) => {
    const { error } = await supabase.from('unit_equipment_config').delete().eq('id', id);
    if (!error) setUnitConfigs(unitConfigs.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative overflow-hidden">
      
      {/* 1. PREMIUM HEADER (Black & Dark Navy Blue) */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-12 pb-24 px-4 md:px-8 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div>
              <p className="text-blue-300 font-bold uppercase tracking-widest text-xs mb-1">Inventory Management</p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                 <Package className="text-blue-500" size={36}/> Equipment Inventory
              </h1>
           </div>
           
           {/* View Switcher */}
           <div className="flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
              <button 
                onClick={() => setActiveView('master')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeView === 'master' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <LayoutGrid size={16}/> Master List
              </button>
              <button 
                onClick={() => setActiveView('config')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeView === 'config' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <Settings size={16}/> Unit Setups
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 relative z-20">
        
        {loading ? (
          <div className="bg-white p-20 rounded-[3rem] shadow-xl border border-gray-100 flex justify-center items-center gap-4">
             <Loader2 className="animate-spin text-blue-600" size={32}/>
             <span className="font-bold text-gray-400">Loading inventory data...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- MASTER LIST VIEW --- */}
            {activeView === 'master' && (
              <>
                <div className="lg:col-span-4 space-y-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><Plus className="text-blue-600"/> Add New Item</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Item Name</label>
                        <input 
                          placeholder="e.g. King Bed Sheet" 
                          value={newItemName} onChange={e => setNewItemName(e.target.value)}
                          className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Base Price (AED)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">AED</span>
                          <input 
                            type="number" placeholder="0.00" 
                            value={newBasePrice} onChange={e => setNewBasePrice(e.target.value)}
                            className="w-full p-4 pl-14 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-gray-900 transition-all"
                          />
                        </div>
                      </div>
                      <button onClick={addMasterItem} disabled={isSaving} className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin mx-auto"/> : "Add to Master List"}
                      </button>
                    </div>
                  </motion.div>
                </div>

                <div className="lg:col-span-8">
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                       <h3 className="font-black text-gray-900 flex items-center gap-2"><Search size={18}/> Master Inventory</h3>
                       <span className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter">{masterItems.length} Items Total</span>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-gray-100 text-gray-500">
                        <tr>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest">Equipment Name</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Base Price</th>
                          <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {masterItems.map(item => (
                          <tr key={item.id} className="hover:bg-blue-50/20 transition-colors group">
                            <td className="p-6 font-bold text-gray-900">{item.item_name}</td>
                            <td className="p-6 font-black text-gray-600 text-center">
                               <span className="bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">{item.base_price} AED</span>
                            </td>
                            <td className="p-6 text-right">
                              <button onClick={() => deleteMasterItem(item.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                <Trash2 size={20}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                </div>
              </>
            )}

            {/* --- UNIT CONFIG VIEW --- */}
            {activeView === 'config' && (
              <>
                <div className="lg:col-span-4 space-y-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2 tracking-tight"><Building2 className="text-blue-600"/> Setup Property</h2>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Select Company</label>
                          <select 
                            value={selectedCompany} 
                            onChange={e => { setSelectedCompany(e.target.value); setSelectedUnit(""); }}
                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-black text-gray-900 transition-all focus:ring-4 focus:ring-blue-100"
                          >
                            <option value="">Choose Company...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Select Unit</label>
                          <select 
                            value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
                            disabled={!selectedCompany}
                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-black text-gray-900 transition-all focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                          >
                            <option value="">Choose Unit...</option>
                            {units.filter(u => u.company_id.toString() === selectedCompany).map(u => (
                              <option key={u.id} value={u.id}>{u.unit_number} - {u.building_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedUnit && (
                        <div className="space-y-4 pt-6 border-t border-gray-100">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Assign Equipment</label>
                            <select 
                              value={configItemId} onChange={e => setConfigItemId(e.target.value)}
                              className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl outline-none font-bold text-blue-900 focus:border-blue-500"
                            >
                              <option value="">Select Item...</option>
                              {masterItems.map(m => <option key={m.id} value={m.id}>{m.item_name}</option>)}
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1"><Hash size={10} className="inline mr-1"/> Std Qty</label>
                              <input type="number" placeholder="0" value={configStdQty} onChange={e => setConfigStdQty(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-black text-gray-900" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1"><CircleDollarSign size={10} className="inline mr-1"/> Extra Price</label>
                              <input type="number" placeholder="0.00" value={configExtraPrice} onChange={e => setConfigExtraPrice(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none font-black text-gray-900" />
                            </div>
                          </div>
                          
                          <button onClick={addUnitConfig} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                            {isSaving ? <Loader2 className="animate-spin"/> : <><CheckCircle2 size={18}/> Update Setup</>}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                <div className="lg:col-span-8">
                  {selectedUnit ? (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                      <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
                        <div>
                           <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Active Setup for:</p>
                           <h3 className="text-xl font-black">Unit {units.find(u => u.id.toString() === selectedUnit)?.unit_number}</h3>
                        </div>
                        <Building2 className="text-blue-500 opacity-30" size={40}/>
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-500">
                          <tr>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest">Equipment Item</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Standard Exchange</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-center">Extra Charge</th>
                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {unitConfigs.map(config => (
                            <tr key={config.id} className="hover:bg-blue-50/40 transition-colors group">
                              <td className="p-6 font-bold text-gray-900">{config.equipment_master?.item_name}</td>
                              <td className="p-6 text-center">
                                 <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-black text-sm border border-blue-100">{config.standard_qty} Qty</span>
                              </td>
                              <td className="p-6 text-center">
                                 <span className="font-black text-gray-900">{config.extra_unit_price} AED</span>
                              </td>
                              <td className="p-6 text-right">
                                <button onClick={() => deleteConfig(config.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><X size={20}/></button>
                              </td>
                            </tr>
                          ))}
                          {unitConfigs.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-20 text-center flex flex-col items-center justify-center gap-4">
                                <Info size={48} className="text-gray-200"/>
                                <p className="text-gray-400 font-bold">This unit hasn't been configured yet.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </motion.div>
                  ) : (
                    <div className="h-full bg-gray-200/40 rounded-[3rem] border-4 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-4 min-h-[500px]">
                      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                         <Info size={80} className="opacity-20"/>
                      </motion.div>
                      <p className="text-2xl font-black opacity-30 tracking-tight text-center">Select a unit from the left panel<br/><span className="text-sm font-bold">to start configuring its inventory requirements</span></p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
