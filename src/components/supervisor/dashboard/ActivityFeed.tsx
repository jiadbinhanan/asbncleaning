"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { PlayCircle, CheckCircle2, Clock, MapPin, Loader2 } from "lucide-react";
import { parseISO, formatDistanceToNow } from "date-fns";

export default function ActivityFeed() {
  const supabase = createClient();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // OPTIMIZED FETCH: Get only the 10 most recent work logs
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          id, start_time, end_time, 
          teams ( team_name ),
          agent:profiles!work_logs_submitted_by_fkey ( full_name ),
          bookings ( units ( unit_number, companies ( name ) ) )
        `)
        .order('id', { ascending: false })
        .limit(10);

      if (data) {
        // 🚨 FIXED: TypeScript Type error solution
        const fetchedLogs = data as any[]; 
        let events: any[] = [];
        
        fetchedLogs.forEach(log => {
          // 🚨 Safe Extraction: Handling both Object and Array responses from Supabase
          const teamName = Array.isArray(log.teams) ? log.teams[0]?.team_name : log.teams?.team_name;
          const agentName = Array.isArray(log.agent) ? log.agent[0]?.full_name : log.agent?.full_name;
          
          const booking = Array.isArray(log.bookings) ? log.bookings[0] : log.bookings;
          const unit = Array.isArray(booking?.units) ? booking.units[0] : booking?.units;
          const companyName = Array.isArray(unit?.companies) ? unit.companies[0]?.name : unit?.companies?.name;
          const unitNum = unit?.unit_number;

          // If work is finished
          if (log.end_time) {
            events.push({
              id: `end-${log.id}`,
              type: 'completed',
              time: log.end_time,
              team: teamName || "Unknown Team",
              agent: agentName || "Agent",
              unit: unitNum || "N/A",
              company: companyName || "Unknown"
            });
          }
          
          // If work started
          if (log.start_time) {
            events.push({
              id: `start-${log.id}`,
              type: 'started',
              time: log.start_time,
              team: teamName || "Unknown Team",
              agent: agentName || "Agent",
              unit: unitNum || "N/A",
              company: companyName || "Unknown"
            });
          }
        });

        // Sort combined events by time descending (newest first)
        events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setActivities(events);
      }
      setLoading(false);
    };

    fetchActivities();
  }, [supabase]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>;
  }

  if (activities.length === 0) {
    return <div className="p-6 text-center text-gray-400 font-bold bg-gray-50 rounded-3xl border border-gray-100">No recent activity.</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              {activity.type === 'completed' ? (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded flex items-center gap-1"><CheckCircle2 size={12}/> Task Completed</span>
              ) : (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded flex items-center gap-1"><PlayCircle size={12}/> Shift Started</span>
              )}
            </div>
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
              <Clock size={12}/> {formatDistanceToNow(parseISO(activity.time), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm font-bold text-gray-800 mb-1">
            {activity.team} <span className="font-normal text-gray-500">({activity.agent})</span>
          </p>
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <MapPin size={12} className="text-gray-400"/> {activity.company} • Unit {activity.unit}
          </p>
        </div>
      ))}
    </div>
  );
}
