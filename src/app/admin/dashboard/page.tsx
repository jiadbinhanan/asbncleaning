'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  ScatterChart, Scatter, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PolarAngleAxis, Legend,
} from 'recharts';
import {
  CalendarDays, TrendingUp, Users, FileText, ShieldCheck,
  Activity, CheckCircle2, Clock, AlertCircle,
  UserCircle, PlayCircle, WashingMachine,
  BarChart2, PieChart as PieIcon, Target,
  CircleDollarSign, Loader2, RefreshCw, Zap, Star,
  Receipt, Package,
} from 'lucide-react';
import WelcomeHeader from '@/components/admin/dashboard/WelcomeHeader';

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const FIN_CLEANING  = '#F97316';
const FIN_INVENTORY = '#0EA5E9';
const FIN_POS       = '#10B981';
const CHART_COLORS  = ['#7C3AED','#06B6D4','#10B981','#F97316','#F43F5E','#8B5CF6','#F59E0B','#3B82F6'];

/* ═══════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════ */
const fadeUp = { initial:{opacity:0,y:16}, animate:{opacity:1,y:0}, transition:{duration:0.38} };

function Card({ children, bg='#fff', border='rgba(0,0,0,0.07)', className='' }: any) {
  return (
    <motion.div {...fadeUp} className={`rounded-3xl overflow-hidden flex flex-col h-full ${className}`}
      style={{ background: bg, border: `1.5px solid ${border}`, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.07)' }}>
      {children}
    </motion.div>
  );
}

function CardHead({ icon: Icon, iconBg, iconColor, title, subtitle, right }: any) {
  return (
    <div className="flex items-start justify-between gap-2 mb-4 flex-shrink-0">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-xl flex-shrink-0" style={{ background: iconBg }}>
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <div>
          <h2 className="text-[13px] font-black leading-tight" style={{ color: '#0F172A' }}>{title}</h2>
          {subtitle && <p className="text-[10px] font-medium mt-0.5" style={{ color: '#94A3B8' }}>{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(15,23,42,0.97)', border:'1px solid rgba(255,255,255,0.1)' }}
      className="text-white px-3 py-2.5 rounded-xl shadow-2xl text-[11px]">
      {label && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}
          </span>
          <span className="font-black text-white">{typeof p.value==='number'?p.value.toLocaleString():p.value}</span>
        </div>
      ))}
    </div>
  );
};

