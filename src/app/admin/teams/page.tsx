'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Trash2, Check, Search, 
  Shield, User, Briefcase, Loader2, X 
} from 'lucide-react';

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
  member_ids: string[]; // Array of UUIDs
};

export default function TeamManagement() {
  const supabase = createClient();

  // States
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  // ---------------------------------------------------------
  // 1. DATA FETCHING
  // ---------------------------------------------------------
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // ১. সব এজেন্টদের নিয়ে আসা
    const { data: agentsData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('role', 'agent'); // শুধু এজেন্টদের দরকার

    // ২. সব টিম নিয়ে আসা
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('id', { ascending: false });

    if (agentsData) setAgents(agentsData);
    if (teamsData) setTeams(teamsData);
    
    setLoading(false);
  };

  // ---------------------------------------------------------
  // 2. ACTIONS
  // ---------------------------------------------------------
  
  // Toggle Agent Selection
  const toggleAgentSelection = (agentId: string) => {
    if (selectedAgentIds.includes(agentId)) {
      setSelectedAgentIds(selectedAgentIds.filter(id => id !== agentId));
    } else {
      setSelectedAgentIds([...selectedAgentIds, agentId]);
    }
  };

  // Create Team
  const handleCreateTeam = async () => {
    if (!newTeamName || selectedAgentIds.length === 0) {
      alert('Please enter a team name and select at least one member.');
      return;
    }

    // Optimistic Update
    const tempTeam = { 
      id: Date.now(), 
      team_name: newTeamName, 
      member_ids: selectedAgentIds 
    };
    setTeams([tempTeam, ...teams]);
    setIsCreateOpen(false);
    setNewTeamName('');
    setSelectedAgentIds([]);

    // DB Call
    const { data, error } = await supabase.from('teams').insert([{
      team_name: newTeamName,
      member_ids: selectedAgentIds
    }]).select();

    if (error) {
      console.error(error);
      alert('Failed to create team');
      fetchData(); // Revert on error
    } else if (data) {
      // Replace temp with real data
      setTeams([data[0], ...teams.filter(t => t.id !== tempTeam.id)]);
    }
  };

  // Delete Team
  const handleDeleteTeam = async (id: number) => {
    if(!confirm('Delete this team?')) return;

    // Optimistic Remove
    const prevTeams = [...teams];
    setTeams(teams.filter(t => t.id !== id));

    const { error } = await supabase.from('teams').delete().eq('id', id);
    
    if (error) {
      alert('Error deleting team');
      setTeams(prevTeams);
    }
  };

  // Helper to get agent details by ID
  const getAgentDetails = (id: string) => agents.find(a => a.id === id);

  return (
    <div className='min-h-screen pb-20'>
      
      {/* --- Page Header --- */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-gray-800 flex items-center gap-3'>
            <Briefcase className='text-blue-600' /> Team Management
          </h1>
          <p className='text-gray-500 mt-1'>Create and manage cleaning crews.</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className='px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2'
        >
          <UserPlus size={20} /> Create New Team
        </button>
      </div>

      {/* --- Teams Grid --- */}
      {loading ? (
        <div className='flex justify-center mt-20'><Loader2 className='animate-spin text-blue-500' size={40}/></div>
      ) : teams.length === 0 ? (
        <div className='text-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed'>
          <Users size={64} className='mx-auto text-gray-200 mb-4' />
          <h3 className='text-xl font-bold text-gray-400'>No teams created yet</h3>
          <p className='text-gray-400 text-sm'>Click the button above to start.</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          <AnimatePresence>
            {teams.map((team, idx) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.1 }}
                className='bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative'
              >
                {/* Delete Button */}
                <button 
                  onClick={() => handleDeleteTeam(team.id)}
                  className='absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100'
                >
                  <Trash2 size={18} />
                </button>

                <div className='flex items-center gap-4 mb-6'>
                  <div className='w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-xl border border-blue-100'>
                    {team.team_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className='font-bold text-lg text-gray-800'>{team.team_name}</h3>
                    <p className='text-sm text-gray-500'>{team.member_ids?.length || 0} Members</p>
                  </div>
                </div>

                {/* Member Avatars */}
                <div className='space-y-3'>
                  <p className='text-xs font-bold text-gray-400 uppercase tracking-wider'>Team Members</p>
                  <div className='flex flex-col gap-2'>
                    {team.member_ids && team.member_ids.map(memberId => {
                      const agent = getAgentDetails(memberId);
                      return (
                        <div key={memberId} className='flex items-center gap-3 p-2 bg-gray-50 rounded-xl'>
                          <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600'>
                            {agent?.username?.slice(0,2).toUpperCase() || <User size={14}/>}
                          </div>
                          <span className='text-sm font-medium text-gray-700'>
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

      {/* --- CREATE TEAM MODAL --- */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className='bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]'
            >
              {/* Modal Header */}
              <div className='p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50'>
                <h2 className='text-xl font-bold text-gray-800'>Create New Team</h2>
                <button onClick={() => setIsCreateOpen(false)} className='p-2 hover:bg-gray-200 rounded-full text-gray-500'>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className='p-6 overflow-y-auto flex-1'>
                {/* Team Name Input */}
                <div className='mb-6'>
                  <label className='block text-sm font-bold text-gray-700 mb-2'>Team Name</label>
                  <input 
                    autoFocus
                    placeholder='e.g. Team Alpha'
                    className='w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg'
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>

                {/* Agent Selection Grid */}
                <div>
                  <label className='block text-sm font-bold text-gray-700 mb-3'>Select Members</label>
                  {agents.length === 0 ? (
                     <div className='p-4 bg-yellow-50 text-yellow-600 rounded-xl text-sm'>No agents found in the system. Create agents first!</div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      {agents.map((agent) => {
                        const isSelected = selectedAgentIds.includes(agent.id);
                        return (
                          <div 
                            key={agent.id}
                            onClick={() => toggleAgentSelection(agent.id)}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                              isSelected 
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'}`}>
                              {isSelected && <Check size={14} />}
                            </div>
                            <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600'>
                              {agent.username.slice(0,2).toUpperCase()}
                            </div>
                            <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                              {agent.full_name || agent.username}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className='p-6 border-t border-gray-100 bg-gray-50 flex gap-3'>
                <button onClick={() => setIsCreateOpen(false)} className='flex-1 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-medium'>Cancel</button>
                <button 
                  onClick={handleCreateTeam} 
                  disabled={!newTeamName || selectedAgentIds.length === 0}
                  className='flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200'
                >
                  Create Team ({selectedAgentIds.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}