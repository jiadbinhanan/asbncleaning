"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { DashboardSkeleton } from "@/components/common/Skeleton";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// Components
import DashboardHeader from "@/components/supervisor/dashboard/DashboardHeader";
import OverviewCards from "@/components/supervisor/dashboard/OverviewCards";
import TodaysWorkField from "@/components/supervisor/dashboard/TodaysWorkField";
import TeamRadar from "@/components/supervisor/dashboard/TeamRadar";
import ActivityFeed from "@/components/supervisor/dashboard/ActivityFeed";

export default function SupervisorDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<any>(null);
  
  // 🚨 ADVANCED FILTER STATE
  const [filter, setFilter] = useState({
    type: 'month', // 'month', 'date', 'range'
    month: format(new Date(), 'yyyy-MM'),
    singleDate: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });
  
  const [monthlyBookings, setMonthlyBookings] = useState<any[]>([]);
  const [todayTeams, setTodayTeams] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Calculate Date Range based on Filter Type
    let queryStart, queryEnd;
    
    if (filter.type === 'month') {
      const year = parseInt(filter.month.split('-')[0]);
      const monthIndex = parseInt(filter.month.split('-')[1]) - 1;
      queryStart = format(startOfMonth(new Date(year, monthIndex)), 'yyyy-MM-dd');
      queryEnd = format(endOfMonth(new Date(year, monthIndex)), 'yyyy-MM-dd');
    } else if (filter.type === 'date') {
      queryStart = filter.singleDate;
      queryEnd = filter.singleDate;
    } else {
      queryStart = filter.startDate;
      queryEnd = filter.endDate;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // 2. 🚨 Single Parallel Fetch
    const [profileRes, bookingsRes, teamsRes] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
      supabase.from('bookings').select(`id, status, price, cleaning_date, cleaning_time, service_type, units(unit_number, companies(name)), teams(team_name)`).gte('cleaning_date', queryStart).lte('cleaning_date', queryEnd),
      supabase.from('teams').select(`id, team_name, member_ids, status, bookings!bookings_assigned_team_id_fkey(id, status)`).eq('shift_date', todayStr)
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (bookingsRes.data) setMonthlyBookings(bookingsRes.data);
    if (teamsRes.data) setTodayTeams(teamsRes.data);

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [supabase, filter]); 

  useKeyboardShortcuts([
    {
      combo: 'Alt+R',
      description: 'Refresh supervisor dashboard',
      category: 'Actions',
      handler: fetchDashboardData,
    },
    {
      combo: '1',
      description: 'Filter by month',
      category: 'Filters',
      handler: () => setFilter(f => ({ ...f, type: 'month' })),
    },
    {
      combo: '2',
      description: 'Filter by single date',
      category: 'Filters',
      handler: () => setFilter(f => ({ ...f, type: 'date' })),
    },
    {
      combo: '3',
      description: 'Filter by date range',
      category: 'Filters',
      handler: () => setFilter(f => ({ ...f, type: 'range' })),
    },
  ]);

  if (loading) return <div className="p-4 md:p-8 min-h-screen bg-[#F4F7FA] dark:bg-[#070b14]"><DashboardSkeleton /></div>;

  // --- 📊 CALCULATIONS ---
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const revenueProcessed = monthlyBookings.filter(b => b.status === 'finalized').reduce((acc, b) => acc + (b.price || 0), 0);
  const pendingBillingAmount = monthlyBookings.filter(b => b.status === 'completed').reduce((acc, b) => acc + (b.price || 0), 0);
  const todayBookings = monthlyBookings.filter(b => b.cleaning_date === todayStr);
  const pendingReviewCount = monthlyBookings.filter(b => b.status === 'completed').length;

  return (
    // 🚨 Added overflow-x-hidden and w-full to prevent horizontal scrolling/crashing
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-[100vw] overflow-x-hidden min-h-screen bg-[#F4F7FA] font-sans pb-24">
      
      {/* 1. Ultra Premium Header & Filter */}
      <DashboardHeader 
        profile={profile} 
        filter={filter} 
        setFilter={setFilter} 
        pendingReviewCount={pendingReviewCount} // 🚨 Added this prop
      />

      <div className="mt-8 space-y-8">
        
        {/* 🚨 <UrgentAlerts pendingReviewCount={pendingReviewCount} /> এটা ডিলিট করে দিয়েছি */}

        <OverviewCards bookings={monthlyBookings} revenue={revenueProcessed} pendingBillingAmount={pendingBillingAmount} />
        <TodaysWorkField todayBookings={todayBookings} />
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
             <TeamRadar todayTeams={todayTeams} />
          </div>
          <div className="xl:col-span-1">
             <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
