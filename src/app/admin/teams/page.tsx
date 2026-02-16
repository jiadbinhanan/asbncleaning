'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Trash2, Check, User, 
  Briefcase, Loader2, X, Edit, Clock, CalendarDays, History 
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

// --- Types ---
type Agent = {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
};

type Team = {
  id: number;
  team_name: string;
  member_ids: string[];
  status: string;
  created_at: string;
  updated_at: string;
  shift_date: string;
};

export default function TeamManagement() {
  const supabase = createClient();

  // States
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);

  // Form States
  const [teamName, setTeamName] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  // ---------------------------------------------------------
  // 1. DATA FETCHING
  // ---------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // ১. সব এজেন্ট আনো
    const { data: agentsData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('role', 'agent');

    // ২. শুধু আজকের এক্টিভ টিমগুলো আনো (History আলাদা পেজে দেখানো ভালো)
    const today = new Date().toISOString().split('T')[0];
    
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .eq('status', 'active') // শুধু রানিং টিম
      .eq('shift_date', today) // শুধু আজকের ডেট
      .order('created_at', { ascending: false });

    if (agentsData) setAgents(agentsData as Agent[]);
    if (teamsData) setTeams(teamsData as Team[]);
    
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------
  // 2. AVAILABILITY LOGIC (The Brain) 🧠
  // ---------------------------------------------------------
  const getAvailableAgents = () => {
    const busyAgentIds = teams
      .filter(t => t.id !== editingTeamId)
      .flatMap(t => t.member_ids);
    
    return agents.filter(agent => !busyAgentIds.includes(agent.id));
  };

  // ---------------------------------------------------------
  // 3. ACTIONS
  // ---------------------------------------------------------

  const openCreateModal = () => {
    setModalMode('create');
    setEditingTeamId(null);
    setTeamName('');
    setSelectedAgentIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setModalMode('edit');
    setEditingTeamId(team.id);
    setTeamName(team.team_name);
    setSelectedAgentIds(team.member_ids);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!teamName || selectedAgentIds.length === 0) {
      alert('Please enter team name and select members.');
      return;
    }

    const timestamp = new Date().toISOString();

    if (modalMode === 'create') {
      const { data } = await supabase.from('teams').insert([{
        team_name: teamName,
        member_ids: selectedAgentIds,
        status: 'active',
        shift_date: new Date().toISOString().split('T')[0],
        updated_at: timestamp
      }]).select();

      if (data) {
        setTeams([data[0], ...teams]);
        setIsModalOpen(false);
      }
    } else if (modalMode === 'edit' && editingTeamId) {
      const { error } = await supabase
        .from('teams')
        .update({
          team_name: teamName,
          member_ids: selectedAgentIds,
          updated_at: timestamp
        })
        .eq('id', editingTeamId);

      if (!error) {
        setTeams(teams.map(t => 
          t.id === editingTeamId 
          ? { ...t, team_name: teamName, member_ids: selectedAgentIds, updated_at: timestamp } 
          : t
        ));
        setIsModalOpen(false);
      }
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if(!confirm('Are you sure? This will remove the team from today\'s schedule.')) return;
    
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (!error) {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  const getAgentDetails = (id: string) => agents.find(a => a.id === id);

  return (
    <div className="min-h-screen pb-20 p-2 md:p-6">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Briefcase className="text-blue-600" /> Daily Squad
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <CalendarDays size={16}/> Today: {format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all" title="View History">
            <History size={20} />
          </button>
          
          <button 
            onClick={openCreateModal}
            className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={20} /> Create Squad
          </button>
        </div>
      </div>

      {/* --- Teams Grid --- */}
      {loading ? (
        <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-gray-200 border-dashed">
          <Users size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-500">No active teams for today</h3>
          <p className="text-gray-400 text-sm mt-2">Start by creating a squad for the morning shift.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {teams.map((team, idx) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-lg">
                        {team.team_name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <h3 className="font-bold text-lg text-gray-800">{team.team_name}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                           <Clock size={10} /> Updated: {format(new Date(team.updated_at), 'h:mm a')}
                        </p>
                     </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(team)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit / Adjust Members"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Disband Team"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Members</p>
                    <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                       {team.member_ids?.length || 0} On Duty
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {team.member_ids && team.member_ids.map(memberId => {
                      const agent = getAgentDetails(memberId);
                      return (
                        <div key={memberId} className="flex items-center gap-3 p-2 bg-gray-50/80 rounded-xl border border-gray-50">
                          <div className="relative w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
                             {agent?.avatar_url ? (
                                <Image src={agent.avatar_url} alt="Avatar" fill className="object-cover" />
                             ) : (
                                agent?.username?.slice(0,2).toUpperCase() || <User size={14}/>
                             )}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {agent?.full_name || agent?.username || 'Unknown Agent'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* --- CREATE / EDIT MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                   <h2 className="text-xl font-bold text-gray-800">
                      {modalMode === 'create' ? 'Create New Squad' : 'Adjust Team Members'}
                   </h2>
                   <p className="text-sm text-gray-500">
                      {modalMode === 'create' ? 'Select available agents for today.' : 'Add or remove members based on workload.'}
                   </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Team Name</label>
                  <input 
                    placeholder="e.g. Team Alpha"
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                     <label className="block text-sm font-bold text-gray-700">Available Agents</label>
                     <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        {getAvailableAgents().length} Available
                     </span>
                  </div>
                  
                  {agents.length === 0 ? (
                     <div className="p-4 bg-yellow-50 text-yellow-600 rounded-xl text-sm">No agents in system.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {agents.map((agent) => {
                        const isSelected = selectedAgentIds.includes(agent.id);
                        const isAvailable = getAvailableAgents().find(a => a.id === agent.id);
                        
                        if (!isSelected && !isAvailable) return null;

                        return (
                          <div 
                            key={agent.id}
                            onClick={() => {
                               if (isSelected) {
                                  setSelectedAgentIds(selectedAgentIds.filter(id => id !== agent.id));
                               } else {
                                  setSelectedAgentIds([...selectedAgentIds, agent.id]);
                               }
                            }}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                              isSelected 
                              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" 
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 bg-white"}`}>
                              {isSelected ? <Check size={14} /> : <UserPlus size={14} className="text-gray-300"/>}
                            </div>
                            <div className="relative w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
                               {agent.avatar_url ? (
                                  <Image src={agent.avatar_url} alt="Avatar" fill className="object-cover" />
                               ) : agent.username.slice(0,2).toUpperCase()}
                            </div>
                            <div>
                               <span className={`block font-medium text-sm ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                                 {agent.full_name || agent.username}
                               </span>
                               {isSelected && <span className="text-[10px] text-green-600 font-bold">Assigned</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-medium">Cancel</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={!teamName || selectedAgentIds.length === 0}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                >
                  {modalMode === 'create' ? 'Create Squad' : 'Update & Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
