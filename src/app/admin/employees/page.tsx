'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createEmployeeAction, deleteEmployeeAction, updateEmployeeCredentialsAction } from './actions';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Plus, Search, RotateCw, KeyRound, Eye, EyeOff } from 'lucide-react';
import ProfileSlideOver from '@/components/admin/employees/ProfileSlideOver';
import Image from 'next/image';
import { CardGridSkeleton } from '@/components/common/Skeleton';
import DotsLoader from '@/components/common/DotsLoader';
import Kbd from '@/components/common/Kbd';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Define the Profile type (can be moved to a types file later)
interface Profile {
  id: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
role: 'agent' | 'supervisor' | 'driver'; // 🚨 এখানে 'driver' যুক্ত করা হয়েছে  
phone: string | null;
}

export default function EmployeeManagement() {
  const supabase = createClient();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Profile | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form State (New Employee)
  const [newEmp, setNewEmp] = useState({ fullName: '', username: '', password: '', phone: '', role: 'agent' as 'agent' | 'supervisor' | 'driver' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- New States for Credentials Update ---
  const [isCredsOpen, setIsCredsOpen] = useState(false);
  const [credEmp, setCredEmp] = useState<Profile | null>(null);
  const [credsForm, setCredsForm] = useState({ username: '', password: '' });
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch Data using useCallback
  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['agent', 'supervisor', 'driver'])
      .order('created_at', { ascending: false });

    if (data) setEmployees(data as Profile[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Keyboard Shortcuts
  useKeyboardShortcuts([
    {
      combo: 'Alt+N',
      description: 'Add new staff',
      category: 'Actions',
      handler: () => setIsAddOpen(true),
    },
    {
      combo: 'Alt+R',
      description: 'Refresh employee directory',
      category: 'Actions',
      handler: () => {
        setLoading(true);
        fetchEmployees();
      },
    },
    {
      combo: '/',
      description: 'Focus staff search',
      category: 'Navigation',
      handler: () => searchInputRef.current?.focus(),
    },
    {
      combo: 'Escape',
      description: 'Close modals / slide-over',
      category: 'Modals',
      handler: () => {
        setIsAddOpen(false);
        setIsCredsOpen(false);
        setSelectedEmp(null);
      },
    },
  ]);

  // Create Handler
  const handleCreate = async (e: React.FormEvent) => { // 🚨 <HTMLFormElement> যুক্ত করা হয়েছে
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    Object.entries(newEmp).forEach(([key, value]) => formData.append(key, value));

    const result = await createEmployeeAction(formData);

    if (result.error) {
      alert('Error: ' + result.error);
    } else {
      setIsAddOpen(false);
      fetchEmployees();
      setNewEmp({ fullName: '', username: '', password: '', phone: '', role: 'agent' });
    }
    setIsSubmitting(false);
  };

  // Delete Handler
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    // Optimistic Remove
    setEmployees(employees.filter((e) => e.id !== id));
    if (selectedEmp?.id === id) setSelectedEmp(null);

    await deleteEmployeeAction(id);
  };
  
// --- Handler for Credentials Update ---
  const handleUpdateCredentials = async (e: React.FormEvent) => { // 🚨 <HTMLFormElement> যুক্ত করা হয়েছে
    e.preventDefault();
    if (!credEmp) return;
    setIsUpdatingCreds(true);

    const res = await updateEmployeeCredentialsAction(credEmp.id, credsForm.username, credsForm.password);
    
    if (res?.error) {
      alert("Error: " + res.error);
    } else {
      alert("Credentials updated successfully!");
      setIsCredsOpen(false);
      fetchEmployees(); // রিফ্রেশ ডেটা
    }
    setIsUpdatingCreds(false);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] pb-10 font-sans">

      {/* Header — Electric Cobalt & Radiant Cyan Waves (dark) */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white px-6 md:px-10 py-6 shadow-2xl relative overflow-hidden dark:border-b dark:border-cyan-500/20 dark:shadow-[0_12px_40px_rgba(6,182,212,0.15)]">
        {/* Light mode gradient */}
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:hidden' />

        {/* Dark mode multi-color cobalt cyan gradient */}
        <div className='absolute inset-0 hidden dark:block' style={{ background: 'linear-gradient(135deg, #030816 0%, #081533 20%, #0d2350 42%, #08344e 68%, #031022 100%)' }} />

        {/* Dark mode glowing cobalt orbs */}
        <div className='absolute -top-12 -left-12 w-96 h-96 hidden dark:block bg-blue-600/25 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute bottom-0 right-10 w-96 h-96 hidden dark:block bg-cyan-500/20 rounded-full blur-[90px] pointer-events-none' />

        {/* Dark mode SVG Electric Cobalt Waves */}
        <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block'>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 240" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="emp-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.32" />
                <stop offset="35%" stopColor="#06B6D4" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#0D9488" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="emp-grad-wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.28" />
                <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.22" />
                <stop offset="75%" stopColor="#6366F1" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="emp-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#22D3EE" stopOpacity="0.95" />
                <stop offset="85%" stopColor="#818CF8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#A5F3FC" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="emp-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
              </linearGradient>
              <filter id="emp-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M0,80 C300,20 540,130 840,60 C1140,-10 1320,110 1440,50 L1440,240 L0,240 Z" fill="url(#emp-grad-wave1)" />
            <path d="M0,80 C300,20 540,130 840,60 C1140,-10 1320,110 1440,50" stroke="url(#emp-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#emp-glow-cyan)" />
            <path d="M0,130 C240,170 480,70 760,120 C1040,170 1260,80 1440,110 L1440,240 L0,240 Z" fill="url(#emp-grad-wave2)" />
            <path d="M0,130 C240,170 480,70 760,120 C1040,170 1260,80 1440,110" stroke="url(#emp-crest-2)" strokeWidth="2" strokeLinecap="round" />
            <path d="M0,190 C340,220 660,150 980,190 C1200,220 1360,170 1440,180" stroke="url(#emp-crest-1)" strokeWidth="1.2" strokeDasharray="6 6" strokeOpacity="0.4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Light mode decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <User className="text-blue-500 dark:text-cyan-400" size={30} /> Employee Directory
            </h1>
            <p className="text-blue-300 dark:text-cyan-200/80 font-bold mt-1 text-sm">Manage Supervisors & Cleaning Agents</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search staff... [/]"
                className="w-full pl-10 pr-9 py-2.5 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder:text-gray-400 font-medium text-sm"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Kbd variant="glass" size="xs">/</Kbd>
              </div>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                fetchEmployees();
              }}
              title="Refresh Directory (Alt+R)"
              aria-label="Refresh Directory"
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 transition-all flex items-center justify-center"
            >
              <RotateCw size={18} />
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg whitespace-nowrap text-sm"
            >
              <Plus size={18} /> Add Staff
              <Kbd variant="dark" size="xs" className="bg-blue-800 text-blue-200 border-blue-700">Alt+N</Kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-10 pt-8">

      {/* Employee Grid */}
      {loading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <motion.div
              key={emp.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedEmp(emp)}
              className="bg-white dark:bg-[#0c1427] p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-lg cursor-pointer transition-all flex items-center gap-4 relative group"
            >
              <div
                className={`relative w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden border-2 ${emp.role === 'supervisor' ? 'border-orange-100 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400' : 'border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'}`}>
                {emp.avatar_url ? (
                  <Image src={emp.avatar_url} alt="Profile" fill className="object-cover" />
                ) : (
                  emp.full_name?.charAt(0).toUpperCase() || <User />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{emp.full_name || 'Unnamed'}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">@{emp.username}</p>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-md mt-1 inline-block capitalize font-semibold ${emp.role === 'supervisor' ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'}`}>
                  {emp.role}
                </span>
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCredEmp(emp);
                    setCredsForm({ username: emp.username, password: '' }); // পাসওয়ার্ড ব্ল্যাংক থাকবে
                    setIsCredsOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                  title="Change User ID & Password"
                >
                  <KeyRound size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      </div>{/* end content */}

      {/* Profile SlideOver Component */}
      <AnimatePresence>
        {selectedEmp && (
          <ProfileSlideOver employee={selectedEmp} onClose={() => setSelectedEmp(null)} onUpdate={fetchEmployees} onDelete={handleDelete} />
        )}
      </AnimatePresence>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl z-50 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Register New Staff</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1">Full Name</label>
                  <input
                    required
                    className="w-full p-3 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    value={newEmp.fullName}
                    onChange={(e) => setNewEmp({ ...newEmp, fullName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1">Username (ID)</label>
                    <input
                      required
                      placeholder="e.g. agent1"
                      className="w-full p-3 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                      value={newEmp.username}
                      onChange={(e) => setNewEmp({ ...newEmp, username: e.target.value.replace(/\s+/g, '').toLowerCase() })}
                    />
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Login ID will be: {newEmp.username || '...'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1">Phone</label>
                    <input
                      required
                      type="tel"
                      className="w-full p-3 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                      value={newEmp.phone}
                      onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1">Role</label>
                    <select
                      className="w-full p-3 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                      value={newEmp.role}
                      onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value as 'agent' | 'supervisor' | 'driver'})}
                    >
                      <option value="agent">Cleaning Agent</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="driver">Driver</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1">Password</label>
                    <input
                      required
                      type="password"
                      className="w-full p-3 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                      value={newEmp.password}
                      onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-4 mt-4 bg-gray-900 dark:bg-blue-600 text-white font-bold rounded-xl hover:bg-black dark:hover:bg-blue-500 transition-all flex justify-center shadow-lg"
                >
                  {isSubmitting ? <DotsLoader size="sm" variant="white" label="Creating Account..." /> : 'Create Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* --- CHANGE CREDENTIALS MODAL --- */}
      <AnimatePresence>
        {isCredsOpen && credEmp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCredsOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 w-full max-w-md rounded-[2rem] shadow-2xl p-6 md:p-8"
            >
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Update Credentials</h2>
              <p className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-6">
                Change User ID or Password for <span className="text-blue-600 dark:text-blue-400">{credEmp.full_name}</span>
              </p>

              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">New User ID (Username)</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-bold placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    placeholder="Leave blank to keep current"
                    value={credsForm.username}
                    onChange={(e) => setCredsForm({ ...credsForm, username: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">This will change their login ID.</p>
                </div>
                <div className="relative">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full p-4 pr-12 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-bold placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    placeholder="Leave blank to keep current"
                    value={credsForm.password}
                    onChange={(e) => setCredsForm({ ...credsForm, password: e.target.value })}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 mt-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={showPassword ? 'eye-off' : 'eye'}
                        initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                      </motion.div>
                    </AnimatePresence>
                  </button>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsCredsOpen(false)}
                    className="flex-1 py-3 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl font-medium disabled:opacity-50 transition-colors"
                    disabled={isUpdatingCreds}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={isUpdatingCreds}
                  >
                    {isUpdatingCreds ? <DotsLoader size="xs" variant="white" label="Updating..." /> : 'Update'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
