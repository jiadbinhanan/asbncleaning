"use client";
import React from "react";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  Plus, Trash2, Package, Settings, Building2, Loader2, X, Info, 
  Search, Hash, CircleDollarSign, CheckCircle2, Edit2, Copy, Save, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [activeView, setActiveView] = useState<'master' | 'templates' | 'config'>('master');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [units, setUnits] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);

  // 1. Master List States
  const [newItemName, setNewItemName] = useState("");
  const [newBasePrice, setNewBasePrice] = useState("");
  const [newItemType, setNewItemType] = useState("returnable");
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", price: "", type: "" });

  // 2. Templates States (JSONB Logic)
  const [templates, setTemplates] = useState<any[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateConfigs, setTemplateConfigs] = useState<any[]>([]);

  // 3. Unit Config States
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);
  const [templateToApply, setTemplateToApply] = useState("");

  // 🚨 NEW: Bulk Select States (For both Templates & Unit Config)
  const [showBulkSelect, setShowBulkSelect] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
  const [bulkInputs, setBulkInputs] = useState<Record<number, { qty: string, price: string }>>({});

  // 🚨 NEW: Unit Config Inline Edit State
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [editConfigData, setEditConfigData] = useState({ qty: "", price: "" });

  // Helper function to format layout
  const formatLayout = (layout?: string) => layout ? layout.replace(/ Apartment/gi, '').trim() : '';

  // --- Fetching Logic ---
  const fetchInitialData = async () => {
    setLoading(true);
    const [cRes, uRes, mRes, tRes] = await Promise.all([
      supabase.from('companies').select('id, name').order('name'),
      supabase.from('units').select('id, unit_number, building_name, company_id, layout').order('unit_number'),
      supabase.from('equipment_master').select('*').order('item_name'),
      supabase.from('equipment_templates').select('*').order('name')
    ]);
    if (cRes.data) setCompanies(cRes.data);
    if (uRes.data) setUnits(uRes.data);
    if (mRes.data) setMasterItems(mRes.data);
    if (tRes.data) setTemplates(tRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchInitialData(); }, []);

  // Fetch Template Configs (Parsing JSON from Single Table)
  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id.toString() === selectedTemplate);
      if (template && template.items) {
         const enrichedItems = template.items.map((tItem: any) => {
           const masterItem = masterItems.find(m => m.id === tItem.equipment_id);
           return { ...tItem, equipment_master: masterItem };
         });
         setTemplateConfigs(enrichedItems);
      } else {
         setTemplateConfigs([]);
      }
    } else {
      setTemplateConfigs([]);
    }
  }, [selectedTemplate, templates, masterItems]);

  // Fetch Unit Configs
  useEffect(() => {
    if (selectedUnit) {
      supabase.from('unit_equipment_config').select('*, equipment_master(item_name, item_type)').eq('unit_id', selectedUnit)
        .then(({ data }) => setUnitConfigs(data || []));
    } else setUnitConfigs([]);
  }, [selectedUnit]);


  // ================= 1. MASTER LIST ACTIONS =================
  const addMasterItem = async () => {
    if (!newItemName) return;
    setIsSaving(true);
    const { data, error } = await supabase.from('equipment_master')
      .insert([{ item_name: newItemName, base_price: parseFloat(newBasePrice) || 0, item_type: newItemType }]).select();
    if (data) {
      setMasterItems([...masterItems, data[0]]);
      setNewItemName(""); setNewBasePrice(""); setNewItemType("returnable");
    } else if (error) alert(error.message);
    setIsSaving(false);
  };

  const saveEditMaster = async (id: number) => {
    setIsSaving(true);
    const { error } = await supabase.from('equipment_master')
      .update({ item_name: editData.name, base_price: parseFloat(editData.price) || 0, item_type: editData.type }).eq('id', id);
    if (!error) {
      setMasterItems(prev => prev.map(item => item.id === id ? { ...item, item_name: editData.name, base_price: parseFloat(editData.price) || 0, item_type: editData.type } : item));
      setEditingItem(null);
    } else alert(error.message);
    setIsSaving(false);
  };

  const deleteMasterItem = async (id: number) => {
    if (!confirm("Delete this item from Master List? It will be removed everywhere!")) return;
    const { error } = await supabase.from('equipment_master').delete().eq('id', id);
    if (!error) setMasterItems(masterItems.filter(i => i.id !== id));
  };

  // ================= 2. TEMPLATE ACTIONS =================
  const createTemplate = async () => {
    if (!newTemplateName) return;
    setIsSaving(true);
    const { data, error } = await supabase.from('equipment_templates').insert([{ name: newTemplateName, items: [] }]).select();
    if (data) {
      setTemplates([...templates, data[0]]);
      setNewTemplateName("");
      setSelectedTemplate(data[0].id.toString());
    } else alert(error.message);
    setIsSaving(false);
  };

  const deleteTemplateItem = async (equipment_id: number) => {
    const template = templates.find(t => t.id.toString() === selectedTemplate);
    if(!template) return;
    const updatedItems = template.items.filter((i:any) => i.equipment_id !== equipment_id);
    
    const { data, error } = await supabase.from('equipment_templates').update({ items: updatedItems }).eq('id', selectedTemplate).select();
    if (data) setTemplates(templates.map(t => t.id.toString() === selectedTemplate ? data[0] : t));
  };

  // ================= 3. UNIT CONFIG ACTIONS =================
  const applyTemplateToUnit = async () => {
    if (!selectedUnit || !templateToApply) return;
    if (!confirm("This will add all items from the template to this unit. Proceed?")) return;
    setIsSaving(true);
    
    const template = templates.find(t => t.id.toString() === templateToApply);
    const tItems = template?.items || [];
    
    if (tItems.length > 0) {
      const upsertData = tItems.map((t: any) => ({
        unit_id: parseInt(selectedUnit),
        equipment_id: t.equipment_id,
        standard_qty: t.standard_qty,
        extra_unit_price: t.extra_unit_price
      }));

      const { error } = await supabase.from('unit_equipment_config').upsert(upsertData, { onConflict: 'unit_id, equipment_id' });
      if (!error) {
        const { data } = await supabase.from('unit_equipment_config').select('*, equipment_master(item_name, item_type)').eq('unit_id', selectedUnit);
        setUnitConfigs(data || []);
        setTemplateToApply("");
        alert("Template Applied Successfully!");
      } else alert(error.message);
    } else {
      alert("This template is empty!");
    }
    setIsSaving(false);
  };

  // --- BULK SELECTION HANDLERS ---
  const toggleBulkSelect = (id: number) => {
    setBulkSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    if (!bulkInputs[id]) setBulkInputs(prev => ({ ...prev, [id]: { qty: "0", price: "0" } }));
  };

  const handleBulkInput = (id: number, field: 'qty' | 'price', val: string) => {
    setBulkInputs(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  // 🚨 UPDATED: Bulk Add to Template
  const addBulkTemplateItems = async () => {
    if (!selectedTemplate || bulkSelectedIds.length === 0) return;
    setIsSaving(true);
    const template = templates.find(t => t.id.toString() === selectedTemplate);
    let updatedItems = [...(template?.items || [])];

    bulkSelectedIds.forEach(eqId => {
      const newItem = { equipment_id: eqId, standard_qty: parseInt(bulkInputs[eqId]?.qty) || 0, extra_unit_price: parseFloat(bulkInputs[eqId]?.price) || 0 };
      const existingIdx = updatedItems.findIndex((i:any) => i.equipment_id === eqId);
      if (existingIdx >= 0) updatedItems[existingIdx] = newItem;
      else updatedItems.push(newItem);
    });

    const { data, error } = await supabase.from('equipment_templates').update({ items: updatedItems }).eq('id', selectedTemplate).select();
    if (data) {
       setTemplates(templates.map(t => t.id.toString() === selectedTemplate ? data[0] : t));
       setBulkSelectedIds([]); setBulkInputs({}); setShowBulkSelect(false);
    } else alert(error?.message);
    setIsSaving(false);
  };

  // 🚨 UPDATED: Bulk Add to Unit Setup
  const addBulkUnitConfigs = async () => {
    if (!selectedUnit || bulkSelectedIds.length === 0) return;
    setIsSaving(true);
    const upsertData = bulkSelectedIds.map(eqId => ({
      unit_id: parseInt(selectedUnit), equipment_id: eqId,
      standard_qty: parseInt(bulkInputs[eqId]?.qty) || 0, extra_unit_price: parseFloat(bulkInputs[eqId]?.price) || 0
    }));

    const { error } = await supabase.from('unit_equipment_config').upsert(upsertData, { onConflict: 'unit_id, equipment_id' });
    if (!error) {
      const { data } = await supabase.from('unit_equipment_config').select('*, equipment_master(item_name, item_type)').eq('unit_id', selectedUnit);
      setUnitConfigs(data || []);
      setBulkSelectedIds([]); setBulkInputs({}); setShowBulkSelect(false);
    } else alert(error.message);
    setIsSaving(false);
  };

  // 🚨 NEW: Save Inline Edit for Unit Config
  const saveEditUnitConfig = async (configId: number) => {
    setIsSaving(true);
    const { error } = await supabase.from('unit_equipment_config')
      .update({ standard_qty: parseInt(editConfigData.qty) || 0, extra_unit_price: parseFloat(editConfigData.price) || 0 }).eq('id', configId);
    if (!error) {
      setUnitConfigs(prev => prev.map(c => c.id === configId ? { ...c, standard_qty: parseInt(editConfigData.qty) || 0, extra_unit_price: parseFloat(editConfigData.price) || 0 } : c));
      setEditingConfigId(null);
    } else alert(error.message);
    setIsSaving(false);
  };

  const deleteConfig = async (id: number) => {
    const { error } = await supabase.from('unit_equipment_config').delete().eq('id', id);
    if (!error) setUnitConfigs(unitConfigs.filter(c => c.id !== id));
  };


  // --- Helper Components ---
  const TypeBadge = ({ type }: { type: string }) => {
    switch (type) {
      case 'returnable': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-black uppercase">Linens (Return)</span>;
      case 'refillable': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-black uppercase">Dispensers</span>;
      case 'consumable': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase">Amenities</span>;
      default: return null;
    }
  };


  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative overflow-hidden">
      
      {/* 1. PREMIUM HEADER */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-20 px-4 md:px-8 shadow-2xl relative">
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div>
              <p className="text-blue-300 font-bold uppercase tracking-widest text-xs mb-1">Inventory Management</p>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><Package className="text-blue-500" size={32}/> Equipment Setup</h1>
           </div>
           
           {/* Navigation Tabs */}
           <div className="flex bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
              <button onClick={() => setActiveView('master')} className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeView === 'master' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <LayoutGrid size={16}/> Master List
              </button>
              <button onClick={() => setActiveView('templates')} className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeView === 'templates' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <FileText size={16}/> Templates
              </button>
              <button onClick={() => setActiveView('config')} className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeView === 'config' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <Settings size={16}/> Unit Setups
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 relative z-20">
        {loading ? (
          <div className="bg-white p-20 rounded-[3rem] shadow-xl flex justify-center items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={32}/><span className="font-bold text-gray-400">Loading data...</span></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             
            {/* ================= VIEW 1: MASTER LIST ================= */}
            {activeView === 'master' && (
              <>
                <div className="lg:col-span-4 space-y-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><Plus className="text-blue-600"/> Add New Item</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Item Category</label>
                        <select value={newItemType} onChange={e => setNewItemType(e.target.value)} className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-gray-900 focus:border-blue-500">
                          <option value="returnable">Linens & Towels (Returnable)</option>
                          <option value="refillable">Dispensers & Jars (Refillable)</option>
                          <option value="consumable">Amenities (Consumable)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Item Name</label>
                        <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="e.g. Bath Towel" className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-gray-900 focus:border-blue-500"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Base Price (AED)</label>
                        <input type="number" value={newBasePrice} onChange={e => setNewBasePrice(e.target.value)} placeholder="0.00" className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-bold text-gray-900 focus:border-blue-500"/>
                      </div>
                      <button onClick={addMasterItem} disabled={isSaving} className="w-full py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all shadow-md active:scale-95 disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin mx-auto"/> : "Add to Master List"}
                      </button>
                    </div>
                  </motion.div>
                </div>

                <div className="lg:col-span-8">
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                       <h3 className="font-black text-gray-900 flex items-center gap-2"><Search size={18}/> Master Inventory</h3>
                       <span className="text-xs font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{masterItems.length} Items</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                          <tr><th className="p-5">Category</th><th className="p-5">Equipment Name</th><th className="p-5 text-center">Base Price</th><th className="p-5 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Object.entries(masterItems.reduce((acc: any, item: any) => {
                            if (!acc[item.item_type]) acc[item.item_type] = [];
                            acc[item.item_type].push(item);
                            return acc;
                          }, {})).map(([category, items]: any) => (
                            <React.Fragment key={category}>
                              {/* Group Header */}
                              <tr className="bg-blue-50/50">
                                <td colSpan={4} className="p-3 text-[11px] font-black text-blue-800 uppercase tracking-widest border-b border-blue-100 flex items-center gap-2">
                                  <TypeBadge type={category}/> {category} Items
                                </td>
                              </tr>
                              {/* Items */}
                              {items.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                  {editingItem === item.id ? (
                                    <>
                                      <td className="p-3"><select value={editData.type} onChange={e => setEditData({...editData, type: e.target.value})} className="p-2 border rounded-lg text-xs font-black text-gray-900 w-full"><option value="returnable">Returnable</option><option value="refillable">Refillable</option><option value="consumable">Consumable</option></select></td>
                                      <td className="p-3"><input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="p-2 border rounded-lg text-sm font-black text-gray-900 w-full"/></td>
                                      <td className="p-3"><input type="number" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} className="p-2 border rounded-lg text-sm font-black text-gray-900 w-full text-center"/></td>
                                      <td className="p-3 text-right">
                                        <button onClick={() => saveEditMaster(item.id)} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg mr-2"><Save size={16}/></button>
                                        <button onClick={() => setEditingItem(null)} className="p-2 bg-gray-100 text-gray-600 rounded-lg"><X size={16}/></button>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="p-5 font-bold text-gray-500 capitalize">{item.item_type}</td>
                                      <td className="p-5 font-black text-gray-900">{item.item_name}</td>
                                      <td className="p-5 text-center font-black text-gray-700">{item.base_price} AED</td>
                                      <td className="p-5 text-right space-x-2">
                                        <button onClick={() => { setEditingItem(item.id); setEditData({ name: item.item_name, price: item.base_price, type: item.item_type }); }} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                        <button onClick={() => deleteMasterItem(item.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </div>
              </>
            )}

            {/* ================= VIEW 2: TEMPLATES ================= */}
            {activeView === 'templates' && (
              <>
                <div className="lg:col-span-4 space-y-6">
                  {/* Create Template Box */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2"><FileText className="text-emerald-600"/> Create Layout Template</h2>
                    <div className="flex gap-2">
                      <input 
                        value={newTemplateName} 
                        onChange={e => setNewTemplateName(e.target.value)} 
                        placeholder="e.g. 2BHK Premium" 
                        className="flex-1 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-black text-emerald-900 text-sm focus:border-emerald-500 placeholder:font-bold placeholder:text-gray-400"
                      />
                      <button onClick={createTemplate} disabled={isSaving} className="px-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-colors"><Plus size={20}/></button>
                    </div>
                  </motion.div>

                  {/* Select Template & Add Items */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Select Template to Edit</label>
                    <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full p-3 bg-emerald-50 border-2 border-emerald-100 rounded-xl outline-none font-black text-emerald-900 mb-6">
                      <option value="">Choose Template...</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>

                    {selectedTemplate && (
                      <div className="pt-4 border-t border-gray-100">
                        <button onClick={() => setShowBulkSelect(!showBulkSelect)} className="w-full py-3 bg-emerald-50 text-emerald-700 font-black rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 border border-emerald-200">
                          {showBulkSelect ? <X size={18}/> : <Plus size={18}/>} {showBulkSelect ? "Cancel Selection" : "Select Multiple Items"}
                        </button>

                        {showBulkSelect && (
                          <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-80 overflow-y-auto custom-scrollbar">
                            {masterItems.map(m => (
                              <div key={m.id} className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-gray-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input type="checkbox" checked={bulkSelectedIds.includes(m.id)} onChange={() => toggleBulkSelect(m.id)} className="w-5 h-5 accent-emerald-600 cursor-pointer"/>
                                  <span className="font-black text-gray-900 text-sm">{m.item_name}</span>
                                </label>
                                {bulkSelectedIds.includes(m.id) && (
                                  <div className="flex gap-2 ml-8">
                                    <input type="number" placeholder="Qty" value={bulkInputs[m.id]?.qty} onChange={e => handleBulkInput(m.id, 'qty', e.target.value)} className="w-1/2 p-2 bg-emerald-50 border border-emerald-200 rounded-md outline-none font-black text-emerald-900 text-sm" />
                                    <input type="number" placeholder="Price" value={bulkInputs[m.id]?.price} onChange={e => handleBulkInput(m.id, 'price', e.target.value)} className="w-1/2 p-2 bg-emerald-50 border border-emerald-200 rounded-md outline-none font-black text-emerald-900 text-sm" />
                                  </div>
                                )}
                              </div>
                            ))}
                            <button onClick={addBulkTemplateItems} disabled={isSaving || bulkSelectedIds.length === 0} className="w-full py-3 mt-2 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 sticky bottom-0">
                               {isSaving ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>} Save Selected Items
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className="lg:col-span-8">
                  {selectedTemplate ? (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                         <h3 className="font-black text-emerald-900">Template Items: {templates.find(t=>t.id.toString()===selectedTemplate)?.name}</h3>
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                          <tr><th className="p-4">Item</th><th className="p-4 text-center">Std Qty</th><th className="p-4 text-center">Extra Price</th><th className="p-4 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {templateConfigs.map((c: any) => (
                            <tr key={c.equipment_id}>
                              <td className="p-4 font-bold text-gray-900">{c.equipment_master?.item_name} <br/><TypeBadge type={c.equipment_master?.item_type}/></td>
                              <td className="p-4 text-center font-black text-gray-600">{c.standard_qty}</td>
                              <td className="p-4 text-center font-black text-gray-600">{c.extra_unit_price}</td>
                              <td className="p-4 text-right"><button onClick={() => deleteTemplateItem(c.equipment_id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16}/></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  ) : (
                    <div className="h-full bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-4 min-h-[400px]">
                      <FileText size={60} className="opacity-20"/>
                      <p className="font-bold">Select a template to view or edit its items.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ================= VIEW 3: UNIT SETUP ================= */}
            {activeView === 'config' && (
              <>
                <div className="lg:col-span-4 space-y-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2 tracking-tight"><Building2 className="text-indigo-600"/> Setup Property Unit</h2>
                    <div className="space-y-4">
                      <select 
                        value={selectedCompany} 
                        onChange={e => { setSelectedCompany(e.target.value); setSelectedUnit(""); }} 
                        className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-black text-indigo-900 text-sm focus:border-indigo-500"
                      >
                        <option value="" className="font-bold text-gray-500">Choose Company...</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      
                      <select 
                        value={selectedUnit} 
                        onChange={e => setSelectedUnit(e.target.value)} 
                        disabled={!selectedCompany} 
                        className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none font-black text-indigo-900 text-sm focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="" className="font-bold text-gray-500">Choose Unit...</option>
                        {units.filter(u => u.company_id.toString() === selectedCompany).map(u => (
                          <option key={u.id} value={u.id}>{u.unit_number} {u.layout ? `(${formatLayout(u.layout)})` : ''} - {u.building_name}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>

                  {selectedUnit && (
                    <>
                      {/* Apply Template Block */}
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-50 p-6 rounded-3xl shadow-sm border border-indigo-100">
                        <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-2"><Copy size={12} className="inline mr-1"/> Apply a Template</label>
                        <div className="flex gap-2">
                          <select 
                            value={templateToApply} 
                            onChange={e => setTemplateToApply(e.target.value)} 
                            className="flex-1 p-3 bg-white border border-indigo-200 rounded-xl outline-none font-black text-indigo-900 text-sm"
                          >
                            <option value="" className="font-bold text-gray-500">Select Template...</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <button onClick={applyTemplateToUnit} disabled={isSaving || !templateToApply} className="px-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50"><CheckCircle2 size={18}/></button>
                        </div>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-3"><Plus size={12} className="inline mr-1"/> Add Items Manually</label>
                        <button onClick={() => setShowBulkSelect(!showBulkSelect)} className="w-full py-3 bg-gray-50 text-gray-700 font-black rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-200">
                          {showBulkSelect ? <X size={18}/> : <Plus size={18}/>} {showBulkSelect ? "Cancel Add" : "Select Equipment from Master"}
                        </button>

                        {showBulkSelect && (
                          <div className="mt-4 space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 max-h-80 overflow-y-auto custom-scrollbar">
                            {masterItems.map(m => (
                              <div key={m.id} className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-indigo-50">
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input type="checkbox" checked={bulkSelectedIds.includes(m.id)} onChange={() => toggleBulkSelect(m.id)} className="w-5 h-5 accent-indigo-600 cursor-pointer"/>
                                  <span className="font-black text-gray-900 text-sm">{m.item_name}</span>
                                </label>
                                {bulkSelectedIds.includes(m.id) && (
                                  <div className="flex gap-2 ml-8">
                                    <input type="number" placeholder="Std Qty" value={bulkInputs[m.id]?.qty} onChange={e => handleBulkInput(m.id, 'qty', e.target.value)} className="w-1/2 p-2 bg-indigo-50 border border-indigo-200 rounded-md outline-none font-black text-indigo-900 text-sm focus:border-indigo-500" />
                                    <input type="number" placeholder="Extra Price" value={bulkInputs[m.id]?.price} onChange={e => handleBulkInput(m.id, 'price', e.target.value)} className="w-1/2 p-2 bg-indigo-50 border border-indigo-200 rounded-md outline-none font-black text-indigo-900 text-sm focus:border-indigo-500" />
                                  </div>
                                )}
                              </div>
                            ))}
                            <button onClick={addBulkUnitConfigs} disabled={isSaving || bulkSelectedIds.length === 0} className="w-full py-3 mt-2 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 sticky bottom-0">
                               {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18}/>} Add to Unit Setup
                            </button>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </div>

                <div className="lg:col-span-8">
                  {selectedUnit ? (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
                        <div>
                           <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Active Setup for:</p>
                           <h3 className="text-xl font-black flex items-center gap-2">
                             Unit {units.find(u => u.id.toString() === selectedUnit)?.unit_number} 
                             <span className="bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded text-xs">{formatLayout(units.find(u => u.id.toString() === selectedUnit)?.layout)}</span>
                           </h3>
                           <p className="text-xs text-gray-400 font-bold mt-1">
                             <Building2 size={12} className="inline mr-1 text-gray-500"/>
                             {companies.find(c => c.id.toString() === selectedCompany)?.name} • {units.find(u => u.id.toString() === selectedUnit)?.building_name}
                           </p>
                        </div>
                        <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-black border border-white/20 shadow-inner">{unitConfigs.length} Items</span>
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                          <tr><th className="p-4">Equipment Item</th><th className="p-4 text-center">Std Qty</th><th className="p-4 text-center">Extra Charge</th><th className="p-4 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {unitConfigs.map(config => (
                            <tr key={config.id} className="hover:bg-indigo-50/40 transition-colors group">
                              {editingConfigId === config.id ? (
                                <>
                                  <td className="p-4 font-bold text-gray-900">{config.equipment_master?.item_name}</td>
                                  <td className="p-4 text-center"><input type="number" value={editConfigData.qty} onChange={e => setEditConfigData({...editConfigData, qty: e.target.value})} className="w-20 p-2 border-2 border-indigo-200 rounded-lg text-sm font-black text-indigo-900 text-center outline-none"/></td>
                                  <td className="p-4 text-center"><input type="number" value={editConfigData.price} onChange={e => setEditConfigData({...editConfigData, price: e.target.value})} className="w-24 p-2 border-2 border-indigo-200 rounded-lg text-sm font-black text-indigo-900 text-center outline-none"/></td>
                                  <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => saveEditUnitConfig(config.id)} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Save size={16}/></button>
                                    <button onClick={() => setEditingConfigId(null)} className="p-2 bg-gray-100 text-gray-600 rounded-lg"><X size={16}/></button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-4 font-bold text-gray-900">{config.equipment_master?.item_name} <br/><TypeBadge type={config.equipment_master?.item_type}/></td>
                                  <td className="p-4 text-center"><span className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md font-black text-xs border border-gray-200">{config.standard_qty} Qty</span></td>
                                  <td className="p-4 text-center font-black text-gray-900">{config.extra_unit_price} AED</td>
                                  <td className="p-4 text-right space-x-2">
                                    <button onClick={() => { setEditingConfigId(config.id); setEditConfigData({ qty: config.standard_qty.toString(), price: config.extra_unit_price.toString() }); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Edit2 size={18}/></button>
                                    <button onClick={() => deleteConfig(config.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                          {unitConfigs.length === 0 && (
                            <tr><td colSpan={4} className="p-16 text-center text-gray-400 font-bold"><Info size={40} className="mx-auto mb-2 opacity-20"/> No items configured. Apply a template or add manually.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </motion.div>
                  ) : (
                    <div className="h-full bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-4 min-h-[500px]">
                      <Info size={60} className="opacity-20"/>
                      <p className="font-bold text-center">Select a unit from the left panel<br/>to start configuring its inventory requirements</p>
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
