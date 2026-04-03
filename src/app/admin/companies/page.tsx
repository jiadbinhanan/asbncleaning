'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Building2, Plus, Search, Trash2, 
  Home, Key, Layers, ArrowRight, Loader2, 
  List, Grid, FileText, Table, Edit,
  Link as LinkIcon, Copy, MessageCircle, RefreshCw, ShieldAlert
} from 'lucide-react';

// --- Types ---
type Company = {
  id: number;
  name: string;
  portal_token?: string | null; // 🚨 NEW: Added portal_token
  units?: Unit[];
};

type Unit = {
  id: number;
  company_id: number;
  unit_number: string;
  building_name: string;
  layout: string;
  door_code: string;
};

export default function CompanyManagement() {
  const supabase = createClient();

  // States
  const [companies, setCompanies] = useState<Company[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  // Forms
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newUnit, setNewUnit] = useState({ unit_number: '', building_name: '', layout: '', door_code: '' });

  // Edit States
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [isEditUnitOpen, setIsEditUnitOpen] = useState(false);
  const [editUnitData, setEditUnitData] = useState({ id: 0, unit_number: '', building_name: '', layout: '', door_code: '' });

  // List View & Export States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [allData, setAllData] = useState<any[]>([]);

  // 🚨 NEW: Portal Link States
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // --- SINGLE UNIFIED FETCH ---
  useEffect(() => {
    const fetchEverything = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*, units(*)')
        .order('id', { ascending: true });

      if (data) {
        setCompanies(data);
        setAllData(data);
        if (data.length > 0 && !selectedCompany) {
          setSelectedCompany(data[0]);
          setUnits(data[0].units || []);
        }
      }
      setLoading(false);
    };

    if (allData.length === 0) fetchEverything();
  }, [supabase]);

  // --- LOCAL UPDATE ---
  useEffect(() => {
    if (selectedCompany && allData.length > 0) {
      const currentCompany = allData.find(c => c.id === selectedCompany.id);
      setUnits(currentCompany?.units || []);
    }
  }, [selectedCompany, allData]);

  // --- Export to Excel ---
  const exportToExcel = async () => {
    const rows: any[] = [];
    allData.forEach(comp => {
      rows.push({ 'Company Name': `🏢 ${comp.name} (Total Units: ${comp.units?.length || 0})`, 'Unit Number': '', 'Building': '', 'Layout': '', 'Door Code': '' });
      comp.units?.forEach((u: any) => {
        rows.push({ 'Company Name': '', 'Unit Number': `Unit ${u.unit_number}`, 'Building': u.building_name, 'Layout': u.layout, 'Door Code': u.door_code });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client_List");
    XLSX.writeFile(wb, "BTM_Cleaning_Clients.xlsx");
  };

  // --- Export to PDF ---
  const exportToPDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BTM Cleaning - Clients & Units List", 14, 20);

    const tableBody: any[] = [];
    allData.forEach(comp => {
      tableBody.push([{ content: comp.name, colSpan: 4, styles: { fillColor: [230, 230, 250], fontStyle: 'bold', textColor: [0,0,0] } }]);
      comp.units?.forEach((u: any) => {
        tableBody.push([`Unit ${u.unit_number}`, u.building_name, u.layout, u.door_code || 'N/A']);
      });
    });

    autoTable(doc, {
      startY: 30,
      head: [['Unit Number', 'Building', 'Layout', 'Door Code']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] } 
    });
    doc.save("BTM_Cleaning_Clients.pdf");
  };

  // --- Handlers ---
  const handleAddCompany = async () => {
    if (!newCompanyName || isSaving) return;
    setIsSaving(true);
    const { data } = await supabase.from('companies').insert([{ name: newCompanyName }]).select();
    if (data) {
        const newComp = { ...data[0], units: [] };
        setCompanies(prev => [...prev, newComp]);
        setAllData(prev => [...prev, newComp]);
        setSelectedCompany(newComp);
        setIsAddCompanyOpen(false);
        setNewCompanyName('');
        toast.success("Client added successfully!");
    }
    setIsSaving(false);
  };

  const handleDeleteCompany = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(!confirm('⚠️ WARNING: Deleting this company will also DELETE ALL its units! Are you sure?')) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (!error) {
      setCompanies(prev => prev.filter(c => c.id !== id));
      setAllData(prev => prev.filter(c => c.id !== id));
      if (selectedCompany?.id === id) {
        setSelectedCompany(null);
        setUnits([]);
      }
      toast.success("Client deleted successfully!");
    }
  };

  const handleAddUnit = async () => {
    if (!selectedCompany || !newUnit.unit_number || isSaving) return;
    setIsSaving(true);

    const sanitizedUnit = {
      unit_number: newUnit.unit_number,
      building_name: newUnit.building_name || 'Not Set',
      layout: newUnit.layout || 'Not Set',
      door_code: newUnit.door_code || 'Not Set'
    };

    const { data, error } = await supabase.from('units').insert([{ company_id: selectedCompany.id, ...sanitizedUnit }]).select();

    if (!error && data) {
        const newUnitData = data[0];
        const updatedAllData = allData.map(comp => 
          comp.id === selectedCompany.id ? { ...comp, units: [newUnitData, ...(comp.units || [])] } : comp
        );
        setAllData(updatedAllData);
        setIsAddUnitOpen(false);
        setNewUnit({ unit_number: '', building_name: '', layout: '', door_code: '' });
        toast.success("Unit added successfully!");
    } else if (error) {
        toast.error("Error: " + error.message);
    }
    setIsSaving(false);
  };

  const handleDeleteUnit = async (id: number) => {
    if(!confirm('Delete this unit?')) return;
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (!error) {
       const updatedAllData = allData.map(comp => 
          comp.id === selectedCompany?.id ? { ...comp, units: comp.units.filter((u:any) => u.id !== id) } : comp
        );
       setAllData(updatedAllData);
       toast.success("Unit deleted successfully!");
    }
  };

  const handleEditCompany = async () => {
    if (!selectedCompany || !editCompanyName || isSaving) return;
    setIsSaving(true);

    const { error } = await supabase.from('companies').update({ name: editCompanyName }).eq('id', selectedCompany.id);
    if (!error) {
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, name: editCompanyName } : c));
      setAllData(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, name: editCompanyName } : c));
      setSelectedCompany({ ...selectedCompany, name: editCompanyName });
      setIsEditCompanyOpen(false);
      toast.success("Client name updated!");
    }
    setIsSaving(false);
  };

  const handleEditUnit = async () => {
    if (!selectedCompany || !editUnitData.unit_number || isSaving) return;
    setIsSaving(true);

    const sanitizedUnit = {
      unit_number: editUnitData.unit_number,
      building_name: editUnitData.building_name || 'Not Set',
      layout: editUnitData.layout || 'Not Set',
      door_code: editUnitData.door_code || 'Not Set'
    };

    const { error } = await supabase.from('units').update(sanitizedUnit).eq('id', editUnitData.id);
    if (!error) {
      const updatedAllData = allData.map(comp => 
        comp.id === selectedCompany.id 
          ? { ...comp, units: comp.units.map((u:any) => u.id === editUnitData.id ? { ...u, ...sanitizedUnit } : u) } 
          : comp
      );
      setAllData(updatedAllData);
      setIsEditUnitOpen(false);
      toast.success("Unit updated successfully!");
    }
    setIsSaving(false);
  };

  // 🚨 NEW: PORTAL LINK LOGIC 🚨
  const handleGenerateLink = async () => {
    if (!selectedCompany) return;
    setIsGeneratingLink(true);
    const newToken = crypto.randomUUID();

    const { error } = await supabase.from('companies').update({ portal_token: newToken }).eq('id', selectedCompany.id);

    if (!error) {
      const updatedCompany = { ...selectedCompany, portal_token: newToken };
      setSelectedCompany(updatedCompany);
      setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
      setAllData(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
      toast.success("Secure Portal Link Generated!");
    } else {
      toast.error("Error generating link.");
    }
    setIsGeneratingLink(false);
  };

  const handleRevokeLink = async () => {
    if (!selectedCompany) return;
    if (!confirm("Are you sure? The previous link will instantly stop working for the client.")) return;
    setIsGeneratingLink(true);

    const { error } = await supabase.from('companies').update({ portal_token: null }).eq('id', selectedCompany.id);

    if (!error) {
      const updatedCompany = { ...selectedCompany, portal_token: null };
      setSelectedCompany(updatedCompany);
      setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
      setAllData(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
      toast.success("Portal Link Revoked!");
    } else {
      toast.error("Error revoking link.");
    }
    setIsGeneratingLink(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  const portalUrl = typeof window !== 'undefined' && selectedCompany?.portal_token 
    ? `${window.location.origin}/client/${selectedCompany.portal_token}` 
    : '';


  return (
    <>
      <div className="min-h-screen bg-[#F4F7FA] font-sans pb-24">
        <Toaster position="top-center" />
        {/* PREMIUM HEADER */}
        <div className="bg-gradient-to-br from-[#0A192F] via-[#112240] to-black text-white pt-10 pb-20 px-6 md:px-12 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
             <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
               <Building2 className="text-blue-500" size={36}/> Client & Property Management
             </h1>
             <p className="text-blue-300 font-bold mt-2">Oversee all registered client companies and their respective properties.</p>
           </div>

           <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

             {/* View Toggle */}
             <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10">
               <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`} title="Grid View"><Grid size={18}/></button>
               <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`} title="List View"><List size={18}/></button>
             </div>

             {/* Export Buttons */}
             {viewMode === 'list' && (
               <div className="flex gap-2">
                 <button onClick={exportToPDF} className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"><FileText size={16}/> PDF</button>
                 <button onClick={exportToExcel} className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all"><Table size={16}/> Excel</button>
               </div>
             )}

             <button 
               onClick={() => setIsAddCompanyOpen(true)}
               className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-500/30"
             >
               <Plus size={16}/> Add Client
             </button>
           </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 relative z-20">
          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]"><Loader2 className="animate-spin text-blue-600 size-12"/></div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'list' ? (
                /* LIST VIEW */
                <motion.div 
                  key="list-view"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-gray-100"
                >
                  {allData.length === 0 ? <div className="flex justify-center items-center min-h-[400px]"><Loader2 className="animate-spin text-blue-500 mx-auto my-10" size={32}/></div> : (
                    <div className="space-y-6">
                      {allData.map(comp => (
                        <div key={comp.id} className="border border-gray-200 rounded-[2rem] overflow-hidden">
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-black text-lg text-gray-900 flex items-center gap-2"><Building2 size={20} className="text-blue-600"/> {comp.name}</h3>
                            <div className="flex items-center gap-3">
                               {/* 🚨 NEW: Portal Link button for List View */}
                               <button onClick={() => { setSelectedCompany(comp); setIsPortalModalOpen(true); }} className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${comp.portal_token ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'}`}>
                                 <LinkIcon size={14} className={comp.portal_token ? 'text-blue-500' : ''}/> Portal Link
                               </button>
                               <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-lg border border-gray-200 hidden sm:block">{comp.units?.length || 0} Units</span>
                            </div>
                          </div>
                          <div className="p-6">
                            {comp.units?.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {comp.units.map((u:any) => (
                                  <div key={u.id} className="flex items-center gap-3 p-4 bg-white border border-gray-100 hover:border-blue-200 rounded-2xl shadow-sm transition-all">
                                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Home size={18}/></div>
                                    <div>
                                      <p className="text-sm font-black text-gray-900">Unit {u.unit_number}</p>
                                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{u.building_name} • {u.layout}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 font-bold px-2 py-4">No units added yet.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* GRID VIEW */
                <motion.div 
                  key="grid-view"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className='grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8'
                >
                    {/* ---------------- LEFT COLUMN: COMPANIES LIST (বাম দিক) ---------------- */}
                    <div className='md:col-span-5 lg:col-span-4 w-full bg-white rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col overflow-hidden min-w-0 h-full md:min-h-[700px]'>
                        <div className='p-6 md:p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4 shrink-0'>
                            <h2 className='text-xl font-black text-gray-800 flex items-center justify-between gap-2'>
                                <div className="flex items-center gap-2"><Building2 className='text-blue-600' /> Clients</div>
                                <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-lg border border-gray-200">{companies.length} Total</span>
                            </h2>
                            <div className='relative'>
                                <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={16} />
                                <input 
                                    type='text' 
                                    placeholder='Find client...' 
                                    className='w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold placeholder:font-normal'
                                />
                            </div>
                        </div>

                        <div className='flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar'>
                            {companies.length === 0 ? (
                                <div className='text-center p-10 text-gray-400 font-bold border-2 border-dashed border-gray-100 rounded-3xl'>No clients found. Add one!</div>
                            ) : (
                                companies.map((company) => (
                                    <div
                                        key={company.id}
                                        onClick={() => setSelectedCompany(company)}
                                        className={`p-5 rounded-2xl cursor-pointer transition-all border flex justify-between items-center group relative ${
                                            selectedCompany?.id === company.id 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' 
                                            : 'bg-white text-gray-600 border-gray-100 hover:border-blue-100 hover:bg-blue-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 pr-2 w-full overflow-hidden">
                                          <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${selectedCompany?.id === company.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}><Building2 size={20}/></div>
                                          <div className="flex-1 min-w-0">
                                            <h3 className={`font-black break-words whitespace-normal leading-tight ${selectedCompany?.id === company.id ? 'text-white' : 'text-gray-900'}`}>{company.name}</h3>
                                            <p className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${selectedCompany?.id === company.id ? 'text-blue-100' : 'text-gray-400'}`}>Client ID: #{company.id}</p>
                                          </div>
                                        </div>

                                        <div className='flex items-center gap-2 shrink-0'>
                                            <button
                                                onClick={(e) => handleDeleteCompany(e, company.id)}
                                                className={`p-2 rounded-full transition-all ${
                                                    selectedCompany?.id === company.id 
                                                    ? 'text-white/70 hover:text-white hover:bg-red-500' 
                                                    : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                                                }`}
                                                title='Delete Company'
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <ArrowRight size={18} className={`${selectedCompany?.id === company.id ? 'text-white' : 'text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all'}`}/>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ---------------- RIGHT COLUMN: UNITS MANAGEMENT (ডান দিক) ---------------- */}
                    <div className='md:col-span-7 lg:col-span-8 w-full bg-white rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col overflow-hidden relative min-w-0 h-full md:min-h-[700px]'>
                        {selectedCompany ? (
                        <>
                            <div className='p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 shrink-0'>
                              <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Managing Units For</p>
                                  <div className="flex items-center gap-3">
                                    <h2 className='text-2xl font-black text-gray-900'>{selectedCompany.name}</h2>
                                    {/* Edit Button */}
                                    <button onClick={() => { setEditCompanyName(selectedCompany.name); setIsEditCompanyOpen(true); }} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit Client Name">
                                       <Edit size={18} />
                                    </button>
                                    {/* 🚨 NEW: Share / Portal Link Button */}
                                    <button onClick={() => setIsPortalModalOpen(true)} className={`transition-colors p-1 ${selectedCompany.portal_token ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-blue-600'}`} title="Client Portal Link">
                                       <LinkIcon size={18} />
                                    </button>
                                  </div>
                                  <p className='text-sm font-bold text-gray-500 mt-1 flex items-center gap-2'>
                                  <Layers size={14} className="text-blue-500"/> Total Units: {units.length}
                                  </p>
                              </div>
                              <button 
                                  onClick={() => setIsAddUnitOpen(true)}
                                  className='px-5 py-3 bg-gray-900 text-white rounded-xl text-sm font-black shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 w-full md:w-auto active:scale-95'
                              >
                                  <Plus size={16} /> Add New Unit
                              </button>
                            </div>

                            <div className='flex-1 bg-gray-50/50 p-4 md:p-8 overflow-y-auto custom-scrollbar'>
                              {units.length === 0 ? (
                                  <div className='text-center p-12 bg-white rounded-3xl border border-gray-200 shadow-sm mt-10'>
                                    <Home size={48} className='mx-auto mb-4 text-gray-300' />
                                    <p className="text-lg font-black text-gray-800">No units registered.</p>
                                    <p className="text-sm font-bold text-gray-500 mt-1">Click "Add New Unit" to associate properties with this client.</p>
                                  </div>
                              ) : (
                                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                  <AnimatePresence>
                                    {units.map((unit, i) => (
                                        <motion.div
                                          key={unit.id}
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                          transition={{ delay: i * 0.05 }}
                                          className='bg-white border border-gray-200 p-5 rounded-3xl hover:shadow-md hover:border-blue-300 transition-all group relative'
                                        >
                                          <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Home size={20}/></div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { setEditUnitData(unit); setIsEditUnitOpen(true); }}
                                                    className='text-gray-300 hover:text-blue-500 transition-colors hover:bg-blue-50 p-2 rounded-full'
                                                    title='Edit Unit'
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUnit(unit.id)}
                                                    className='text-gray-300 hover:text-red-500 transition-colors hover:bg-red-50 p-2 rounded-full'
                                                    title='Delete Unit'
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                          </div>

                                          <h4 className='font-black text-gray-900 text-xl mb-1'>Unit {unit.unit_number}</h4>
                                          <p className='text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-4'><Building2 size={14}/> {unit.building_name}</p>

                                          <div className='space-y-2 pt-4 border-t border-gray-50 text-sm'>
                                              <div className='flex items-center gap-2 font-bold text-gray-600 bg-gray-50 px-3 py-2 rounded-xl text-xs'>
                                                <Layers size={14} className='text-blue-500' />
                                                <span className='truncate'>{unit.layout}</span>
                                              </div>
                                              <div className='flex items-center gap-2 font-bold text-gray-600 bg-gray-50 px-3 py-2 rounded-xl text-xs'>
                                                <Key size={14} className='text-amber-500' />
                                                Code: <span className='text-gray-900 font-black tracking-widest'>{unit.door_code || 'N/A'}</span>
                                              </div>
                                          </div>
                                        </motion.div>
                                    ))}
                                  </AnimatePresence>
                                  </div>
                              )}
                            </div>
                        </>
                        ) : (
                        <div className='flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 text-gray-400'>
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
                              <Building2 size={40} className="text-gray-300"/>
                            </div>
                            <h3 className="text-xl font-black text-gray-800">Select a Client</h3>
                            <p className="text-gray-500 font-medium max-w-sm mt-2">Choose a company from the left panel to view and manage their physical units.</p>
                        </div>
                        )}
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Add Company Modal */}
      <AnimatePresence>
        {isAddCompanyOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsAddCompanyOpen(false)}
              className='absolute inset-0 bg-gray-900/60 backdrop-blur-sm'
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8'
            >
              <h2 className='text-2xl font-black text-gray-900 mb-2'>New Client</h2>
              <p className="text-sm font-bold text-gray-500 mb-6">Register a new property management company.</p>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Company Name</label>
                <input 
                  autoFocus
                  className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400 font-bold'
                  placeholder='e.g. Arabian Coast'
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCompany()}
                />
              </div>

              <div className='flex gap-3 mt-8'>
                <button onClick={() => setIsAddCompanyOpen(false)} className='flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-medium disabled:opacity-50' disabled={isSaving}>Cancel</button>
                <button onClick={handleAddCompany} className='flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2' disabled={isSaving}>
                  {isSaving && <Loader2 size={16} className="animate-spin"/>} 
                  Save Client
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Unit Modal */}
      <AnimatePresence>
        {isAddUnitOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsAddUnitOpen(false)}
              className='absolute inset-0 bg-gray-900/60 backdrop-blur-sm'
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 md:p-8'
            >
              <h2 className='text-2xl font-black text-gray-900 mb-2'>Add New Unit</h2>
              <p className='text-gray-500 text-sm mb-6 font-bold'>Adding unit for <span className="text-blue-600">{selectedCompany?.name}</span></p>

              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                   <div>
                     <label className='text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5'>Unit No</label>
                     <input 
                       className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400 font-bold'
                       placeholder='e.g. 5411'
                       value={newUnit.unit_number}
                       onChange={(e) => setNewUnit({...newUnit, unit_number: e.target.value})}
                       onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                     />
                   </div>
                   <div>
                     <label className='text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5'>Door Code</label>
                     <input 
                       className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400 font-bold'
                       placeholder='e.g. 6422'
                       value={newUnit.door_code}
                       onChange={(e) => setNewUnit({...newUnit, door_code: e.target.value})}
                       onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                     />
                   </div>
                </div>

                <div>
                   <label className='text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5'>Building Name</label>
                   <input 
                     className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400 font-bold'
                     placeholder='e.g. Paramount Hotel'
                     value={newUnit.building_name}
                     onChange={(e) => setNewUnit({...newUnit, building_name: e.target.value})}
                     onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
                   />
                </div>

                <div>
                   <label className='text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5'>Layout</label>
                   <select 
                     className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold'
                     value={newUnit.layout}
                     onChange={(e) => setNewUnit({...newUnit, layout: e.target.value})}
                   >
                     <option value=''>Select Layout</option>
                     <option value='1-BR Apartment'>1-BR Apartment</option>
                     <option value='2-BR Apartment'>2-BR Apartment</option>
                     <option value='2-BR + Bunker'>2-BR + Bunker</option>
                     <option value='3-BR Apartment'>3-BR Apartment</option>
                     <option value='4-BR Apartment'>4-BR Apartment</option>
                     <option value='5-BR Apartment'>5-BR Apartment</option>
                     <option value='Studio'>Studio</option>
                     <option value='Villa'>Villa</option>
                     <option value='Office'>Office</option>
                   </select>
                </div>
              </div>

              <div className='flex gap-3 mt-8'>
                <button onClick={() => setIsAddUnitOpen(false)} className='flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-medium disabled:opacity-50' disabled={isSaving}>Cancel</button>
                <button onClick={handleAddUnit} className='flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2' disabled={isSaving}>
                  {isSaving && <Loader2 size={16} className="animate-spin"/>} 
                  Add Unit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Edit Company Modal */}
      <AnimatePresence>
        {isEditCompanyOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsEditCompanyOpen(false)}
              className='absolute inset-0 bg-gray-900/60 backdrop-blur-sm'
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8'
            >
              <h2 className='text-2xl font-black text-gray-900 mb-2'>Edit Client Name</h2>
              <p className="text-sm font-bold text-gray-500 mb-6">Update the registered name for this client.</p>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Company Name</label>
                <input 
                  autoFocus
                  className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold'
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEditCompany()}
                />
              </div>

              <div className='flex gap-3 mt-8'>
                <button onClick={() => setIsEditCompanyOpen(false)} className='flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-medium disabled:opacity-50' disabled={isSaving}>Cancel</button>
                <button onClick={handleEditCompany} className='flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2' disabled={isSaving}>
                  {isSaving && <Loader2 size={16} className="animate-spin"/>} 
                  Update Client
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Edit Unit Modal */}
      <AnimatePresence>
        {isEditUnitOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isSaving && setIsEditUnitOpen(false)}
              className='absolute inset-0 bg-gray-900/60 backdrop-blur-sm'
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-6 md:p-8'
            >
              <h2 className='text-2xl font-black text-gray-900 mb-2'>Edit Unit Details</h2>
              <p className='text-gray-500 text-sm mb-6 font-bold'>Updating unit for <span className="text-blue-600">{selectedCompany?.name}</span></p>

              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                   <div>
                     <label className='text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5'>Unit No</label>
                     <input 
                       className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold'
                       value={editUnitData.unit_number}
                       onChange={(e) => setEditUnitData({...editUnitData, unit_number: e.target.value})}
                     />
                   </div>
                   <div>
                     <label className='text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5'>Door Code</label>
                     <input 
                       className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold'
                       value={editUnitData.door_code === 'Not Set' ? '' : editUnitData.door_code}
                       onChange={(e) => setEditUnitData({...editUnitData, door_code: e.target.value})}
                     />
                   </div>
                </div>

                <div>
                   <label className='text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5'>Building Name</label>
                   <input 
                     className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold'
                     value={editUnitData.building_name === 'Not Set' ? '' : editUnitData.building_name}
                     onChange={(e) => setEditUnitData({...editUnitData, building_name: e.target.value})}
                   />
                 </div>

                <div>
                   <label className='text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5'>Layout</label>
                   <select 
                     className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold'
                     value={editUnitData.layout === 'Not Set' ? '' : editUnitData.layout}
                     onChange={(e) => setEditUnitData({...editUnitData, layout: e.target.value})}
                   >
                     <option value=''>Select Layout</option>
                     <option value='1-BR Apartment'>1-BR Apartment</option>
                     <option value='2-BR Apartment'>2-BR Apartment</option>
                     <option value='2-BR + Bunker'>2-BR + Bunker</option>
                     <option value='3-BR Apartment'>3-BR Apartment</option>
                     <option value='4-BR Apartment'>4-BR Apartment</option>
                     <option value='5-BR Apartment'>5-BR Apartment</option>
                     <option value='Studio'>Studio</option>
                     <option value='Villa'>Villa</option>
                     <option value='Office'>Office</option>
                   </select>
                </div>
              </div>

              <div className='flex gap-3 mt-8'>
                <button onClick={() => setIsEditUnitOpen(false)} className='flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-medium disabled:opacity-50' disabled={isSaving}>Cancel</button>
                <button onClick={handleEditUnit} className='flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2' disabled={isSaving}>
                  {isSaving && <Loader2 size={16} className="animate-spin"/>} 
                  Update Unit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚨 5. PORTAL LINK MODAL (NEW FEATURE) 🚨 */}
      <AnimatePresence>
        {isPortalModalOpen && selectedCompany && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isGeneratingLink && setIsPortalModalOpen(false)}
              className='absolute inset-0 bg-gray-900/60 backdrop-blur-sm'
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className='relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden'
            >
              <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-50 to-white border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className='text-2xl font-black text-gray-900 flex items-center gap-2'>
                    <LinkIcon className="text-blue-600" /> Client Portal Link
                  </h2>
                  <p className="text-sm font-bold text-gray-500 mt-1">Manage secure access for <span className="text-blue-600">{selectedCompany.name}</span></p>
                </div>
              </div>

              <div className="p-6 md:p-8 bg-white">
                {!selectedCompany.portal_token ? (
                  <div className="text-center py-6">
                     <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                       <LinkIcon size={32} className="text-gray-300" />
                     </div>
                     <h3 className="text-lg font-black text-gray-800 mb-2">No Active Link</h3>
                     <p className="text-sm font-bold text-gray-500 mb-8 max-w-sm mx-auto">Generate a secure, PIN-less portal link to allow this client to view their property reports.</p>

                     <button 
                       onClick={handleGenerateLink} 
                       disabled={isGeneratingLink}
                       className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                     >
                       {isGeneratingLink ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18}/>}
                       Generate Secure Link
                     </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Secure URL</label>
                      <div className="flex items-center gap-2">
                         <input 
                           readOnly 
                           value={portalUrl} 
                           className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-900 font-medium text-sm outline-none"
                         />
                         <button onClick={() => copyToClipboard(portalUrl)} className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors border border-gray-200" title="Copy Link">
                           <Copy size={18} />
                         </button>
                      </div>
                    </div>

                    <a 
                      href={`https://wa.me/?text=${encodeURIComponent(`Hello from BTM Cleaning Services! Here is your secure client portal link to view your property reports: ${portalUrl}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full py-4 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-2xl font-black shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <MessageCircle size={20}/> Send via WhatsApp
                    </a>

                    <div className="border-t border-dashed border-gray-200 my-4 pt-6">
                      <div className="flex items-start gap-3 bg-red-50 p-4 rounded-2xl border border-red-100">
                        <ShieldAlert size={20} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-black text-red-900 mb-1">Security Control</h4>
                          <p className="text-xs font-bold text-red-700/80 mb-3">If the link is compromised, you can revoke access immediately. The client will no longer be able to open the old link.</p>
                          <button 
                            onClick={handleRevokeLink}
                            disabled={isGeneratingLink}
                            className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-xs font-black transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                          >
                            {isGeneratingLink ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14}/>} Revoke & Reset Link
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button onClick={() => setIsPortalModalOpen(false)} className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-black rounded-xl transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}