'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Activity, CheckCircle2, PlayCircle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function LiveTimelineCard() {
  const supabase = createClient();
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveFeed = async () => {
      setLoading(true);
      
      // 🚨 Fetching directly from DB like Supervisor's feed
      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          id, start_time, end_time, 
          teams ( team_name ),
          agent:profiles!work_logs_submitted_by_fkey ( full_name ),
          bookings ( units ( companies ( name ) ) )
        `)
        .order('id', { ascending: false })
        .limit(10); // 10 logs will easily generate up to 20 events

      if (data) {
        const fetchedLogs = data as any[]; 
        let events: any[] = [];
        
        fetchedLogs.forEach(log => {
          // 🚨 EXACT SAFE EXTRACTION LOGIC FROM SUPERVISOR FEED
          const teamName = Array.isArray(log.teams) ? log.teams[0]?.team_name : log.teams?.team_name;
          const agentName = Array.isArray(log.agent) ? log.agent[0]?.full_name : log.agent?.full_name;
          
          const booking = Array.isArray(log.bookings) ? log.bookings[0] : log.bookings;
          const unit = Array.isArray(booking?.units) ? booking.units[0] : booking?.units;
          const companyName = Array.isArray(unit?.companies) ? unit.companies[0]?.name : unit?.companies?.name;

          // If work is finished (Task Completed)
          if (log.end_time) {
            events.push({
              id: `end-${log.id}`,
              time: log.end_time,
              title: `Task Completed`,
              desc: `${teamName || 'Team'} finished work for ${companyName || 'Unknown Client'}`,
              agent: agentName || 'Agent',
              type: 'completed'
            });
          }
          
          // If work started (Shift Started)
          if (log.start_time) {
            events.push({
              id: `start-${log.id}`,
              time: log.start_time,
              title: `Shift Started`,
              desc: `${teamName || 'Team'} initiated cleaning for ${companyName || 'Unknown Client'}`,
              agent: agentName || 'Agent',
              type: 'started'
            });
          }
        });

        // 🚨 Sort by newest time and slice to EXACTLY TOP 12
        events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setTimelineEvents(events.slice(0, 12));
      }
      
      setLoading(false);
    };

    fetchLiveFeed();
  }, [supabase]);

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Activity className="text-blue-500"/> Live Feed
        </h2>
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span> Live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="text-center flex flex-col items-center justify-center h-full text-gray-300">
             <Activity size={40} className="mb-2 opacity-50"/>
             <span className="font-bold text-sm">No recent activity detected.</span>
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
            {timelineEvents.map((ev, idx) => (
              <div key={ev.id} className="relative pl-6">
                
                {/* Timeline Dot */}
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white flex items-center justify-center ${ev.type === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                  {idx === 0 && <div className={`absolute w-full h-full rounded-full animate-ping ${ev.type === 'completed' ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>}
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                      {ev.type === 'completed' ? <CheckCircle2 size={14} className="text-emerald-500"/> : <PlayCircle size={14} className="text-blue-500"/>}
                      {ev.title}
                    </h4>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Clock size={10}/> {formatDistanceToNow(parseISO(ev.time), { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium mb-2">{ev.desc}</p>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white w-fit px-2 py-1 rounded-md shadow-sm border border-gray-100">By: {ev.agent}</p>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
