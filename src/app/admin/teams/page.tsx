"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Archive, Check, User, 
  Briefcase, Loader2, X, Edit, Clock, CalendarDays, Filter 
} from 'lucide-react';
import { format } from 'date-fns';

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

  // Data States (Separated for API Optimization)
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);     // State 1: Active 
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([]); // State 2: Archived
  
  // Loaders
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [archiveDate, setArchiveDate] = useState<string>('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);

  // Form States
  const [teamName, setTeamName] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  // ---------------------------------------------------------
  // 1. INITIAL FETCH: Call ONLY ONCE on page load
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingActive(true);
      
      // Fetch Agents
      const { data: agentsData } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('role', 'agent');
      if (agentsData) setAgents(agentsData);

      // Fetch Today's Active Teams
      const today = new Date().toISOString().split('T')[0];
      const { data: activeData } = await supabase.from('teams').select('*').eq('status', 'active').eq('shift_date', today).order('created_at', { ascending: false });
      if (activeData) setActiveTeams(activeData as Team[]);
      
      setLoadingActive(false);
    };

    fetchInitialData();
  }, []); // Empty dependency array means it runs ONLY ONCE

  // ---------------------------------------------------------
  // 2. ARCHIVE FETCH: Call ONLY when viewing archive tab or date changes
  // ---------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'archived') {
      const fetchArchive = async () => {
        setLoadingArchive(true);
        let query = supabase.from('teams').select('*').eq('status', 'archived').order('shift_date', { ascending: false }).order('created_at', { ascending: false });
        
        if (archiveDate) {
          query = query.eq('shift_date', archiveDate);
        } else {
          query = query.limit(20); // Limit to save bandwidth if no date selected
        }

        const { data } = await query;
        if (data) setArchivedTeams(data as Team[]);
        setLoadingArchive(false);
      };
      
      fetchArchive();
    }
  }, [activeTab, archiveDate]); // Runs only when tab is 'archived' or date changes

  // ---------------------------------------------------------
  // 3. AVAILABILITY LOGIC (Client Side)
  // ---------------------------------------------------------
  const getAvailableAgents = () => {
    // Check against activeTeams only
    const busyAgentIds = activeTeams
      .filter(t => t.id !== editingTeamId) 
      .flatMap(t => t.member_ids);
    
    return agents.filter(agent => !busyAgentIds.includes(agent.id));
  };

  // ---------------------------------------------------------
  // 4. ACTIONS (Optimistic Updates to save API re-fetches)
  // ---------------------------------------------------------
  const openCreateModal = () => {
    setModalMode('create');
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
    if (!teamName || selectedAgentIds.length === 0) return;

    const timestamp = new Date().toISOString();
    const today = timestamp.split('T')[0];

    if (modalMode === 'create') {
      const { data, error } = await supabase.from('teams').insert([{
        team_name: teamName,
        member_ids: selectedAgentIds,
        status: 'active',
        shift_date: today,
        updated_at: timestamp
      }]).select();

      if (!error && data) {
        setActiveTeams([data[0] as Team, ...activeTeams]); // Optimistic Update UI
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
        // Optimistic Update UI
        setActiveTeams(activeTeams.map(t => 
          t.id === editingTeamId ? { ...t, team_name: teamName, member_ids: selectedAgentIds, updated_at: timestamp } : t
        ));
        setIsModalOpen(false);
      }
    }
  };

  const handleArchiveTeam = async (id: number) => {
    if(!confirm("Are you sure? Archiving this team will release its members for new assignments.")) return;
    
    const teamToArchive = activeTeams.find(t => t.id === id);
    
    // 1. Optimistic Update (Remove from active immediately)
    setActiveTeams(activeTeams.filter(t => t.id !== id));
    
    // 2. Add to archive state if we are tracking it locally
    if (teamToArchive) {
       setArchivedTeams([{ ...teamToArchive, status: 'archived', updated_at: new Date().toISOString() }, ...archivedTeams]);
    }

    const { error } = await supabase
      .from('teams')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      alert("Error archiving team");
      // Optionally reload the page or fetch active teams again to fix state
    }
  };

  const getAgentDetails = (id: string) => agents.find(a => a.id === id);

  // Variable to decide which list to show
  const displayTeams = activeTab === 'active' ? activeTeams : archivedTeams;
  const isLoading = activeTab === 'active' ? loadingActive : loadingArchive;

  return (
    <div className="min-h-screen pb-20 p-2 md:p-6">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Briefcase className="text-blue-600" /> Team Management
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2 font-medium">
            <CalendarDays size={16}/> Today: {format(new Date(), "dd MMM yyyy")}
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={openCreateModal}
            className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={20} /> Create Squad
          </button>
        </div>
      </div>

      {/* --- Tabs & Filters --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex bg-gray-100 p-1.5 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => { setActiveTab('active'); setArchiveDate(''); }} 
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Active Squads
          </button>
          <button 
            onClick={() => setActiveTab('archived')} 
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'archived' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Archived History
          </button>
        </div>

        {activeTab === 'archived' && (
          <div className="flex items-center gap-2 w-full md:w-auto bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <Filter size={18} className="text-gray-400 ml-2" />
            <input 
              type="date" 
              value={archiveDate} 
              onChange={(e) => setArchiveDate(e.target.value)} 
              className="p-1.5 bg-transparent outline-none text-gray-900 font-bold text-sm w-full"
            />
          </div>
        )}
      </div>

      {/* --- Teams Grid --- */}
      {isLoading ? (
        <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>
      ) : displayTeams.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-gray-200 border-dashed">
          <Users size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-500">No {activeTab} teams found</h3>
          <p className="text-gray-400 text-sm mt-2 font-medium">
            {activeTab === 'active' ? "Start by creating a squad for the morning shift." : "Try selecting a different date."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {displayTeams.map((team, idx) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
              >
                {/* Status Banner */}
                <div className={`absolute top-0 left-0 w-full h-1.5 ${activeTab === 'active' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-gray-300'}`}></div>
                
                <div className="flex justify-between items-start mb-6 pt-2">
                  <div className="flex items-center gap-3">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${activeTab === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        {team.team_name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <h3 className="font-bold text-lg text-gray-900">{team.team_name}</h3>
                        <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                           <Clock size={12} /> {format(new Date(team.updated_at), "h:mm a")}
                        </p>
                     </div>
                  </div>

                  {/* Actions (Only for Active Teams) */}
                  {activeTab === 'active' ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(team)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit / Adjust Members"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleArchiveTeam(team.id)}
                        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                        title="Archive Team & Release Members"
                      >
                        <Archive size={18} />
                      </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      Archived
                    </span>
                  )}
                </div>

                {/* Members List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Members</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                       {team.member_ids?.length || 0} People
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {team.member_ids && team.member_ids.map(memberId => {
                      const agent = getAgentDetails(memberId);
                      return (
                        <div key={memberId} className="flex items-center gap-3 p-2 bg-gray-50/80 rounded-xl border border-gray-100">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
                             {agent?.avatar_url ? (
                                <img src={agent?.avatar_url} alt="" className="w-full h-full object-cover" />
                             ) : (
                                agent?.username?.slice(0,2).toUpperCase() || <User size={14}/>
                             )}
                          </div>
                          <span className="text-sm font-bold text-gray-800">
                            {agent?.full_name || agent?.username || "Unknown Agent"}
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
                   <h2 className="text-xl font-bold text-gray-900">
                      {modalMode === 'create' ? 'Create New Squad' : 'Adjust Team Members'}
                   </h2>
                   <p className="text-sm text-gray-500 font-medium mt-1">
                      {modalMode === 'create' ? 'Select available agents for today.' : 'Add or remove members based on workload.'}
                   </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Team Name</label>
                  <input 
                    placeholder="e.g. Team Alpha"
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg text-gray-900 font-bold placeholder:font-normal"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Available Agents</label>
                     <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                        {getAvailableAgents().length} Available
                     </span>
                  </div>
                  
                  {agents.length === 0 ? (
                     <div className="p-4 bg-yellow-50 text-yellow-700 font-medium rounded-xl text-sm">No agents in system.</div>
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
                            className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                              isSelected 
                              ? "border-blue-500 bg-blue-50" 
                              : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 bg-white"}`}>
                              {isSelected ? <Check size={14} strokeWidth={3} /> : <UserPlus size={14} className="text-gray-300"/>}
                            </div>
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden">
                               {agent.avatar_url ? (
                                  <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                               ) : agent.username.slice(0,2).toUpperCase()}
                            </div>
                            <div>
                               <span className={`block font-bold text-sm ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                                 {agent.full_name || agent.username}
                               </span>
                               {isSelected && <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Assigned</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-bold">Cancel</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={!teamName || selectedAgentIds.length === 0}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all"
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
