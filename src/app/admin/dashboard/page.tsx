'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Loader2 } from 'lucide-react';

// Components (We will create these step-by-step)
import WelcomeHeader from '@/components/admin/dashboard/WelcomeHeader';
import TodayBookingsCard from '@/components/admin/dashboard/TodayBookingsCard';
import DateRangeBookingsCard from '@/components/admin/dashboard/DateRangeBookingsCard';
import LiveTimelineCard from '@/components/admin/dashboard/LiveTimelineCard';
import TodayAuditCard from '@/components/admin/dashboard/TodayAuditCard';
import FinancialGraphCard from '@/components/admin/dashboard/FinancialGraphCard';
import TeamProgressGrid from '@/components/admin/dashboard/TeamProgressGrid';
import InvoiceOverviewCard from '@/components/admin/dashboard/InvoiceOverviewCard';

export default function PremiumAdminDashboard() {
  const supabase = createClient();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  
  // Master Data States
  const [dashboardData, setDashboardData] = useState({
    bookings: [] as any[],
    workLogs: [] as any[],
    invoices: [] as any[],
    profilesMap: {} as Record<string, any>
  });
  
  // Date Filters
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // --- OPTIMIZED MASTER FETCH ---
  useEffect(() => {
    const fetchMasterData = async () => {
      setLoading(true);
      
      // 1. Get Admin Profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setAdminProfile(profile);
      }

      const fetchStart = dateFrom < todayStr ? dateFrom : todayStr;
      const fetchEnd = dateTo > todayStr ? dateTo : todayStr;

      // 2. Fetch All Required Data in Parallel (Bookings, Logs, Invoices)
      const [bookingsRes, logsRes, invoicesRes] = await Promise.all([
        supabase.from('bookings').select(`
          id, cleaning_date, status, price, assigned_team_id,
          teams ( id, team_name, member_ids ),
          units ( companies ( name ) ),
          booking_extra_inventory ( total_price )
        `).gte('cleaning_date', fetchStart).lte('cleaning_date', fetchEnd),
        
        supabase.from('work_logs').select(`
          id, booking_id, start_time, end_time, status, created_at,
          agent:profiles!work_logs_submitted_by_fkey(full_name, avatar_url)
        `).gte('created_at', `${fetchStart}T00:00:00`).lte('created_at', `${fetchEnd}T23:59:59`),

        supabase.from('invoices').select('id, company_name, total_amount, created_at')
          .gte('start_date', fetchStart).lte('end_date', fetchEnd)
      ]);

      const bData = bookingsRes.data || [];
      
      // 3. Fetch Team Member Profiles for DPs
      const memberIds = new Set<string>();
      bData.forEach(b => {
        if (b.teams?.member_ids) b.teams.member_ids.forEach((id: string) => memberIds.add(id));
      });

      let pMap: any = {};
      if (memberIds.size > 0) {
        const { data: pData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', Array.from(memberIds));
        if (pData) pData.forEach(p => pMap[p.id] = p);
      }

      setDashboardData({
        bookings: bData,
        workLogs: logsRes.data || [],
        invoices: invoicesRes.data || [],
        profilesMap: pMap
      });

      setLoading(false);
    };

    fetchMasterData();
  }, [dateFrom, dateTo, todayStr, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-t-4 border-emerald-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-4 border-teal-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <p className="mt-4 text-emerald-800 font-bold tracking-widest uppercase text-sm animate-pulse">Initializing Workspace...</p>
      </div>
    );
  }

  // Split Data for Components
  const todayBookings = dashboardData.bookings.filter(b => b.cleaning_date === todayStr);
  const rangeBookings = dashboardData.bookings.filter(b => b.cleaning_date >= dateFrom && b.cleaning_date <= dateTo);

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans pb-24 selection:bg-emerald-200">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8 space-y-6">
        
        {/* 1. TOP ROW: WELCOME HEADER */}
        <WelcomeHeader 
          adminProfile={adminProfile} 
          dateFrom={dateFrom} setDateFrom={setDateFrom} 
          dateTo={dateTo} setDateTo={setDateTo} 
        />

        {/* 12-COLUMN MASTER GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ROW 2: Today (4/12) | Date Range (4/12) | Timeline (4/12 spanning rows) */}
          <div className="lg:col-span-4">
            <TodayBookingsCard bookings={todayBookings} />
          </div>
          
          <div className="lg:col-span-4">
            <DateRangeBookingsCard bookings={rangeBookings} />
          </div>

          <div className="lg:col-span-4 lg:row-span-3">
            <LiveTimelineCard workLogs={dashboardData.workLogs} bookings={dashboardData.bookings} />
          </div>

          {/* ROW 3: Today Audit (2/12) | Financial Graph (6/12) */}
          <div className="lg:col-span-2">
            <TodayAuditCard bookings={todayBookings} />
          </div>

          <div className="lg:col-span-6">
            <FinancialGraphCard bookings={rangeBookings} />
          </div>

          {/* ROW 4: Team Progress Grid (8/12) */}
          <div className="lg:col-span-8">
            <TeamProgressGrid bookings={todayBookings} profilesMap={dashboardData.profilesMap} />
          </div>

          {/* ROW 5: Invoice Overview Card (8/12) */}
          <div className="lg:col-span-8">
            <InvoiceOverviewCard invoices={dashboardData.invoices} />
          </div>

        </div>
      </div>
    </div>
  );
}
