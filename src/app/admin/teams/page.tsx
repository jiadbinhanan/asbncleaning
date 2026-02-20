"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Archive, Check, User, 
  Briefcase, Loader2, X, Edit, Clock, CalendarDays, Filter 
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

  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [archiveDate, setArchiveDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  const fetchInitialData = useCallback(async () => {
    setLoadingActive(true);
    const { data: agentsData } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('role', 'agent');
    if (agentsData) setAgents(agentsData);

    const today = new Date().toISOString().split('T')[0];
    const { data: activeData } = await supabase.from('teams').select('*').eq('status', 'active').eq('shift_date', today).order('created_at', { ascending: false });
    if (activeData) setActiveTeams(activeData as Team[]);
    
    setLoadingActive(false);
  }, [supabase]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const fetchArchive = useCallback(async () => {
    if (activeTab !== 'archived') return;
    setLoadingArchive(true);
    let query = supabase.from('teams').select('*').eq('status', 'archived').order('shift_date', { ascending: false }).order('created_at', { ascending: false });
    
    if (archiveDate) {
      query = query.eq('shift_date', archiveDate);
    } else {
      query = query.limit(20);
    }

    const { data } = await query;
    if (data) setArchivedTeams(data as Team[]);
    setLoadingArchive(false);
  }, [supabase, activeTab, archiveDate]);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  const getAvailableAgents = () => {
    const busyAgentIds = activeTeams
      .filter(t => t.id !== editingTeamId) 
      .flatMap(t => t.member_ids);
    
    return agents.filter(agent => !busyAgentIds.includes(agent.id));
  };

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
    if(!confirm("Are you sure? Archiving this team will release its members for new assignments.")) return;
    
    const teamToArchive = activeTeams.find(t => t.id === id);
    setActiveTeams(activeTeams.filter(t => t.id !== id));
    
    if (teamToArchive) {
       setArchivedTeams([{ ...teamToArchive, status: 'archived', updated_at: new Date().toISOString() }, ...archivedTeams]);
    }

    const { error } = await supabase
      .from('teams')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      alert("Error archiving team");
    }
  };

  const getAgentDetails = (id: string) => agents.find(a => a.id === id);

  const displayTeams = activeTab === 'active' ? activeTeams : archivedTeams;
  const isLoading = activeTab === 'active' ? loadingActive : loadingArchive;

  return (
    <div className="min-h-screen pb-20 p-2 md:p-6">
      {/* ... (JSX is the same, but with Image components) */}
    </div>
  );
}
