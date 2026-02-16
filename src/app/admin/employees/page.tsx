'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createEmployeeAction, deleteEmployeeAction } from './actions';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Plus, Search, Loader2 } from 'lucide-react';
import ProfileSlideOver from '@/components/admin/employees/ProfileSlideOver';
import Image from 'next/image';

// Define the Profile type (can be moved to a types file later)
interface Profile {
  id: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'agent' | 'supervisor';
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

  // Form State (New Employee)
  const [newEmp, setNewEmp] = useState({ fullName: '', username: '', password: '', phone: '', role: 'agent' as 'agent' | 'supervisor' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Data using useCallback
  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['agent', 'supervisor'])
      .order('created_at', { ascending: false });

    if (data) setEmployees(data as Profile[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Create Handler
  const handleCreate = async (e: React.FormEvent) => {
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

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employee Directory</h1>
          <p className="text-gray-500 text-sm">Manage Supervisors & Cleaning Agents</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search staff..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <motion.div
              key={emp.id}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedEmp(emp)}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg cursor-pointer transition-all flex items-center gap-4"
            >
              <div
                className={`relative w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden border-2 ${emp.role === 'supervisor' ? 'border-orange-100 bg-orange-50 text-orange-600' : 'border-blue-100 bg-blue-50 text-blue-600'}`}>
                {emp.avatar_url ? (
                  <Image src={emp.avatar_url} alt="Profile" fill className="object-cover" />
                ) : (
                  emp.full_name?.charAt(0).toUpperCase() || <User />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{emp.full_name || 'Unnamed'}</h3>
                <p className="text-sm text-gray-500 font-medium">@{emp.username}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md mt-1 inline-block capitalize ${emp.role === 'supervisor' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  {emp.role}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl z-50 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Register New Staff</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-600 block mb-1">Full Name</label>
                  <input
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    value={newEmp.fullName}
                    onChange={(e) => setNewEmp({ ...newEmp, fullName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-600 block mb-1">Username (ID)</label>
                    <input
                      required
                      placeholder="e.g. agent1"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      value={newEmp.username}
                      onChange={(e) => setNewEmp({ ...newEmp, username: e.target.value.replace(/\s+/g, '').toLowerCase() })}
                    />
                    <p className="text-xs text-gray-400 mt-1">Login ID will be: {newEmp.username || '...'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-600 block mb-1">Phone</label>
                    <input
                      required
                      type="tel"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      value={newEmp.phone}
                      onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-gray-600 block mb-1">Role</label>
                    <select
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      value={newEmp.role}
                      onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value as 'agent' | 'supervisor' })}
                    >
                      <option value="agent">Cleaning Agent</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-600 block mb-1">Password</label>
                    <input
                      required
                      type="password"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      value={newEmp.password}
                      onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-4 mt-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all flex justify-center shadow-lg"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
