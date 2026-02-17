'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Search, Trash2, 
  Home, Key, Layers, ArrowRight, Loader2 
} from 'lucide-react';

// --- Types ---
type Company = {
  id: number;
  name: string;
};

type Unit = {
  id: number;
  company_id: number; // Foreign Key Added to Type
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
  const [unitLoading, setUnitLoading] = useState(false);

  // Modals
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  
  // Forms
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newUnit, setNewUnit] = useState({ unit_number: '', building_name: '', layout: '', door_code: '' });

  // ---------------------------------------------------------
  // 1. INITIAL LOAD: Fetch Companies Only
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) console.error('Error fetching companies:', error);
      
      if (data) {
        setCompanies(data);
        // যদি কোম্পানি থাকে, তবে প্রথমটি সিলেক্ট করো
        if (data.length > 0) {
          setSelectedCompany(data[0]); 
        }
      }
      setLoading(false);
    };

    fetchCompanies();
  }, [supabase]);

  // ---------------------------------------------------------
  // 2. REACTIVE FETCH: Fetch Units whenever 'selectedCompany' changes
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchUnits = async () => {
      if (!selectedCompany) return;

      setUnitLoading(true);
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('id', { ascending: false }); // Changed from 'created_at'

      if (error) console.error('Error fetching units:', error);
      
      if (data) {
        setUnits(data);
      } else {
        setUnits([]);
      }
      setUnitLoading(false);
    };

    fetchUnits();
  }, [selectedCompany, supabase]); // এই dependency [] খুবই গুরুত্বপূর্ণ

  // ---------------------------------------------------------
  // Actions
  // ---------------------------------------------------------

  // Add Company
  const handleAddCompany = async () => {
    if (!newCompanyName) return;
    const { data, error } = await supabase.from('companies').insert([{ name: newCompanyName }]).select();
    
    if (data) {
      setCompanies([...companies, data[0]]);
      setSelectedCompany(data[0]); // Auto select new company
      setIsAddCompanyOpen(false);
      setNewCompanyName('');
    }
  };

  // Delete Company
  const handleDeleteCompany = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(!confirm('⚠️ WARNING: Deleting this company will also DELETE ALL its units! Are you sure?')) return;

    const { error } = await supabase.from('companies').delete().eq('id', id);
    
    if (!error) {
      const updatedCompanies = companies.filter(c => c.id !== id);
      setCompanies(updatedCompanies);
      
      // Reset Selection Logic
      if (selectedCompany?.id === id) {
        if (updatedCompanies.length > 0) setSelectedCompany(updatedCompanies[0]);
        else {
          setSelectedCompany(null);
          setUnits([]);
        }
      }
    }
  };

  // Add Unit
  const handleAddUnit = async () => {
    if (!selectedCompany || !newUnit.unit_number) return;
    
    const optimisticUnit = { ...newUnit, id: Date.now(), company_id: selectedCompany.id };
    const previousUnits = [...units];

    setUnits([optimisticUnit, ...units]);
    setIsAddCompanyOpen(false);
    setNewUnit({ unit_number: '', building_name: '', layout: '', door_code: '' });

    const { data, error } = await supabase.from('units').insert([{
      company_id: selectedCompany.id,
      ...newUnit
    }]).select();

    if (error) {
      console.error('Error adding unit:', error);
      alert('Failed to add unit!');
      setUnits(previousUnits); 
    } else if (data) {
        // Replace optimistic unit with the real one from the DB
        setUnits(prevUnits => [data[0], ...prevUnits.filter(u => u.id !== optimisticUnit.id)]);
    }
  };

  // Delete Unit
  const handleDeleteUnit = async (id: number) => {
    if(!confirm('Delete this unit?')) return;
    
    const previousUnits = [...units];
    setUnits(units.filter(u => u.id !== id));

    const { error } = await supabase.from('units').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting unit:', error);
      alert('Failed to delete unit!');
      setUnits(previousUnits); // Revert
    }
  };

  return (
    <div className='h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6'>
      
      {/* ---------------- LEFT COLUMN: COMPANIES LIST ---------------- */}
      <div className='w-full md:w-1/3 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden'>
        {/* Header */}
        <div className='p-6 border-b border-gray-100 bg-gray-50/50'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
              <Building2 className='text-blue-600' /> Clients
            </h2>
            <button 
              onClick={() => setIsAddCompanyOpen(true)}
              className='p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-all'
            >
              <Plus size={20} />
            </button>
          </div>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={16} />
            <input 
              type='text' 
              placeholder='Find client...' 
              className='w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm'
            />
          </div>
        </div>

        {/* List */}
        <div className='flex-1 overflow-y-auto p-3 space-y-2'>
          {loading ? (
            <div className='flex justify-center p-10'><Loader2 className='animate-spin text-blue-500'/></div>
          ) : companies.length === 0 ? (
             <div className='text-center p-10 text-gray-400'>No clients found. Add one!</div>
          ) : (
            companies.map((company) => (
              <motion.div
                key={company.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedCompany(company)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border flex justify-between items-center group relative ${
                  selectedCompany?.id === company.id 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' 
                  : 'bg-white text-gray-600 border-gray-100 hover:border-blue-100 hover:bg-blue-50'
                }`}
              >
                <div className='flex-1 font-semibold truncate pr-8'>{company.name}</div>
                
                {/* Delete Company Button */}
                <div className='flex items-center gap-2'>
                    {selectedCompany?.id === company.id && <ArrowRight size={16} className='opacity-80' />}
                    
                    <button
                        onClick={(e) => handleDeleteCompany(e, company.id)}
                        className={`p-1.5 rounded-lg transition-all ${
                            selectedCompany?.id === company.id 
                            ? 'text-blue-200 hover:text-white hover:bg-white/20' 
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                        }`}
                        title='Delete Company'
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ---------------- RIGHT COLUMN: UNITS MANAGEMENT ---------------- */}
      <div className='w-full md:w-2/3 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden relative'>
        {selectedCompany ? (
          <>
            {/* Header */}
            <div className='p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50'>
              <div>
                <h2 className='text-2xl font-bold text-gray-800'>{selectedCompany.name}</h2>
                <p className='text-sm text-gray-500 mt-1 flex items-center gap-2'>
                  <Layers size={14} /> Total Units: {units.length}
                </p>
              </div>
              <button 
                onClick={() => setIsAddUnitOpen(true)}
                className='px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium shadow-lg hover:bg-black transition-all flex items-center gap-2'
              >
                <Plus size={18} /> Add Unit
              </button>
            </div>

            {/* Units Grid */}
            <div className='flex-1 overflow-y-auto p-6'>
              {unitLoading ? (
                <div className='flex justify-center mt-20'><Loader2 className='animate-spin text-gray-400' size={30}/></div>
              ) : units.length === 0 ? (
                <div className='text-center mt-20 text-gray-400'>
                  <Home size={48} className='mx-auto mb-3 opacity-20' />
                  <p>No units added yet for this client.</p>
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  <AnimatePresence>
                  {units.map((unit, i) => (
                    <motion.div
                      key={unit.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.05 }}
                      className='bg-white border border-gray-100 p-5 rounded-2xl hover:shadow-lg hover:border-blue-100 transition-all group relative'
                    >
                      <button 
                        onClick={() => handleDeleteUnit(unit.id)}
                        className='absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-full'
                        title='Delete Unit'
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className='flex items-center gap-3 mb-3'>
                        <div className='w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold'>
                          {unit.unit_number.slice(0,2)}
                        </div>
                        <div>
                          <h3 className='font-bold text-gray-800 text-lg'>{unit.unit_number}</h3>
                          <p className='text-xs text-gray-400'>{unit.layout}</p>
                        </div>
                      </div>
                      
                      <div className='space-y-2 text-sm text-gray-500 mt-4 pt-4 border-t border-gray-50'>
                        <div className='flex items-center gap-2'>
                          <Building2 size={14} className='text-gray-400' />
                          <span className='truncate'>{unit.building_name}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Key size={14} className='text-gray-400' />
                          <span className='font-mono bg-gray-100 px-1.5 rounded text-gray-700'>{unit.door_code || 'N/A'}</span>
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
          <div className='flex-1 flex flex-col items-center justify-center text-gray-400'>
             <Building2 size={64} className='opacity-10 mb-4' />
             <p>Select a client from the left to manage units.</p>
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}
      
      {/* 1. Add Company Modal */}
      <AnimatePresence>
        {isAddCompanyOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddCompanyOpen(false)}
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className='bg-white rounded-3xl p-8 w-full max-w-md z-10 shadow-2xl'
            >
              <h3 className='text-xl font-bold mb-4'>Add New Client</h3>
              <input 
                autoFocus
                className='w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 mb-6'
                placeholder='Client Name (e.g. Arabian Coast)'
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
              />
              <div className='flex gap-3'>
                <button onClick={() => setIsAddCompanyOpen(false)} className='flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-medium'>Cancel</button>
                <button onClick={handleAddCompany} className='flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700'>Save Client</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Add Unit Modal */}
      <AnimatePresence>
        {isAddUnitOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddUnitOpen(false)}
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className='bg-white rounded-3xl p-8 w-full max-w-lg z-10 shadow-2xl'
            >
              <h3 className='text-xl font-bold mb-1'>Add Unit for {selectedCompany?.name}</h3>
              <p className='text-gray-400 text-sm mb-6'>Enter property details carefully.</p>
              
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                   <div className='space-y-1'>
                     <label className='text-xs font-bold text-gray-500 uppercase'>Unit No</label>
                     <input 
                       className='w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500'
                       placeholder='e.g. 5411'
                       value={newUnit.unit_number}
                       onChange={(e) => setNewUnit({...newUnit, unit_number: e.target.value})}
                     />
                   </div>
                   <div className='space-y-1'>
                     <label className='text-xs font-bold text-gray-500 uppercase'>Door Code</label>
                     <input 
                       className='w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500'
                       placeholder='e.g. 6422'
                       value={newUnit.door_code}
                       onChange={(e) => setNewUnit({...newUnit, door_code: e.target.value})}
                     />
                   </div>
                </div>

                <div className='space-y-1'>
                   <label className='text-xs font-bold text-gray-500 uppercase'>Building Name</label>
                   <input 
                     className='w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500'
                     placeholder='e.g. Paramount Hotel'
                     value={newUnit.building_name}
                     onChange={(e) => setNewUnit({...newUnit, building_name: e.target.value})}
                   />
                </div>

                <div className='space-y-1'>
                   <label className='text-xs font-bold text-gray-500 uppercase'>Layout</label>
                   <select 
                     className='w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500'
                     value={newUnit.layout}
                     onChange={(e) => setNewUnit({...newUnit, layout: e.target.value})}
                   >
                     <option value=''>Select Layout</option>
                     <option value='Studio'>Studio</option>
                     <option value='1-BR Apartment'>1-BR Apartment</option>
                     <option value='2-BR Apartment'>2-BR Apartment</option>
                     <option value='3-BR Apartment'>3-BR Apartment</option>
                     <option value='Villa'>Villa</option>
                     <option value='Office'>Office</option>
                   </select>
                </div>
              </div>

              <div className='flex gap-3 mt-8'>
                <button onClick={() => setIsAddUnitOpen(false)} className='flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-medium'>Cancel</button>
                <button onClick={handleAddUnit} className='flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black'>Add Unit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
