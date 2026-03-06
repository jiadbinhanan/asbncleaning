'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UsersRound, UserPlus, Archive, CheckCircle2, User, 
  ShieldCheck, Loader2, X, Edit3, Clock, CalendarIcon, ListFilter 
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
  bookings?: any[]; // 🚨 NEW
};

export default function SupervisorTeamManagement() {
  const supabase = createClient();

  // Data States
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([]);
  
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

  // 1. INITIAL FETCH
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingActive(true);
      
      const { data: agentsData } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('role', 'agent');
      if (agentsData) setAgents(agentsData);

      const today = new Date().toISOString().split('T')[0];
      const { data: activeData } = await supabase.from('teams')
        .select('*, bookings(id, units(unit_number, companies(name)))') // 🚨 OPTIMIZED JOIN
        .eq('status', 'active').eq('shift_date', today).order('created_at', { ascending: false });
      if (activeData) setActiveTeams(activeData as Team[]);
      
      setLoadingActive(false);
    };

    fetchInitialData();
  }, [supabase]);

  // 2. ARCHIVE FETCH (Optimized API Calls)
  useEffect(() => {
    if (activeTab === 'archived') {
      if (!archiveDate && archivedTeams.length > 0) return; 

      const fetchArchive = async () => {
        setLoadingArchive(true);
        let query = supabase.from('teams')
          .select('*, bookings(id, units(unit_number, companies(name)))') // 🚨 OPTIMIZED JOIN
          .eq('status', 'archived').order('shift_date', { ascending: false }).order('created_at', { ascending: false });
        
        if (archiveDate) {
          query = query.eq('shift_date', archiveDate);
        } else {
          query = query.limit(20);
        }

        const { data } = await query;
        if (data) setArchivedTeams(data as Team[]);
        setLoadingArchive(false);
      };
      
      fetchArchive();
    }
  }, [activeTab, archiveDate, supabase]);

  // 3. ACTIONS
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
    setSelectedAgentIds(team.member_ids || []);
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
        setActiveTeams([data[0] as Team, ...activeTeams]);
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
        setActiveTeams(activeTeams.map(t => 
          t.id === editingTeamId ? { ...t, team_name: teamName, member_ids: selectedAgentIds, updated_at: timestamp } : t
        ));
        setIsModalOpen(false);
      }
    }
  };

  const handleArchiveTeam = async (id: number) => {
    if(!confirm("Are you sure? Archiving this team will mark it as closed for today.")) return;
    
    const teamToArchive = activeTeams.find(t => t.id === id);
    
    setActiveTeams(activeTeams.filter(t => t.id !== id));
    
    if (teamToArchive) {
       setArchivedTeams([{ ...teamToArchive, status: 'archived', updated_at: new Date().toISOString() }, ...archivedTeams]);
    }

    await supabase.from('teams').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id);
  };

  const getAgentDetails = (id: string) => agents.find(a => a.id === id);

  const displayTeams = activeTab === 'active' ? activeTeams : archivedTeams;
  const isLoading = activeTab === 'active' ? loadingActive : loadingArchive;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans selection:bg-indigo-200">
      
      {/* --- SUPERVISOR HEADER (Blue with Bottom-Right Light Indigo Gradient & Curved Corners) --- */}
      <div className="bg-gradient-to-tl from-indigo-400 via-blue-600 to-blue-700 pt-12 pb-24 px-6 md:px-10 shadow-2xl relative overflow-hidden rounded-b-[2.5rem] md:rounded-b-[3rem]">
        
        {/* Extra glowing effect strictly from the bottom-right corner */}
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-indigo-300/40 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-blue-900/10 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-blue-200 font-black uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
              <ShieldCheck size={14}/> Operations Control
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Team Assignments</h1>
            <p className="text-blue-100 mt-1 text-sm md:text-base font-medium">Build and manage your cleaning squads for today's shifts.</p>
          </div>
          
          <button 
            onClick={openCreateModal}
            className="group relative px-6 py-3.5 bg-white text-blue-900 rounded-2xl font-black shadow-xl hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <UserPlus size={18} className="relative z-10 text-indigo-600" /> 
            <span className="relative z-10">Form New Squad</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 relative z-20">
        
        {/* --- TABS & FILTERS --- */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex bg-slate-50 p-1.5 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => { setActiveTab('active'); setArchiveDate(''); }} 
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active Today
            </button>
            <button 
              onClick={() => setActiveTab('archived')} 
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${activeTab === 'archived' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Archived
            </button>
          </div>

          {activeTab === 'archived' && (
            <div className="flex items-center gap-2 w-full md:w-auto px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <CalendarIcon size={16} className="text-indigo-500" />
              <input 
                type="date" 
                value={archiveDate} 
                onChange={(e) => setArchiveDate(e.target.value)} 
                className="bg-transparent outline-none text-slate-800 font-bold text-sm w-full cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* --- TEAMS GRID --- */}
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[300px]"><Loader2 className="animate-spin text-indigo-600 size-12"/></div>
        ) : displayTeams.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
            <UsersRound size={56} className="mx-auto text-indigo-100 mb-4" />
            <h3 className="text-xl font-black text-slate-800">No {activeTab} squads available</h3>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              {activeTab === 'active' ? "Create a new squad to assign tasks." : "Select a different date to view history."}
            </p>
          </div>
        ) : activeTab === 'active' ? (
          /* --- ACTIVE TEAMS (Grid View) --- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {displayTeams.map((team, idx) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all overflow-hidden flex flex-col group"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-50 flex justify-between items-start bg-gradient-to-br from-indigo-50/50 to-white">
                    <div>
                      <h3 className="font-black text-xl text-slate-900">{team.team_name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                        <Clock size={12} className="text-indigo-400"/> 
                        Updated: {format(new Date(team.updated_at), "h:mm a")}
                      </p>

                      {/* 🚨 NEW: Assignment Status Badge */}
                      <div className="mt-3">
                        {team.bookings && team.bookings.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                            <CheckCircle2 size={12}/> Assigned: {team.bookings.map((b:any) => `${b.units?.companies?.name || 'Unknown'} (U-${b.units?.unit_number || '?'})`).join(', ')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                            <ShieldCheck size={12}/> Not Assigned
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(team)} className="p-2.5 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl shadow-sm border border-indigo-100 transition-all" title="Edit Team">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleArchiveTeam(team.id)} className="p-2.5 bg-white text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl shadow-sm border border-rose-100 transition-all" title="Archive Team">
                        <Archive size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Card Body - Members */}
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Squad Members</p>
                      <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">
                         {team.member_ids?.length || 0}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {team.member_ids && team.member_ids.map(memberId => {
                        const agent = getAgentDetails(memberId);
                        return (
                          <div key={memberId} className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 overflow-hidden shrink-0">
                               {agent?.avatar_url ? <img src={agent?.avatar_url} alt="" className="w-full h-full object-cover" /> : agent?.username?.slice(0,2).toUpperCase() || <User size={12}/>}
                            </div>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">
                              {agent?.full_name?.split(' ')[0] || agent?.username || "Agent"}
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
        ) : (
          /* --- ARCHIVED TEAMS (Timeline View) --- */
          <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-6">
            <AnimatePresence>
              {displayTeams.map((team, idx) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative pl-6 md:pl-8"
                >
                  {/* Timeline Dot */}
                  <div className="absolute -left-[11px] top-4 w-5 h-5 rounded-full border-4 border-[#F8FAFC] bg-slate-400 shadow-sm"></div>
                  
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-black text-lg text-slate-800">{team.team_name}</h3>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">Archived</span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                        <Clock size={12} /> Archived on {format(new Date(team.updated_at), "dd MMM yyyy, h:mm a")}
                      </p>

                      {/* 🚨 NEW: Assignment Status Badge for Archive */}
                      <div className="mt-2.5">
                        {team.bookings && team.bookings.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                            Assigned: {team.bookings.map((b:any) => `${b.units?.companies?.name || 'Unknown'} (U-${b.units?.unit_number || '?'})`).join(', ')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-200">
                            Not Assigned
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Members (Compact Chip Style) */}
                    <div className="flex flex-wrap gap-2 md:max-w-[50%] md:justify-end mt-2 md:mt-0">
                      {team.member_ids && team.member_ids.map(memberId => {
                        const agent = getAgentDetails(memberId);
                        return (
                          <div key={memberId} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600 overflow-hidden shrink-0">
                               {agent?.avatar_url ? <img src={agent?.avatar_url} alt="" className="w-full h-full object-cover" /> : agent?.username?.slice(0,2).toUpperCase() || <User size={10}/>}
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">
                              {agent?.full_name?.split(' ')[0] || agent?.username || "Agent"}
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

      </div>

      {/* --- PREMIUM CREATE / EDIT MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl z-[1000] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      {modalMode === 'create' ? <UserPlus className="text-indigo-600"/> : <Edit3 className="text-indigo-600"/>}
                      {modalMode === 'create' ? 'Assemble New Squad' : 'Modify Squad Roster'}
                   </h2>
                   <p className="text-sm text-slate-500 font-medium mt-1">Select agents to add them to this team.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Team Name Input */}
                <div className="mb-8">
                  <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 ml-1">Squad Identifier</label>
                  <input 
                    placeholder="e.g. Alpha Team, Floor 3 Crew..."
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none text-lg text-slate-900 font-black transition-all placeholder:font-bold placeholder:text-slate-300"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>

                {/* Agents Selection (No restrictions) */}
                <div>
                  <div className="flex justify-between items-center mb-4 ml-1">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><ListFilter size={12}/> All Agents</label>
                     <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                        {agents.length} Total Agents
                     </span>
                  </div>
                  
                  {agents.length === 0 ? (
                     <div className="p-6 bg-slate-50 text-slate-500 font-bold rounded-2xl text-sm text-center border-2 border-dashed border-slate-200">No agents found in the system.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {agents.map((agent) => {
                        const isSelected = selectedAgentIds.includes(agent.id);
                        
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
                            className={`p-3 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all active:scale-95 ${ 
                              isSelected 
                              ? "border-indigo-500 bg-indigo-50/50 shadow-sm" 
                              : "border-slate-100 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-sm font-black text-slate-500 overflow-hidden shrink-0 border-2 border-white shadow-sm">
                                 {agent.avatar_url ? (
                                    <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                                 ) : agent.username.slice(0,2).toUpperCase()}
                              </div>
                              <div>
                                 <span className={`block font-bold text-sm leading-tight ${isSelected ? "text-indigo-900" : "text-slate-700"}`}>
                                   {agent.full_name || agent.username}
                                 </span>
                                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Agent</span>
                              </div>
                            </div>
                            
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-200"}`}>
                              {isSelected && <CheckCircle2 size={14} strokeWidth={3} />} 
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="w-1/3 py-4 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-2xl font-black transition-colors">Cancel</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={!teamName || selectedAgentIds.length === 0}
                  className="w-2/3 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-xl shadow-indigo-500/20 transition-all flex justify-center items-center gap-2"
                >
                  {modalMode === 'create' ? <><CheckCircle2 size={20}/> Form Squad</> : <><Edit3 size={20}/> Save Changes</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
