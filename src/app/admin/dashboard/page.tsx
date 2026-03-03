'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Loader2 } from 'lucide-react';
import TodayPanel from './TodayPanel';
import OverviewPanel from './OverviewPanel'; 
import WelcomeHeader from './WelcomeHeader';

export default function AdminDashboard() {
  const supabase = createClient();

  // States
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  
  // Date Filters for Overview (Right Side)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // 🚨 OPTIMIZED FETCH: 1 API Call for all Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setAdminProfile(profile);
      }

      const fetchStart = dateFrom < todayStr ? dateFrom : todayStr;
      const fetchEnd = dateTo > todayStr ? dateTo : todayStr;

      // Fetch Bookings with Teams and Extra Inventory
      const { data: bData } = await supabase
        .from('bookings')
        .select(`
          id, cleaning_date, status, price, assigned_team_id,
          teams ( id, team_name, member_ids ),
          units ( companies ( name ) ),
          booking_extra_inventory ( total_price )
        `)
        .gte('cleaning_date', fetchStart)
        .lte('cleaning_date', fetchEnd);

      if (bData) {
        setAllBookings(bData);

        // Fetch Profiles for Team Member DPs
        const memberIds = new Set<string>();
        bData.forEach(b => {
          if (b.teams?.member_ids) b.teams.member_ids.forEach((id: string) => memberIds.add(id));
        });

        if (memberIds.size > 0) {
          const { data: pData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', Array.from(memberIds));
          if (pData) {
            const pMap: any = {};
            pData.forEach(p => pMap[p.id] = p);
            setProfilesMap(pMap);
          }
        }
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [dateFrom, dateTo, todayStr, supabase]);

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  // Filter Today's Data
  const todayBookings = allBookings.filter(b => b.cleaning_date === todayStr);
  const overviewBookings = allBookings.filter(b => b.cleaning_date >= dateFrom && b.cleaning_date <= dateTo);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">
      
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8">
        
        <WelcomeHeader adminProfile={adminProfile} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4">
            <TodayPanel bookings={todayBookings} profilesMap={profilesMap} />
          </div>

          <div className="lg:col-span-8">
            <OverviewPanel 
                bookings={overviewBookings} 
                dateFrom={dateFrom} setDateFrom={setDateFrom} 
                dateTo={dateTo} setDateTo={setDateTo} 
            />
          </div>

        </div>
      </div>
    </div>
  );
}
