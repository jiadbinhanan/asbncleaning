"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { Activity, PlayCircle, CheckCircle2, Clock, MapPin, Loader2 } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";

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
        // Transform data into timeline events
        let events: any[] = [];
        
        data.forEach(log => {
          // If work is finished
          if (log.end_time) {
            events.push({
              id: `end-${log.id}`,
              type: 'completed',
              time: log.end_time,
              team: log.teams?.team_name || "Unknown Team",
              agent: (log as any).agent?.full_name || "Agent",
              unit: log.bookings?.units?.unit_number,
              company: log.bookings?.units?.companies?.name
            });
          }
          // If work was started
          if (log.start_time) {
            events.push({
              id: `start-${log.id}`,
              type: 'started',
              time: log.start_time,
              team: log.teams?.team_name || "Unknown Team",
              agent: (log as any).agent?.full_name || "Agent",
              unit: log.bookings?.units?.unit_number,
              company: log.bookings?.units?.companies?.name
            });
          }
        });

        // Sort by most recent first
        events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        // Keep only top 8 for neat UI
        setActivities(events.slice(0, 8));
      }
      setLoading(false);
    };

    fetchActivities();
  }, [supabase]);

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Activity className="text-blue-600"/> Live Activity Feed
        </h2>
        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          Latest Updates
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-400 font-medium">No recent activities found.</div>
      ) : (
        <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
          {activities.map((activity, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: index * 0.1 }}
              key={activity.id} 
              className="relative pl-6 group"
            >
              {/* Timeline Dot */}
              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white ${activity.type === 'completed' ? 'bg-green-500' : 'bg-blue-500'} shadow-sm group-hover:scale-125 transition-transform`}></div>
              
              <div className="bg-gray-50 hover:bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
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
                  Team {activity.team} <span className="font-normal text-gray-500">({activity.agent})</span>
                </p>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                  <MapPin size={12} className="text-gray-400"/> {activity.company} • Unit {activity.unit}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