function StatChip({ label, value, bg, color }: any) {
  return (
    <div className="rounded-2xl p-2.5 text-center" style={{ background: bg }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#64748B' }}>{label}</p>
      <p className="text-xl font-black" style={{ color }}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   A — TODAY'S OPERATIONS
   White card, same height as Range & QC (set by grid rows)
═══════════════════════════════════════════════════════════ */
function TodayBookingsCard({ bookings }: { bookings: any[] }) {
  const s = useMemo(() => {
    const total     = bookings.length;
    const active    = bookings.filter(b=>['active','in_progress'].includes(b.status)).length;
    const completed = bookings.filter(b=>['completed','finalized'].includes(b.status)).length;
    const pending   = bookings.filter(b=>b.status==='pending').length;
    const assigned  = bookings.filter(b=>b.assigned_team_id!==null).length;
    return { total, active, completed, pending, assigned, unassigned:total-assigned };
  }, [bookings]);

  const hoursData = useMemo(() => {
    const h: Record<number,{active:number;completed:number}>={};
    for(let i=6;i<=22;i++) h[i]={active:0,completed:0};
    bookings.forEach(b=>{
      if(!b.cleaning_time) return;
      const hr=parseInt(b.cleaning_time.split(':')[0],10);
      if(h[hr]){
        if(['active','in_progress'].includes(b.status)) h[hr].active++;
        if(['completed','finalized'].includes(b.status)) h[hr].completed++;
      }
    });
    return Object.entries(h).map(([hour,v])=>({hour:`${hour}h`,...v}));
  }, [bookings]);

  return (
    <Card bg="#FFFFFF">
      <div className="p-5 pb-3 flex-shrink-0">
        <CardHead icon={CalendarDays} iconBg="#DBEAFE" iconColor="#3B82F6"
          title="Today's Operations" subtitle="Live shift progress"
          right={
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background:'#FEF9C3' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"/>
              <span className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Today</span>
            </div>
          }
        />
        {/* Big total */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 mb-3 text-white shadow-lg">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Bookings</p>
            <p className="text-4xl font-black leading-none mt-0.5">{s.total}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Target size={22} className="text-white"/>
          </div>
        </div>
        {/* 3 chips */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-2xl p-2.5 text-white text-center shadow" style={{ background:'linear-gradient(135deg,#3B82F6,#6366F1)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Active</p>
            <p className="text-2xl font-black">{s.active}</p>
            <div className="flex items-center justify-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"/><span className="text-[9px] opacity-70">live</span></div>
          </div>
          <div className="rounded-2xl p-2.5 text-white text-center shadow" style={{ background:'linear-gradient(135deg,#10B981,#059669)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Done</p>
            <p className="text-2xl font-black">{s.completed}</p>
            <div className="flex items-center justify-center gap-1"><CheckCircle2 size={10} className="opacity-80"/><span className="text-[9px] opacity-70">done</span></div>
          </div>
          <div className="rounded-2xl p-2.5 text-white text-center shadow" style={{ background:'linear-gradient(135deg,#F59E0B,#F97316)' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">Pending</p>
            <p className="text-2xl font-black">{s.pending}</p>
            <div className="flex items-center justify-center gap-1"><Clock size={10} className="opacity-80"/><span className="text-[9px] opacity-70">wait</span></div>
          </div>
        </div>
      </div>

      {/* Hourly bar */}
      <div className="px-4 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hoursData} barSize={7} margin={{top:2,right:2,left:-30,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
            <XAxis dataKey="hour" tick={{fontSize:8,fill:'#94A3B8',fontWeight:'bold'}} axisLine={false} tickLine={false} interval={3}/>
            <YAxis tick={{fontSize:8,fill:'#94A3B8'}} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>}/>
            <Bar dataKey="active"    name="Active"    stackId="a" fill="#3B82F6"/>
            <Bar dataKey="completed" name="Completed" stackId="a" fill="#10B981" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Assignment */}
      <div className="px-5 pb-5 pt-3 flex-shrink-0">
        <div className="rounded-2xl p-3" style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Team Assignment</span>
            <span className="text-[10px] font-black" style={{color:'#6366F1'}}>{s.assigned} <span className="text-slate-300 font-normal">/</span> <span style={{color:'#F43F5E'}}>{s.unassigned} unset</span></span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background:'#E2E8F0' }}>
            <motion.div initial={{width:0}} animate={{width:s.total?`${(s.assigned/s.total)*100}%`:'0%'}} transition={{duration:1.2,ease:'easeOut'}}
              className="h-full rounded-full" style={{ background:'linear-gradient(90deg,#6366F1,#7C3AED)' }}/>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   B — RANGE ANALYTICS  (premium warm coral-rose gradient)
═══════════════════════════════════════════════════════════ */
function DateRangeCard({ bookings }: { bookings: any[] }) {
  const s = useMemo(()=>{
    const total=bookings.length;
    const pending=bookings.filter(b=>b.status==='pending').length;
    const active=bookings.filter(b=>['active','in_progress'].includes(b.status)).length;
    const completed=bookings.filter(b=>['completed','finalized'].includes(b.status)).length;
    const finalized=bookings.filter(b=>b.status==='finalized').length;
    return {total,pending,active,completed,finalized};
  },[bookings]);

  const funnelData=[
    {value:s.total,     name:'Total',     fill:'rgba(255,255,255,0.9)'},
    {value:s.completed, name:'Completed', fill:'rgba(253,224,71,0.9)'},
    {value:s.finalized, name:'Finalized', fill:'rgba(52,211,153,0.9)'},
  ];

  return (
    <Card bg="linear-gradient(145deg,#BE123C 0%,#E11D48 35%,#F43F5E 65%,#FB7185 100%)" border="rgba(255,255,255,0.2)">
      <div className="p-4 pb-2 flex-shrink-0">
        <CardHead icon={BarChart2} iconBg="rgba(255,255,255,0.2)" iconColor="#fff"
          title={<span className="text-white">Range Analytics</span>}
          subtitle={<span style={{color:'#FECDD3'}}>Selected period lifecycle</span>}
        />
        {/* Compact 2-row stats — smaller padding to condense */}
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          {[
            {l:'Total',     v:s.total,     bg:'rgba(255,255,255,0.18)', c:'#fff'},
            {l:'Active',    v:s.active,    bg:'rgba(251,191,36,0.35)',  c:'#FEF08A'},
            {l:'Completed', v:s.completed, bg:'rgba(52,211,153,0.3)',   c:'#A7F3D0'},
            {l:'Pending',   v:s.pending,   bg:'rgba(255,255,255,0.12)', c:'#FECDD3'},
          ].map(x=>(
            <div key={x.l} className="rounded-xl p-2 text-center" style={{background:x.bg}}>
              <p className="text-[8px] font-bold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.7)'}}>{x.l}</p>
              <p className="text-lg font-black leading-tight" style={{color:x.c}}>{x.v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-2 flex items-center justify-between mb-1.5" style={{background:'rgba(52,211,153,0.28)',border:'1px solid rgba(52,211,153,0.45)'}}>
          <span className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{color:'#A7F3D0'}}><CheckCircle2 size={11}/>Finalized</span>
          <span className="text-lg font-black text-white">{s.finalized}</span>
        </div>
      </div>

      {/* Funnel takes all remaining space — no fixed height */}
      <div className="flex-1 px-4 pb-4 min-h-0 flex flex-col">
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 flex-shrink-0" style={{color:'#FECDD3'}}>Conversion Funnel</p>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip content={<Tip/>}/>
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="rgba(255,255,255,0.8)" fontSize={10} fontWeight="bold" dataKey="name"/>
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   C — QC ANALYTICS  (vibrant teal-green)
   Only returnable items (item_type = 'returnable')
═══════════════════════════════════════════════════════════ */
function QCAnalyticsCard({ dateFrom, dateTo }: { dateFrom:string; dateTo:string }) {
  const supabase = createClient();
  const [d,setD] = useState({good:0,bad:0,damaged:0,qcDone:0,qcPending:0});
  const [loading,setL] = useState(true);

  useEffect(()=>{
    (async()=>{
      setL(true);
      // Only returnable items: join equipment_master to filter item_type = 'returnable'
      const { data: logs } = await supabase
        .from('booking_inventory_logs')
        .select(`
          qc_good_qty, qc_bad_qty, qc_damage_qty, qc_status,
          equipment:equipment_master!inner(item_type),
          bookings!inner(cleaning_date)
        `)
        .eq('equipment_master.item_type','returnable')
        .gte('bookings.cleaning_date', dateFrom)
        .lte('bookings.cleaning_date', dateTo);

      if(logs){
        let good=0,bad=0,damaged=0,done=0,pend=0;
        logs.forEach((l:any)=>{
          good+=l.qc_good_qty||0; bad+=l.qc_bad_qty||0; damaged+=l.qc_damage_qty||0;
          if(l.qc_status==='completed') done++; else pend++;
        });
        setD({good,bad,damaged,qcDone:done,qcPending:pend});
      }
      setL(false);
    })();
  },[dateFrom,dateTo]);

  const total=d.good+d.bad+d.damaged;
  const goodPct=total>0?Math.round((d.good/total)*100):0;
  const totalQC=d.qcDone+d.qcPending;
  const donePct=totalQC>0?Math.round((d.qcDone/totalQC)*100):0;

  const pieData=[
    {name:'Good',    value:d.good,    fill:'#FFFFFF'},
    {name:'Dirty',   value:d.bad,     fill:'#FCD34D'},
    {name:'Damaged', value:d.damaged, fill:'#F87171'},
  ];
  const qcBar=[
    {name:'QC Done', value:d.qcDone,    fill:'#FFFFFF'},
    {name:'Due',     value:d.qcPending, fill:'#FCD34D'},
  ];

  return (
    <Card bg="linear-gradient(145deg,#0D9488 0%,#0F766E 40%,#065F46 100%)" border="rgba(255,255,255,0.15)">
      <div className="p-5 pb-2 flex-1 flex flex-col">
        <CardHead icon={ShieldCheck} iconBg="rgba(255,255,255,0.2)" iconColor="#fff"
          title={<span className="text-white">QC Analytics</span>}
          subtitle={<span className="text-teal-200">Returnable items only</span>}
        />
        {loading?(
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-white" size={24}/></div>
        ):(
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="rounded-2xl p-2.5 text-center" style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)'}}>
                <p className="text-[9px] font-bold uppercase text-emerald-200 tracking-widest">QC Done</p>
                <p className="text-2xl font-black text-white">{d.qcDone}</p>
                <p className="text-[9px] text-teal-200">bookings</p>
              </div>
              <div className="rounded-2xl p-2.5 text-center" style={{background:'rgba(251,191,36,0.25)',border:'1px solid rgba(251,191,36,0.35)'}}>
                <p className="text-[9px] font-bold uppercase text-yellow-200 tracking-widest">Due</p>
                <p className="text-2xl font-black text-yellow-100">{d.qcPending}</p>
                <p className="text-[9px] text-yellow-200">bookings</p>
              </div>
            </div>

            {totalQC>0&&(
              <div className="rounded-2xl p-2.5 mb-2" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)'}}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-bold text-teal-200">Completion</span>
                  <span className="text-[11px] font-black text-white">{donePct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.15)'}}>
                  <motion.div initial={{width:0}} animate={{width:`${donePct}%`}} transition={{duration:1.1,ease:'easeOut'}}
                    className="h-full rounded-full" style={{background:'linear-gradient(90deg,#6EE7B7,#34D399)'}}/>
                </div>
              </div>
            )}

            <div className="relative flex-shrink-0" style={{height:105}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((e,i)=><Cell key={i} fill={e.fill} fillOpacity={0.9}/>)}
                  </Pie>
                  <Tooltip content={<Tip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-white">{goodPct}%</span>
                <span className="text-[8px] font-bold text-teal-200 uppercase">Good</span>
              </div>
            </div>

            <div className="flex justify-around mb-2">
              {pieData.map(p=>(
                <div key={p.name} className="text-center">
                  <div className="w-2 h-2 rounded-full mx-auto mb-0.5" style={{background:p.fill}}/>
                  <p className="text-[8px] font-bold text-teal-200 uppercase">{p.name}</p>
                  <p className="text-sm font-black text-white">{p.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-2.5 flex-shrink-0" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)'}}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-teal-200 mb-1.5">QC Booking Status</p>
              <ResponsiveContainer width="100%" height={48}>
                <BarChart data={qcBar} layout="vertical" barSize={10} margin={{top:0,right:8,left:0,bottom:0}}>
                  <XAxis type="number" tick={{fontSize:8,fill:'rgba(255,255,255,0.4)'}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'rgba(255,255,255,0.7)',fontWeight:'bold'}} axisLine={false} tickLine={false} width={52}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="value" name="Count" radius={[0,5,5,0]}>
                    {qcBar.map((e,i)=><Cell key={i} fill={e.fill} fillOpacity={0.85}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   D — FINANCIAL PERFORMANCE  (white, spans below the 3 cards)
   POS data from instant_invoices table, date-keyed correctly
═══════════════════════════════════════════════════════════ */
function FinancialCard({ bookings, dateFrom, dateTo }: { bookings:any[]; dateFrom:string; dateTo:string }) {
  const supabase = createClient();
  const [posMap, setPosMap] = useState<Record<string,number>>({});

  useEffect(()=>{
    (async()=>{
      // Fetch instant_invoices using created_at date range
      const { data } = await supabase
        .from('instant_invoices')
        .select('total_amount, created_at')
        .gte('created_at',`${dateFrom}T00:00:00`)
        .lte('created_at',`${dateTo}T23:59:59`);
      if(data){
        const m: Record<string,number>={};
        data.forEach((d:any)=>{
          // Key by yyyy-MM-dd to match booking date keys exactly
          const day = format(parseISO(d.created_at),'yyyy-MM-dd');
          m[day]=(m[day]||0)+Number(d.total_amount);
        });
        setPosMap(m);
      }
    })();
  },[dateFrom,dateTo]);

  const {chartData,totals} = useMemo(()=>{
    const map: Record<string,{dateObj:Date;cleaning:number;inventory:number}>={};
    let tc=0,ti=0;
    // Only finalized bookings count for cleaning revenue
    bookings.filter(b=>b.status==='finalized').forEach(b=>{
      const dObj=parseISO(b.cleaning_date);
      const dStr=format(dObj,'yyyy-MM-dd');
      if(!map[dStr]) map[dStr]={dateObj:dObj,cleaning:0,inventory:0};
      const cp=Number(b.price)||0;
      const ip=b.booking_extra_inventory?.reduce((a:number,e:any)=>a+Number(e.total_price),0)||0;
      map[dStr].cleaning+=cp; map[dStr].inventory+=ip; tc+=cp; ti+=ip;
    });

    // Build chart from ALL dates in map + posMap union
    const allKeys=new Set([...Object.keys(map),...Object.keys(posMap)]);
    const sorted=Array.from(allKeys)
      .sort()
      .map(dStr=>{
        const dObj = map[dStr]?.dateObj || parseISO(dStr);
        return {
          date:     format(dObj,'dd MMM'),
          cleaning: map[dStr]?.cleaning  || 0,
          inventory:map[dStr]?.inventory || 0,
          pos:      posMap[dStr]         || 0,
        };
      });

    const tp=Object.values(posMap).reduce((a,b)=>a+b,0);
    return {chartData:sorted, totals:{cleaning:tc,inventory:ti,pos:tp,combined:tc+ti+tp}};
  },[bookings,posMap]);

  return (
    <Card bg="#FFFFFF">
      <div className="p-5 pb-2 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <CardHead icon={TrendingUp} iconBg="#DBEAFE" iconColor="#3B82F6"
            title="Financial Performance" subtitle="Finalized bookings + POS revenue"/>
          <div className="text-right flex-shrink-0 ml-2">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Combined</p>
            <p className="text-xl font-black text-slate-900">AED {totals.combined.toLocaleString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            {l:'Cleaning',  v:totals.cleaning,  c:FIN_CLEANING,  bg:'#FFF7ED'},
            {l:'Inventory', v:totals.inventory, c:FIN_INVENTORY, bg:'#E0F2FE'},
            {l:'POS Sales', v:totals.pos,       c:FIN_POS,       bg:'#ECFDF5'},
          ].map(x=>(
            <div key={x.l} className="rounded-2xl p-2.5 text-center" style={{background:x.bg}}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{x.l}</p>
              <p className="text-sm font-black" style={{color:x.c}}>AED {x.v.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 px-3 pb-4 min-h-0">
        {chartData.length===0?(
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
            <CircleDollarSign size={30} className="mb-2 opacity-40"/><span className="text-sm">No data</span>
          </div>
        ):(
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{top:6,right:6,left:-22,bottom:0}}>
              <defs>
                {([['cleaning',FIN_CLEANING],['inventory',FIN_INVENTORY],['pos',FIN_POS]] as const).map(([key,color])=>(
                  <linearGradient key={key} id={`fg-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.28}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9"/>
              <XAxis dataKey="date" tick={{fontSize:9,fill:'#94A3B8',fontWeight:'bold'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:9,fill:'#94A3B8'}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="cleaning"  name="Cleaning"  stroke={FIN_CLEANING}  strokeWidth={2.5} fill="url(#fg-cleaning)"/>
              <Area type="monotone" dataKey="inventory" name="Inventory" stroke={FIN_INVENTORY} strokeWidth={2.5} fill="url(#fg-inventory)"/>
              <Area type="monotone" dataKey="pos"       name="POS Sales" stroke={FIN_POS}       strokeWidth={2.5} fill="url(#fg-pos)"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   E — LIVE FEED  (double-height, bright dark-blue redesign)
═══════════════════════════════════════════════════════════ */
function LiveFeedCard() {
  const supabase = createClient();
  const [events,setEvents] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);

  const fetch = useCallback(async()=>{
    setLoading(true);
    const {data} = await supabase
      .from('work_logs')
      .select('id,start_time,end_time,teams(team_name),agent:profiles!work_logs_submitted_by_fkey(full_name),bookings(units(companies(name)))')
      .order('id',{ascending:false}).limit(20);
    if(data){
      let evs: any[]=[];
      (data as any[]).forEach(log=>{
        const teamName = Array.isArray(log.teams)?log.teams[0]?.team_name:log.teams?.team_name;
        const agentName= Array.isArray(log.agent)?log.agent[0]?.full_name:log.agent?.full_name;
        const booking  = Array.isArray(log.bookings)?log.bookings[0]:log.bookings;
        const unit     = Array.isArray(booking?.units)?booking.units[0]:booking?.units;
        const company  = Array.isArray(unit?.companies)?unit.companies[0]?.name:unit?.companies?.name;
        if(log.end_time)   evs.push({id:`e-${log.id}`,time:log.end_time,   title:'Task Completed',desc:`${teamName||'Team'} finished for ${company||'Client'}`,agent:agentName||'Agent',type:'done'});
        if(log.start_time) evs.push({id:`s-${log.id}`,time:log.start_time, title:'Shift Started',  desc:`${teamName||'Team'} began at ${company||'Client'}`,agent:agentName||'Agent',type:'start'});
      });
      evs.sort((a,b)=>new Date(b.time).getTime()-new Date(a.time).getTime());
      setEvents(evs.slice(0,15));
    }
    setLoading(false);
  },[supabase]);

  useEffect(()=>{fetch();},[fetch]);

  const ago=(t:string)=>{
    const m=Math.floor((Date.now()-new Date(t).getTime())/60000);
    if(m<1) return 'just now'; if(m<60) return `${m}m ago`;
    const h=Math.floor(m/60); return h<24?`${h}h ago`:`${Math.floor(h/24)}d ago`;
  };

  return (
    <motion.div {...fadeUp} className="rounded-3xl overflow-hidden flex flex-col h-full"
      style={{ background:'linear-gradient(160deg,#0F172A 0%,#1E3A5F 50%,#0C2340 100%)', border:'1.5px solid rgba(56,189,248,0.2)', boxShadow:'0 4px 32px rgba(56,189,248,0.15)' }}>

      {/* Header */}
      <div className="p-5 flex-shrink-0" style={{ borderBottom:'1px solid rgba(56,189,248,0.15)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#0EA5E9,#6366F1)' }}>
              <Activity size={16} className="text-white"/>
            </div>
            <div>
              <h2 className="text-[14px] font-black text-white">Live Operations</h2>
              <p className="text-[10px]" style={{color:'#7DD3FC'}}>Real-time team activity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{background:'rgba(14,165,233,0.2)',border:'1px solid rgba(14,165,233,0.4)'}}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#38BDF8'}}/>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{color:'#38BDF8'}}>Live</span>
            </div>
            <button onClick={fetch} disabled={loading}
              className="p-1.5 rounded-xl transition-all disabled:opacity-40"
              style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)'}}>
              <RefreshCw size={12} className={`text-white ${loading?'animate-spin':''}`}/>
            </button>
          </div>
        </div>
        {/* Mini stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-2.5 text-center" style={{background:'rgba(14,165,233,0.15)',border:'1px solid rgba(14,165,233,0.25)'}}>
            <p className="text-[9px] font-bold text-sky-300 uppercase tracking-widest">Completed</p>
            <p className="text-xl font-black text-white">{events.filter(e=>e.type==='done').length}</p>
          </div>
          <div className="rounded-2xl p-2.5 text-center" style={{background:'rgba(99,102,241,0.2)',border:'1px solid rgba(99,102,241,0.3)'}}>
            <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Started</p>
            <p className="text-xl font-black text-white">{events.filter(e=>e.type==='start').length}</p>
          </div>
        </div>
      </div>

      {/* Timeline — scrollable, fills remaining height */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0"
        style={{ scrollbarWidth:'thin', scrollbarColor:'rgba(56,189,248,0.3) transparent' }}>
        {loading&&events.length===0?(
          <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin" style={{color:'#38BDF8'}} size={24}/></div>
        ):events.length===0?(
          <div className="flex flex-col items-center justify-center h-32" style={{color:'#334155'}}>
            <Activity size={28} className="mb-2 opacity-40"/><span className="text-xs font-medium">No activity yet</span>
          </div>
        ):(
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-0 w-[1.5px] rounded-full"
              style={{background:'linear-gradient(to bottom,rgba(56,189,248,0.6),rgba(99,102,241,0.3),transparent)'}}/>
            {events.map((ev,idx)=>(
              <motion.div key={ev.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:idx*0.02}}
                className="relative pl-5 pb-3 last:pb-0">
                <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 z-10 flex-shrink-0`}
                  style={{ borderColor:'#0C2340', background: ev.type==='done'?'#34D399':'#60A5FA' }}>
                  {idx===0&&<div className="absolute inset-0 rounded-full animate-ping opacity-60"
                    style={{background:ev.type==='done'?'#34D399':'#60A5FA',animationDuration:'2.5s'}}/>}
                </div>
                <div className="rounded-2xl p-3 transition-all"
                  style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black flex items-center gap-1"
                      style={{color:ev.type==='done'?'#34D399':'#93C5FD'}}>
                      {ev.type==='done'?<CheckCircle2 size={10}/>:<PlayCircle size={10}/>}{ev.title}
                    </span>
                    <span className="text-[9px] flex items-center gap-0.5 flex-shrink-0" style={{color:'#475569'}}>
                      <Clock size={8}/>{ago(ev.time)}
                    </span>
                  </div>
                  <p className="text-[10px] leading-snug mb-1.5" style={{color:'#94A3B8'}}>{ev.desc}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg"
                    style={{background:'rgba(255,255,255,0.06)',color:'#64748B'}}>by {ev.agent}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   F — FINANCIAL AUDIT  (amber — unchanged)
═══════════════════════════════════════════════════════════ */
function FinancialAuditCard({ todayBookings, rangeBookings }: { todayBookings:any[]; rangeBookings:any[] }) {
  const calc=(bookings:any[])=>{
    const aud=bookings.filter(b=>['active','in_progress','completed','finalized'].includes(b.status));
    const audited=aud.filter(b=>b.status==='finalized').length;
    const pending=aud.filter(b=>['active','in_progress','completed'].includes(b.status)).length;
    const revenue=aud.filter(b=>b.status==='finalized').reduce((sum,b)=>{
      const ex=b.booking_extra_inventory?.reduce((a:number,e:any)=>a+Number(e.total_price),0)||0;
      return sum+Number(b.price)+ex;
    },0);
    return {audited,pending,revenue,total:aud.length};
  };
  const today=calc(todayBookings), range=calc(rangeBookings);
  const todayPct=today.total>0?Math.round((today.audited/today.total)*100):0;
  const gaugeData=[{name:'Audited',value:today.audited,fill:'#10B981'},{name:'Pending',value:today.pending,fill:'#F59E0B'}];
  const trendData=useMemo(()=>{
    const m: Record<string,number>={};
    rangeBookings.filter(b=>b.status==='finalized').forEach(b=>{const d=format(parseISO(b.cleaning_date),'dd MMM');m[d]=(m[d]||0)+Number(b.price);});
    return Object.entries(m).map(([date,revenue])=>({date,revenue}));
  },[rangeBookings]);

  return (
    <Card bg="linear-gradient(145deg,#FFFBEB,#FEF3C7 60%,#FFFBEB)" border="rgba(245,158,11,0.25)">
      <div className="p-5 pb-2 flex-shrink-0">
        <CardHead icon={ShieldCheck} iconBg="#FEF3C7" iconColor="#F59E0B"
          title="Financial Audit" subtitle="Approval & finalization tracking"/>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="bg-white rounded-2xl p-3 shadow-sm" style={{border:'1px solid rgba(245,158,11,0.2)'}}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 text-center">Today</p>
            <div className="relative" style={{height:76}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gaugeData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={26} outerRadius={40} dataKey="value" stroke="none" cornerRadius={4} paddingAngle={2}>
                    {gaugeData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                <span className="text-lg font-black text-slate-800">{todayPct}%</span>
              </div>
            </div>
            <div className="flex justify-around mt-1 mb-2">
              <div className="text-center"><p className="text-[9px] text-emerald-500 font-bold uppercase">Done</p><p className="text-sm font-black text-emerald-600">{today.audited}</p></div>
              <div className="text-center"><p className="text-[9px] text-amber-500 font-bold uppercase">Left</p><p className="text-sm font-black text-amber-600">{today.pending}</p></div>
            </div>
            <div className="border-t pt-2 text-center" style={{borderColor:'rgba(245,158,11,0.2)'}}>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Today Revenue</p>
              <p className="text-sm font-black text-emerald-600">AED {today.revenue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 shadow-sm" style={{border:'1px solid rgba(245,158,11,0.2)'}}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Range Total</p>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[11px] text-slate-500">Audited</span><span className="text-sm font-black text-emerald-600">{range.audited}</span></div>
              <div className="flex justify-between"><span className="text-[11px] text-slate-500">Pending</span><span className="text-sm font-black text-amber-500">{range.pending}</span></div>
              <div className="border-t pt-2" style={{borderColor:'#F3F4F6'}}>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Approved Rev.</p>
                <p className="text-base font-black text-emerald-600">AED {range.revenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 pb-4 min-h-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600 mb-1">Approved Revenue Trend</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{top:4,right:6,left:-24,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FDE68A"/>
            <XAxis dataKey="date" tick={{fontSize:9,fill:'#D97706',fontWeight:'bold'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:'#D97706'}} axisLine={false} tickLine={false}/>
            <Tooltip content={<Tip/>}/>
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#F59E0B" strokeWidth={2.5} dot={{r:3,fill:'#F59E0B'}} activeDot={{r:5}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   G — TEAM PROGRESS  (white, same height as audit)
═══════════════════════════════════════════════════════════ */
function TeamProgressCard({ bookings, profilesMap }: { bookings:any[]; profilesMap:Record<string,any> }) {
  const teams=useMemo(()=>{
    const map: Record<string,any>={};
    bookings.forEach(b=>{
      const t=Array.isArray(b.teams)?b.teams[0]:b.teams; if(!t) return;
      if(!map[t.id]) map[t.id]={id:t.id,name:t.team_name,members:t.member_ids||[],target:0,completed:0};
      map[t.id].target++;
      if(['completed','finalized'].includes(b.status)) map[t.id].completed++;
    });
    return Object.values(map);
  },[bookings]);

  const barData=teams.map(t=>({name:t.name?.length>10?t.name.slice(0,10)+'…':t.name,target:t.target,completed:t.completed}));

  return (
    <Card bg="#FFFFFF">
      <div className="p-5 pb-2 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <CardHead icon={Users} iconBg="#E0E7FF" iconColor="#6366F1"
            title="Team Progress" subtitle="Today's active teams"/>
          <div className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex-shrink-0"
            style={{background:'#EEF2FF',color:'#4338CA',border:'1px solid #C7D2FE'}}>{teams.length} Teams</div>
        </div>
        <div style={{height:110}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barGap={3} barCategoryGap="28%" margin={{top:0,right:0,left:-24,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2FF"/>
              <XAxis dataKey="name" tick={{fontSize:9,fill:'#6366F1',fontWeight:'bold'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:9,fill:'#94A3B8'}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="target"    name="Assigned"  fill="#C7D2FE" radius={[3,3,0,0]}/>
              <Bar dataKey="completed" name="Completed" fill="#6366F1" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="px-5 pb-5 flex-1 overflow-y-auto" style={{scrollbarWidth:'thin'}}>
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 mt-2">
          {teams.map((team,idx)=>{
            const pct=team.target>0?(team.completed/team.target)*100:0;
            const done=team.completed===team.target&&team.target>0;
            return (
              <motion.div key={team.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:idx*0.05}}
                className="rounded-2xl p-3 border transition-all"
                style={{background:done?'#ECFDF5':'#F8FAFC',borderColor:done?'#A7F3D0':'#E2E8F0'}}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                    {team.name}{done&&<CheckCircle2 size={11} className="text-emerald-500"/>}
                  </p>
                  <div className="flex -space-x-1.5">
                    {team.members.slice(0,3).map((id:string)=>{
                      const p=profilesMap[id];
                      return (<div key={id} title={p?.full_name||'Member'} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                        {p?.avatar_url?<img src={p.avatar_url} className="w-full h-full object-cover" alt={p.full_name}/>:<UserCircle size={22} className="text-slate-400 -ml-0.5 -mt-0.5"/>}
                      </div>);
                    })}
                    {team.members.length>3&&<div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">+{team.members.length-3}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'#E2E8F0'}}>
                    <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.9,delay:idx*0.07}}
                      className="h-full rounded-full" style={{background:done?'#10B981':'#6366F1'}}/>
                  </div>
                  <span className="text-[10px] font-black text-slate-600">{team.completed}/{team.target}</span>
                </div>
              </motion.div>
            );
          })}
          {teams.length===0&&<div className="col-span-3 flex flex-col items-center justify-center h-16 text-slate-300"><Users size={22} className="mb-1 opacity-40"/><span className="text-xs">No teams today</span></div>}
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   H — INVOICE OVERVIEW  (royal purple + instant invoice)
   invoices table = monthly company invoices
   instant_invoices table = POS / walk-in invoices
═══════════════════════════════════════════════════════════ */
function InvoiceCard({ invoices, dateFrom, dateTo }: { invoices:any[]; dateFrom:string; dateTo:string }) {
  const supabase = createClient();
  const [instantInv, setInstantInv] = useState<any[]>([]);

  useEffect(()=>{
    (async()=>{
      const {data} = await supabase.from('instant_invoices')
        .select('id,total_amount,is_paid,company_id,customer_name,client_type,created_at')
        .gte('created_at',`${dateFrom}T00:00:00`).lte('created_at',`${dateTo}T23:59:59`);
      if(data) setInstantInv(data);
    })();
  },[dateFrom,dateTo]);

  const monthly = useMemo(()=>{
    let total=0,paid=0,due=0;
    const cMap: Record<string,number>={};
    invoices.forEach(inv=>{
      const v=Number(inv.total_amount)||0; total+=v;
      if(inv.is_paid) paid+=v; else due+=v;
      cMap[inv.company_name]=(cMap[inv.company_name]||0)+v;
    });
    const breakdown=Object.entries(cMap).map(([name,value],i)=>({name,value,fill:CHART_COLORS[i%CHART_COLORS.length]})).sort((a,b)=>b.value-a.value);
    return {count:invoices.length,total,paid,due,breakdown};
  },[invoices]);

  const instant = useMemo(()=>{
    let total=0,paid=0,due=0,walkin=0,registered=0;
    instantInv.forEach(inv=>{
      const v=Number(inv.total_amount)||0; total+=v;
      if(inv.is_paid) paid+=v; else due+=v;
      if(inv.client_type==='walk_in') walkin++; else registered++;
    });
    return {count:instantInv.length,total,paid,due,walkin,registered};
  },[instantInv]);

  const pieColors=['#A78BFA','#818CF8','#6366F1','#4F46E5','#4338CA','#3730A3'];
  const instColors=['#34D399','#10B981','#059669','#047857'];

  return (
    <Card bg="linear-gradient(145deg,#1E1B4B 0%,#312E81 40%,#1E1B4B 100%)" border="rgba(167,139,250,0.3)">
      <div className="p-5 pb-3 flex-shrink-0">
        <CardHead icon={FileText} iconBg="rgba(167,139,250,0.25)" iconColor="#A78BFA"
          title={<span className="text-white">Invoice Overview</span>}
          subtitle={<span className="text-violet-300">Monthly + Instant POS invoices</span>}
        />
        {/* Two sections side by side */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Monthly */}
          <div className="rounded-2xl p-3" style={{background:'rgba(167,139,250,0.15)',border:'1px solid rgba(167,139,250,0.25)'}}>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={11} style={{color:'#C4B5FD'}}/>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{color:'#C4B5FD'}}>Monthly</p>
            </div>
            <p className="text-2xl font-black text-white">{monthly.count}</p>
            <div className="flex gap-3 mt-2">
              <div><p className="text-[8px] font-bold text-violet-300 uppercase">Paid</p><p className="text-xs font-black text-emerald-400">AED {monthly.paid.toLocaleString()}</p></div>
              <div><p className="text-[8px] font-bold text-violet-300 uppercase">Due</p><p className="text-xs font-black text-red-400">AED {monthly.due.toLocaleString()}</p></div>
            </div>
          </div>
          {/* Instant POS */}
          <div className="rounded-2xl p-3" style={{background:'rgba(52,211,153,0.15)',border:'1px solid rgba(52,211,153,0.25)'}}>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={11} style={{color:'#6EE7B7'}}/>
              <p className="text-[9px] font-black uppercase tracking-widest" style={{color:'#6EE7B7'}}>Instant POS</p>
            </div>
            <p className="text-2xl font-black text-white">{instant.count}</p>
            <div className="flex gap-3 mt-2">
              <div><p className="text-[8px] font-bold text-emerald-300 uppercase">Walk-in</p><p className="text-xs font-black text-white">{instant.walkin}</p></div>
              <div><p className="text-[8px] font-bold text-emerald-300 uppercase">Regis.</p><p className="text-xs font-black text-white">{instant.registered}</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-3 px-5 pb-5 min-h-0" style={{overflow:'hidden'}}>
        {monthly.breakdown.length===0&&instant.count===0?(
          <div className="flex-1 flex flex-col items-center justify-center" style={{color:'#475569'}}>
            <FileText size={28} className="mb-2 opacity-40"/><span className="text-sm">No invoices in range</span>
          </div>
        ):(
          <>
            {/* Monthly breakdown donut */}
            {monthly.breakdown.length>0&&(
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{color:'#C4B5FD'}}>Monthly by Company</p>
                <div className="relative flex-1" style={{minHeight:130}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={monthly.breakdown} cx="50%" cy="50%" innerRadius="35%" outerRadius="65%" paddingAngle={2} dataKey="value" stroke="none">
                        {monthly.breakdown.map((_,i)=><Cell key={i} fill={pieColors[i%pieColors.length]}/>)}
                      </Pie>
                      <Tooltip content={<Tip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[8px] font-bold uppercase" style={{color:'#A78BFA'}}>Total</span>
                    <span className="text-sm font-black text-white">AED {(monthly.total/1000).toFixed(1)}k</span>
                  </div>
                </div>
                {/* Legend */}
                <div className="space-y-1 mt-2 overflow-y-auto" style={{maxHeight:100,scrollbarWidth:'thin'}}>
                  {monthly.breakdown.slice(0,5).map((c,i)=>(
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:pieColors[i%pieColors.length]}}/>
                        <span className="text-[10px] truncate" style={{color:'#C4B5FD'}}>{c.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-white flex-shrink-0">AED {c.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instant POS bar */}
            {instant.count>0&&(
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{color:'#6EE7B7'}}>Instant POS Summary</p>
                <div className="flex-1 space-y-2">
                  {[
                    {l:'Total Revenue', v:`AED ${instant.total.toLocaleString()}`, c:'#fff'},
                    {l:'Paid',          v:`AED ${instant.paid.toLocaleString()}`,  c:'#34D399'},
                    {l:'Due',           v:`AED ${instant.due.toLocaleString()}`,   c:'#F87171'},
                    {l:'Walk-in',       v:instant.walkin,                          c:'#A7F3D0'},
                    {l:'Registered',    v:instant.registered,                      c:'#A7F3D0'},
                  ].map((item,i)=>(
                    <div key={i} className="flex justify-between items-center rounded-xl p-2.5"
                      style={{background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.15)'}}>
                      <span className="text-[10px] font-bold" style={{color:'#6EE7B7'}}>{item.l}</span>
                      <span className="text-[11px] font-black" style={{color:item.c}}>{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   I — LAUNDRY TRACKING  (orange — only returnable items)
═══════════════════════════════════════════════════════════ */
function LaundryCard({ dateFrom, dateTo }: { dateFrom:string; dateTo:string }) {
  const supabase = createClient();
  const [chartData, setChartData] = useState<any[]>([]);
  const [summary, setSummary] = useState({pendingSend:0,inLaundry:0,received:0});
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      // Only returnable items in laundry records
      const {data:records} = await supabase
        .from('laundry_records')
        .select('sent_qty,received_qty,status,sent_at,equipment:equipment_master!inner(item_name,item_type)')
        .eq('equipment_master.item_type','returnable')
        .gte('sent_at',`${dateFrom}T00:00:00`).lte('sent_at',`${dateTo}T23:59:59`);

      // Pending send = returnable items that are qc_bad but not yet have laundry record
      const {data:pendingLogs} = await supabase
        .from('booking_inventory_logs')
        .select('qc_bad_qty,equipment:equipment_master!inner(item_name,item_type),bookings!inner(cleaning_date)')
        .eq('equipment_master.item_type','returnable')
        .eq('qc_status','completed')
        .gte('bookings.cleaning_date',dateFrom)
        .lte('bookings.cleaning_date',dateTo);

      const iMap: Record<string,{pendingSend:number;inLaundry:number;received:number}>={};
      let tIn=0,tRec=0,tPend=0;

      if(records){
        records.forEach((r:any)=>{
          const n=r.equipment?.item_name||'Other';
          if(!iMap[n]) iMap[n]={pendingSend:0,inLaundry:0,received:0};
          if(r.status==='pending_washing'){iMap[n].inLaundry+=r.sent_qty;tIn+=r.sent_qty;}
          else{iMap[n].received+=r.received_qty;tRec+=r.received_qty;}
        });
      }
      if(pendingLogs){
        pendingLogs.forEach((l:any)=>{
          const n=l.equipment?.item_name||'Other'; const q=l.qc_bad_qty||0;
          if(!iMap[n]) iMap[n]={pendingSend:0,inLaundry:0,received:0};
          iMap[n].pendingSend+=q; tPend+=q;
        });
      }

      setChartData(Object.entries(iMap).map(([name,v])=>({
        name:name.length>12?name.slice(0,12)+'…':name,
        pendingSend:v.pendingSend,inLaundry:v.inLaundry,received:v.received
      })));
      setSummary({pendingSend:tPend,inLaundry:tIn,received:tRec});
      setLoading(false);
    })();
  },[dateFrom,dateTo]);

  return (
    <Card bg="linear-gradient(145deg,#0E7490 0%,#0891B2 40%,#06B6D4 80%,#22D3EE 100%)" border="rgba(255,255,255,0.2)">
      <div className="p-5 pb-2 flex-shrink-0">
        <CardHead icon={WashingMachine} iconBg="rgba(255,255,255,0.2)" iconColor="#fff"
          title={<span className="text-white">Laundry Tracking</span>}
          subtitle={<span style={{color:'#A5F3FC'}}>Returnable items only</span>}
        />
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            {l:'Pending Send',v:summary.pendingSend,bg:'rgba(255,255,255,0.15)',c:'#fff'},
            {l:'In Laundry',  v:summary.inLaundry,  bg:'rgba(251,191,36,0.3)', c:'#FEF08A'},
            {l:'Received',    v:summary.received,   bg:'rgba(52,211,153,0.3)', c:'#A7F3D0'},
          ].map(x=>(
            <div key={x.l} className="rounded-2xl p-2.5 text-center" style={{background:x.bg,border:'1px solid rgba(255,255,255,0.15)'}}>
              <p className="text-[8px] font-bold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.7)'}}>{x.l}</p>
              <p className="text-xl font-black" style={{color:x.c}}>{x.v}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 pb-4 min-h-0">
        {loading?(
          <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-white" size={22}/></div>
        ):chartData.length===0?(
          <div className="flex flex-col items-center justify-center h-full" style={{color:'rgba(255,255,255,0.4)'}}>
            <WashingMachine size={28} className="mb-2 opacity-40"/><span className="text-sm">No laundry records</span>
          </div>
        ):(
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <defs>
                {[['lgP','#FFF','rgba(255,255,255,0.5)'],['lgI','#FDE047','#FEF08A'],['lgR','#34D399','#6EE7B7']].map(([id,c1,c2])=>(
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c1} stopOpacity={0.9}/><stop offset="100%" stopColor={c2} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.15)"/>
              <XAxis dataKey="name" tick={{fontSize:9,fill:'rgba(255,255,255,0.7)',fontWeight:'bold'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:9,fill:'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:'9px',fontWeight:'bold',paddingTop:4,color:'rgba(255,255,255,0.7)'}}/>
              <Bar dataKey="pendingSend" name="Pending Send" stackId="a" fill="url(#lgP)"/>
              <Bar dataKey="inLaundry"  name="In Laundry"   stackId="a" fill="url(#lgI)"/>
              <Bar dataKey="received"   name="Received"     stackId="a" fill="url(#lgR)" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   J — PRICE DISTRIBUTION  (deep rose/magenta — distinct from invoice)
═══════════════════════════════════════════════════════════ */
function PriceDistributionCard({ bookings }: { bookings: any[] }) {
  const scatterData=useMemo(()=>bookings.map((b,i)=>({
    x:i+1, y:Number(b.price)||0,
    z:(b.booking_extra_inventory?.reduce((a:number,e:any)=>a+Number(e.total_price),0)||0)+10,
    status:b.status,
  })),[bookings]);

  const cm: Record<string,string>={finalized:'#34D399',completed:'#60A5FA',active:'#FBBF24',in_progress:'#FBBF24',pending:'rgba(255,255,255,0.3)'};

  return (
    <Card bg="linear-gradient(145deg,#064E3B 0%,#065F46 35%,#047857 65%,#059669 100%)" border="rgba(52,211,153,0.3)">
      <div className="p-5 pb-2 flex-shrink-0">
        <CardHead icon={PieIcon} iconBg="rgba(255,255,255,0.2)" iconColor="#fff"
          title={<span className="text-white">Price Distribution</span>}
          subtitle={<span style={{color:'#A7F3D0'}}>Bubble = extra inventory value</span>}
        />
      </div>
      {/* overflow:hidden prevents scatter bubbles from leaking outside card */}
      <div className="flex-1 flex flex-col px-4 pb-3 min-h-0" style={{overflow:'hidden'}}>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{top:6,right:6,left:-22,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)"/>
              <XAxis dataKey="x" name="Booking #" tick={{fontSize:9,fill:'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false}/>
              <YAxis dataKey="y" name="Price (AED)" tick={{fontSize:9,fill:'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>} cursor={{strokeDasharray:'3 3'}}/>
              <Scatter data={scatterData} name="Bookings"
                shape={(props:any)=>{
                  const {cx,cy,payload}=props;
                  return <circle cx={cx} cy={cy} r={Math.min(Math.max(payload.z/10,5),14)} fill={cm[payload.status]||'rgba(255,255,255,0.3)'} fillOpacity={0.85} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5}/>;
                }}/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-1 flex-shrink-0">
          {Object.entries(cm).filter(([k])=>k!=='in_progress').map(([s,c])=>(
            <div key={s} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.6)'}}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:c}}/>{s}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const supabase = createClient();
  const [loading,setLoading]   = useState(true);
  const [adminProfile,setAdmin] = useState<any>(null);
  const [data,setData] = useState({
    bookings:[] as any[], workLogs:[] as any[], invoices:[] as any[], profilesMap:{} as Record<string,any>,
  });
  const [dateFrom,setDateFrom] = useState(format(startOfMonth(new Date()),'yyyy-MM-dd'));
  const [dateTo,setDateTo]     = useState(format(endOfMonth(new Date()),  'yyyy-MM-dd'));
  const todayStr = format(new Date(),'yyyy-MM-dd');

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const {data:{session}} = await supabase.auth.getSession();
      if(session?.user){
        const {data:p} = await supabase.from('profiles').select('*').eq('id',session.user.id).single();
        setAdmin(p);
      }
      const fs=dateFrom<todayStr?dateFrom:todayStr;
      const fe=dateTo>todayStr?dateTo:todayStr;

      const [bRes,lRes,iRes] = await Promise.all([
        supabase.from('bookings').select(`
          id,cleaning_date,cleaning_time,status,price,assigned_team_id,
          teams(id,team_name,member_ids),
          units(companies(name)),
          booking_extra_inventory(total_price)
        `).gte('cleaning_date',fs).lte('cleaning_date',fe),

        supabase.from('work_logs').select('id,booking_id,start_time,end_time,status,created_at,agent:profiles!work_logs_submitted_by_fkey(full_name,avatar_url)')
          .gte('created_at',`${fs}T00:00:00`).lte('created_at',`${fe}T23:59:59`),

        supabase.from('invoices').select('id,company_name,total_amount,created_at,is_paid,start_date,end_date')
          .lte('start_date',fe).gte('end_date',fs),
      ]);

      const bData=bRes.data||[];
      const memberIds=new Set<string>();
      bData.forEach((b:any)=>{ const t=Array.isArray(b.teams)?b.teams[0]:b.teams; t?.member_ids?.forEach((id:string)=>memberIds.add(id)); });

      let pMap:any={};
      if(memberIds.size>0){
        const {data:pData} = await supabase.from('profiles').select('id,full_name,avatar_url').in('id',Array.from(memberIds));
        if(pData) pData.forEach((p:any)=>(pMap[p.id]=p));
      }
      setData({bookings:bData, workLogs:lRes.data||[], invoices:iRes.data||[], profilesMap:pMap});
      setLoading(false);
    })();
  },[dateFrom,dateTo]);

  if(loading){
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="relative w-14 h-14 mb-4">
          <div className="absolute inset-0 rounded-full border-t-4 border-violet-500 animate-spin"/>
          <div className="absolute inset-2 rounded-full border-r-4 border-blue-400 animate-spin" style={{animationDirection:'reverse',animationDuration:'1.5s'}}/>
          <div className="absolute inset-4 rounded-full border-b-4 border-emerald-400 animate-spin" style={{animationDuration:'2.5s'}}/>
        </div>
        <p className="text-slate-400 font-black text-xs tracking-widest uppercase animate-pulse">Loading…</p>
      </div>
    );
  }

  const todayBookings = data.bookings.filter(b=>b.cleaning_date===todayStr);
  const rangeBookings = data.bookings.filter(b=>b.cleaning_date>=dateFrom&&b.cleaning_date<=dateTo);

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      {/* Full-width — fills any monitor size */}
      <div className="w-full px-4 md:px-6 xl:px-8 2xl:px-10 pt-6 space-y-5">

        <WelcomeHeader adminProfile={adminProfile} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}/>

        {/*
          ┌─────────────────────────────────────────────────────────┐
          │  ROW 1 (top row)                                        │
          │  [Today 3col] [Range 3col] [QC 3col] [LiveFeed 3col]   │
          │                                                         │
          │  ROW 2 (immediately below)                             │
          │  [Financial Performance  9col    ] [LiveFeed cont. 3col]│
          │                                                         │
          │  Today/Range/QC height = H                             │
          │  LiveFeed height = 2×H (spans both rows)               │
          │  Financial height = 2×H - H = fills leftover space     │
          └─────────────────────────────────────────────────────────┘
          We achieve this with CSS grid row heights:
          row1 = ROW_H  |  row2 = FIN_H
          LiveFeed spans both rows = ROW_H + gap + FIN_H
        */}
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: 'repeat(12, minmax(0,1fr))',
            gridTemplateRows: '480px 260px',   /* row1=Today/Range/QC, row2=Financial */
          }}
        >
          {/* Today — row1, col 1-3 */}
          <div style={{gridColumn:'1/4', gridRow:'1/2'}}>
            <TodayBookingsCard bookings={todayBookings}/>
          </div>

          {/* Range — row1, col 4-6 */}
          <div style={{gridColumn:'4/7', gridRow:'1/2'}}>
            <DateRangeCard bookings={rangeBookings}/>
          </div>

          {/* QC — row1, col 7-9 */}
          <div style={{gridColumn:'7/10', gridRow:'1/2'}}>
            <QCAnalyticsCard dateFrom={dateFrom} dateTo={dateTo}/>
          </div>

          {/* LiveFeed — col 10-12, spans BOTH rows (row1 + row2) */}
          <div style={{gridColumn:'10/13', gridRow:'1/3'}}>
            <LiveFeedCard/>
          </div>

          {/* Financial — row2, col 1-9 (below the 3 cards, left of live feed) */}
          <div style={{gridColumn:'1/10', gridRow:'2/3'}}>
            <FinancialCard bookings={rangeBookings} dateFrom={dateFrom} dateTo={dateTo}/>
          </div>
        </div>

        {/*
          ┌──────────────────────────────────────────────────┐
          │  ROW 3                                           │
          │  [Audit 4col] [Team Progress 8col]  same height │
          └──────────────────────────────────────────────────┘
        */}
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: 'repeat(12, minmax(0,1fr))',
            gridTemplateRows: '380px',
          }}
        >
          <div style={{gridColumn:'1/5', gridRow:'1/2'}}>
            <FinancialAuditCard todayBookings={todayBookings} rangeBookings={rangeBookings}/>
          </div>
          <div style={{gridColumn:'5/13', gridRow:'1/2'}}>
            <TeamProgressCard bookings={todayBookings} profilesMap={data.profilesMap}/>
          </div>
        </div>

        {/*
          ┌──────────────────────────────────────────────────────┐
          │  ROW 4 (bottom row)                                  │
          │  [Invoice 6col] [Laundry 3col] [Scatter 3col]       │
          │  Invoice width = 2× each of the other two           │
          └──────────────────────────────────────────────────────┘
        */}
        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: 'repeat(12, minmax(0,1fr))',
            gridTemplateRows: '420px',
          }}
        >
          <div style={{gridColumn:'1/7', gridRow:'1/2'}}>
            <InvoiceCard invoices={data.invoices} dateFrom={dateFrom} dateTo={dateTo}/>
          </div>
          <div style={{gridColumn:'7/10', gridRow:'1/2'}}>
            <LaundryCard dateFrom={dateFrom} dateTo={dateTo}/>
          </div>
          <div style={{gridColumn:'10/13', gridRow:'1/2'}}>
            <PriceDistributionCard bookings={rangeBookings}/>
          </div>
        </div>

      </div>
    </div>
  );
}