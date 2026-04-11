'use client';

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Wallet, Receipt, AlertCircle, 
  Calendar, CheckCircle2, ChevronDown, ChevronUp, 
  PackagePlus, Loader2, Building2, 
  Briefcase, FileDigit, Store, ArrowDownToLine, ArrowUpRight, Eye,
  PieChart as PieChartIcon, Search, BarChart3, Filter, LineChart
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, isSameDay } from "date-fns";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

export default function RevenueDashboard() {
  const supabase = createClient();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Filters ──
  const [dateFilter, setDateFilter] = useState<'this_month' | 'last_month' | 'all_time' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');

  // ── Raw Data ──
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [instantInvoices, setInstantInvoices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);

  // Accordion State
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);

  // ─── Initial Fetch (Companies) ───
  useEffect(() => {
    const fetchComps = async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      if (data) setAllCompanies(data);
    };
    fetchComps();
  }, [supabase]);

  // ─── Fetch Main Data ───
  useEffect(() => {
    if (dateFilter !== 'custom') fetchRevenueData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const applyCustomDate = () => {
    if (customStart && customEnd) fetchRevenueData();
    else alert("Please select both start and end dates.");
  };

  const fetchRevenueData = async () => {
    setIsRefreshing(true);
    let startDateStr = '2000-01-01';
    let endDateStr = '2100-12-31';

    const now = new Date();
    if (dateFilter === 'this_month') {
      startDateStr = format(startOfMonth(now), 'yyyy-MM-dd');
      endDateStr = format(endOfMonth(now), 'yyyy-MM-dd');
    } else if (dateFilter === 'last_month') {
      const lastMonth = subMonths(now, 1);
      startDateStr = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      endDateStr = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      startDateStr = customStart;
      endDateStr = customEnd;
    }

    const [invRes, instRes, bookRes, configRes] = await Promise.all([
      supabase.from('invoices').select('id, invoice_no, total_amount, is_paid, created_at, payment_date, company_name, start_date, end_date, pdf_url, company_id').gte('created_at', `${startDateStr}T00:00:00.000Z`).lte('created_at', `${endDateStr}T23:59:59.999Z`),
      supabase.from('instant_invoices').select('id, invoice_no, total_amount, is_paid, created_at, payment_date, client_type, customer_name, merged_into_monthly, pdf_url, company_id, companies(name)').gte('created_at', `${startDateStr}T00:00:00.000Z`).lte('created_at', `${endDateStr}T23:59:59.999Z`),
      supabase.from('bookings').select(`
        id, cleaning_date, status, price, invoice_no, unit_id, booking_ref, service_type,
        units ( unit_number, building_name, company_id, companies (name) ),
        booking_inventory_logs ( equipment_id, extra_provided_qty, supervisor_price, equipment_master(item_name) ),
        booking_extra_added_charges ( amount, item_description, charge_type )
      `).eq('status', 'finalized').gte('cleaning_date', startDateStr).lte('cleaning_date', endDateStr).order('cleaning_date', { ascending: false }),
      supabase.from('unit_equipment_config').select('unit_id, equipment_id, extra_unit_price')
    ]);

    if (invRes.data) setInvoices(invRes.data);
    if (instRes.data) setInstantInvoices(instRes.data);
    if (configRes.data) setUnitConfigs(configRes.data);

    if (bookRes.data && configRes.data) {
      const processedBookings = bookRes.data.map((b: any) => {
        let invTotal = 0;
        b.booking_inventory_logs?.forEach((i: any) => {
          if (i.extra_provided_qty > 0) {
            const config = configRes.data.find(c => c.unit_id === b.unit_id && c.equipment_id === i.equipment_id);
            const uPrice = i.supervisor_price !== null ? Number(i.supervisor_price) : Number(config?.extra_unit_price || 0);
            invTotal += (i.extra_provided_qty * uPrice);
          }
        });
        let extTotal = b.booking_extra_added_charges?.reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;
        const baseTotal = Number(b.price || 0);
        return { ...b, baseTotal, invTotal, extTotal, grandTotal: baseTotal + invTotal + extTotal };
      });
      setBookings(processedBookings);
    }

    setIsRefreshing(false);
    setInitialLoading(false);
  };

  // ─── Filtered Data Providers ───
  const filteredBookings = useMemo(() => {
    if (selectedCompanyId === 'all') return bookings;
    return bookings.filter(b => b.units?.company_id?.toString() === selectedCompanyId);
  }, [bookings, selectedCompanyId]);

  const filteredInvoices = useMemo(() => {
    if (selectedCompanyId === 'all') return invoices;
    return invoices.filter(i => i.company_id?.toString() === selectedCompanyId);
  }, [invoices, selectedCompanyId]);

  const filteredInstant = useMemo(() => {
    if (selectedCompanyId === 'all') return instantInvoices;
    return instantInvoices.filter(i => i.company_id?.toString() === selectedCompanyId);
  }, [instantInvoices, selectedCompanyId]);

  // ─── KPI Calculations ───
  const stats = useMemo(() => {
    // 1. Total Business / Sales in period (Actual Work Done)
    const totalBookingsValue = filteredBookings.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalInstantSales = filteredInstant.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalBusiness = totalBookingsValue + totalInstantSales;

    // 2. Total Work Billed (Invoices Generated)
    const monthlyBilled = filteredInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const instantBilled = filteredInstant.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalBilled = monthlyBilled + instantBilled;

    // 3. Total Collected Revenue
    const monthlyCollected = filteredInvoices.filter(i => i.is_paid).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const instantCollected = filteredInstant.filter(i => i.is_paid && !i.merged_into_monthly).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalCollected = monthlyCollected + instantCollected;

    // 4. Total Dues (Outstanding)
    const monthlyDue = filteredInvoices.filter(i => !i.is_paid).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const instantDue = filteredInstant.filter(i => !i.is_paid && !i.merged_into_monthly).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalDue = monthlyDue + instantDue;

    // 5. Work Not Invoiced
    const notInvoicedAmount = filteredBookings.filter(b => !b.invoice_no).reduce((sum, b) => sum + b.grandTotal, 0);

    return { 
      totalBusiness, totalBilled, totalCollected, totalDue, notInvoicedAmount, 
      monthlyBilled, instantBilled, monthlyCollected, instantCollected 
    };
  }, [filteredInvoices, filteredInstant, filteredBookings]);

  // ─── Trend Chart Data (Area) ───
  const trendData = useMemo(() => {
    if (filteredBookings.length === 0 && filteredInvoices.length === 0) return [];

    let startD = new Date(); let endD = new Date();
    if (dateFilter === 'this_month') { startD = startOfMonth(new Date()); endD = endOfMonth(new Date()); } 
    else if (dateFilter === 'last_month') { startD = startOfMonth(subMonths(new Date(), 1)); endD = endOfMonth(subMonths(new Date(), 1)); } 
    else if (dateFilter === 'custom' && customStart && customEnd) { startD = parseISO(customStart); endD = parseISO(customEnd); }
    else { startD = subMonths(new Date(), 1); endD = new Date(); } 

    const days = eachDayOfInterval({ start: startD, end: endD });

    return days.map(day => {
      const bookedToday = filteredBookings.filter(b => isSameDay(parseISO(b.cleaning_date), day)).reduce((sum, b) => sum + b.grandTotal, 0);
      const instantToday = filteredInstant.filter(i => isSameDay(parseISO(i.created_at), day)).reduce((sum, i) => sum + Number(i.total_amount), 0);

      const collMonthly = filteredInvoices.filter(i => i.is_paid && isSameDay(parseISO(i.payment_date || i.created_at), day)).reduce((sum, i) => sum + Number(i.total_amount), 0);
      const collInstant = filteredInstant.filter(i => i.is_paid && !i.merged_into_monthly && isSameDay(parseISO(i.payment_date || i.created_at), day)).reduce((sum, i) => sum + Number(i.total_amount), 0);

      return {
        date: format(day, 'dd MMM'),
        Sales: bookedToday + instantToday,
        Collected: collMonthly + collInstant
      };
    });
  }, [filteredBookings, filteredInvoices, filteredInstant, dateFilter, customStart, customEnd]);

  // ─── Bar Chart Data (Source Breakdown) ───
  const sourceBarData = [
    { name: 'Monthly Invoices', Billed: stats.monthlyBilled, Collected: stats.monthlyCollected },
    { name: 'Instant POS', Billed: stats.instantBilled, Collected: stats.instantCollected },
  ];

  // ─── Company Revenue Analytics Data (Pie) ───
  const companyAnalytics = useMemo(() => {
    const map: Record<string, { id: string, name: string, billed: number, collected: number }> = {};

    filteredBookings.forEach(b => {
      const compId = b.units?.company_id?.toString() || 'walk_in';
      const compName = b.units?.companies?.name || 'Walk-in / Cash';
      if(!map[compId]) map[compId] = { id: compId, name: compName, billed: 0, collected: 0 };
      map[compId].billed += b.grandTotal;
    });

    filteredInstant.forEach(i => {
      const compId = i.company_id?.toString() || 'walk_in';
      const compName = i.client_type === 'registered' ? i.companies?.name : (i.customer_name || 'Walk-in / Cash');
      if(!map[compId]) map[compId] = { id: compId, name: compName, billed: 0, collected: 0 };
      map[compId].billed += Number(i.total_amount);
      if(i.is_paid) map[compId].collected += Number(i.total_amount);
    });

    return Object.values(map).sort((a, b) => b.billed - a.billed);
  }, [filteredBookings, filteredInstant]);

  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6366f1'];

  // ─── Ledger History Combination ───
  const combinedLedger = useMemo(() => {
    const list: any[] = [];

    filteredInvoices.forEach(i => {
      const mergedAmount = instantInvoices
        .filter(inst => inst.merged_into_monthly && inst.company_id === i.company_id && new Date(inst.created_at) >= new Date(i.start_date) && new Date(inst.created_at) <= new Date(i.end_date))
        .reduce((sum, inst) => sum + Number(inst.total_amount), 0);
      list.push({ ...i, origin: 'Monthly Contract', date: i.created_at, name: i.company_name, mergedAmount });
    });

    filteredInstant.filter(i => !i.merged_into_monthly).forEach(i => {
      const name = i.client_type === 'registered' ? i.companies?.name : i.customer_name;
      list.push({ ...i, origin: 'Instant POS', date: i.created_at, name });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredInvoices, filteredInstant, instantInvoices]);

  // ─── Custom Tooltips ───
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-200">
          <p className="text-sm font-black text-gray-900 mb-3 border-b border-gray-100 pb-2">{label}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center gap-6 mb-1.5">
              <span className="text-xs font-black flex items-center gap-1.5 text-gray-900">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: p.color }}></div>
                {p.name}:
              </span>
              <span className="text-sm font-black text-gray-900">AED {p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-200">
          <p className="text-sm font-black text-gray-900 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].color }}></div>
            {data.name}
          </p>
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-600 flex justify-between gap-4">
              <span>Total Sales:</span> <span className="text-gray-900 font-black">AED {data.billed.toLocaleString()}</span>
            </p>
            <p className="text-xs font-bold text-gray-600 flex justify-between gap-4">
              <span>Collected:</span> <span className="text-emerald-600 font-black">AED {data.collected.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (initialLoading) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12"/></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative">

      {/* ── CONSTANT HEADER ── */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-32 px-6 md:px-12 shadow-2xl relative z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"/>

        <div className="w-full relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <TrendingUp className="text-blue-500" size={36}/> Revenue Analytics
            </h1>
            <p className="text-blue-200 font-medium mt-2">Track total sales, collections, and company-wise performance.</p>
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            {/* Company Filter */}
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
              <Filter size={16} className="text-blue-400 ml-2 shrink-0"/>
              <select 
                value={selectedCompanyId} 
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-sm font-black text-white outline-none cursor-pointer px-2 py-1 w-full"
              >
                <option value="all" className="text-gray-900">All Companies & Walk-ins</option>
                {allCompanies.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>)}
              </select>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
              <button onClick={() => setDateFilter('this_month')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${dateFilter === 'this_month' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>This Month</button>
              <button onClick={() => setDateFilter('last_month')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${dateFilter === 'last_month' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>Last Month</button>
              <button onClick={() => setDateFilter('all_time')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${dateFilter === 'all_time' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>All Time</button>
              <button onClick={() => setDateFilter('custom')} className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${dateFilter === 'custom' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>Custom</button>
            </div>

            {/* Custom Date Picker */}
            <AnimatePresence>
              {dateFilter === 'custom' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-white font-bold text-xs outline-none px-2 py-1.5 cursor-pointer w-full" />
                  <span className="text-gray-400 font-bold">-</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-white font-bold text-xs outline-none px-2 py-1.5 cursor-pointer w-full" />
                  <button onClick={applyCustomDate} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-colors ml-1">Apply</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT (Overlap Header) ── */}
      <div className={`w-full mx-auto px-4 md:px-8 -mt-20 relative z-30 space-y-8 transition-opacity duration-300 ${isRefreshing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

        {isRefreshing && (
          <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 pointer-events-none">
            <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <Loader2 className="animate-spin text-blue-600 size-6" />
              <span className="font-black text-gray-900 text-sm">Refreshing Analytics...</span>
            </div>
          </div>
        )}

        {/* ── 5 KPI CARDS (GRID COLS 5) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Card 5: New Total Business Card */}
          <div className="bg-gradient-to-br from-indigo-800 to-indigo-950 text-white p-5 rounded-[2rem] shadow-xl shadow-indigo-900/20 border border-indigo-700 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform"><LineChart size={80}/></div>
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Store size={12}/> Total Sales / Business</p>
            <h2 className="text-2xl font-black text-white">AED {stats.totalBusiness.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            <p className="text-[10px] font-bold text-indigo-200 mt-2">All work done in period</p>
          </div>

          {/* Original 4 Cards */}
          <div className="bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><Briefcase size={80}/></div>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FileDigit size={12}/> Total Work Billed</p>
            <h2 className="text-2xl font-black text-gray-900">AED {stats.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            <p className="text-[10px] font-bold text-gray-500 mt-2">Generated Invoices & POS</p>
          </div>

          <div className="bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-emerald-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform"><Wallet size={80}/></div>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><ArrowDownToLine size={12}/> Collected Revenue</p>
            <h2 className="text-2xl font-black text-emerald-600">AED {stats.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            <p className="text-[10px] font-bold text-gray-500 mt-2">Successfully received</p>
          </div>

          <div className="bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-amber-200 flex flex-col justify-center relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 opacity-5 text-amber-500 group-hover:scale-110 transition-transform"><AlertCircle size={80}/></div>
             <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><ArrowUpRight size={12}/> Outstanding Dues</p>
             <h2 className="text-2xl font-black text-amber-600">AED {stats.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
             <p className="text-[10px] font-bold text-gray-500 mt-2">Pending to collect</p>
          </div>

          <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-200 flex flex-col justify-center border-dashed">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Receipt size={12}/> Work Not Invoiced</p>
             <h2 className="text-2xl font-black text-slate-700">AED {stats.notInvoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
             <p className="text-[10px] font-bold text-slate-400 mt-2">Finalized, bill pending</p>
          </div>
        </div>

        {/* ── CHARTS SECTION (Area + Bar) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Area Chart: Daily Trend */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 border border-slate-100 h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-indigo-600"/> Daily Revenue Trend (Sales vs Collected)</h3>
            <div className="flex-1 w-full h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                  <RechartsTooltip content={<CustomAreaTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Sales" stroke="#94a3b8" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="Collected" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: Source Comparison */}
          <div className="lg:col-span-1 bg-white rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 border border-slate-100 h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2"><BarChart3 size={16} className="text-blue-500"/> Source Performance</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                  <RechartsTooltip content={<CustomAreaTooltip />} cursor={{fill: 'transparent'}} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '10px' }} />
                  <Bar dataKey="Billed" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Collected" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ── COMPANY REVENUE ANALYTICS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Donut Chart */}
          <div className="lg:col-span-1 bg-white rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col h-[450px]">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2 flex items-center gap-2"><PieChartIcon size={16} className="text-indigo-600"/> Sales by Company</h3>
            <p className="text-xs font-bold text-gray-500 mb-4">Top contributors to total sales</p>
            <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
              {companyAnalytics.length === 0 ? (
                <p className="text-sm font-bold text-gray-400">No data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={companyAnalytics} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="billed" stroke="none">
                      {companyAnalytics.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Company List */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 border border-slate-100 h-[450px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2"><Building2 size={16} className="text-blue-600"/> Company Performance</h3>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-black">{companyAnalytics.length} Clients</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
              {companyAnalytics.length === 0 ? (
                 <div className="text-center py-20 text-gray-400 font-bold">No sales records found.</div>
              ) : (
                companyAnalytics.map((comp, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors group">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}>
                         {i + 1}
                       </div>
                       <h4 className="font-black text-gray-900 text-base leading-tight flex items-center flex-wrap gap-2">
                         {comp.name}
                         {comp.id === 'walk_in' && (
                           <span className="text-[9px] bg-orange-100 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest">Walk-in</span>
                         )}
                       </h4>
                    </div>
                    <div className="flex items-center gap-6 mt-3 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                       <div className="text-right">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sales</p>
                         <p className="text-sm font-black text-blue-600">AED {comp.billed.toLocaleString()}</p>
                       </div>
                       <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
                       <div className="text-right">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Collected</p>
                         <p className="text-sm font-black text-emerald-600">AED {comp.collected.toLocaleString()}</p>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── WORK HISTORY (ACCORDION) ── */}
          <div className="lg:col-span-7 bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><Briefcase size={20} className="text-indigo-600"/> Detailed Work History</h3>
                <p className="text-xs font-bold text-gray-500 mt-1">Breakdown of Sales by Bookings</p>
              </div>
              <span className="bg-white border border-gray-200 text-xs font-black px-3 py-1.5 rounded-lg text-gray-600">{filteredBookings.length} Tasks</span>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar bg-slate-50/30">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-bold">No completed work found for this period.</div>
              ) : (
                filteredBookings.map((b) => {
                  const validInventory = b.booking_inventory_logs?.filter((i: any) => i.extra_provided_qty > 0);

                  return (
                    <div key={b.id} className={`border rounded-2xl overflow-hidden transition-all ${expandedBookingId === b.id ? 'border-indigo-300 shadow-md bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>

                      {/* Accordion Header */}
                      <div onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group">
                        <div className="flex-1">

                          {/* 🚨 HIGHLIGHTED COMPANY NAME */}
                          <div className="inline-flex items-center gap-2 mb-2">
                             <span className="bg-gray-100 text-gray-900 border border-gray-200 px-3 py-1 rounded-lg text-sm font-black flex items-center gap-1.5 shadow-sm">
                               <Building2 size={16} className="text-blue-600"/> {b.units?.companies?.name || "Unknown Company"}
                             </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                             <p className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                               Unit {b.units?.unit_number} <span className="text-gray-300 font-normal">|</span> {b.units?.building_name}
                             </p>
                             {b.invoice_no ? (
                               <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded uppercase font-black tracking-widest shadow-sm">Billed</span>
                             ) : (
                               <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded uppercase font-black tracking-widest shadow-sm">Not Invoiced</span>
                             )}
                          </div>
                          <p className="text-xs font-bold text-gray-500 flex items-center gap-2">
                            <span className="uppercase text-gray-400">{b.booking_ref}</span> • {format(parseISO(b.cleaning_date), 'dd MMM yyyy')}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Value</p>
                            <p className="text-lg font-black text-indigo-700">AED {b.grandTotal.toFixed(2)}</p>
                          </div>
                          <div className={`p-1.5 rounded-full transition-colors border ${expandedBookingId === b.id ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                            {expandedBookingId === b.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Body (Breakdown) */}
                      <AnimatePresence>
                        {expandedBookingId === b.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-indigo-100 bg-indigo-50/20">
                            <div className="p-5 space-y-4 text-sm">

                              <div className="flex justify-between items-center text-gray-800 font-bold bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm">
                                <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500"/> Base Service: {b.service_type}</span>
                                <span className="font-black text-gray-900">AED {b.baseTotal.toFixed(2)}</span>
                              </div>

                              {validInventory && validInventory.length > 0 && (
                                <div className="pl-4 border-l-[3px] border-indigo-300 space-y-2.5 mt-3">
                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><PackagePlus size={12}/> Extra Inventory Provided</p>
                                  {validInventory.map((i: any, idx: number) => {
                                     const config = unitConfigs.find(c => c.unit_id === b.unit_id && c.equipment_id === i.equipment_id);
                                     const uPrice = i.supervisor_price !== null ? Number(i.supervisor_price) : Number(config?.extra_unit_price || 0);
                                     const itemTotal = i.extra_provided_qty * uPrice;
                                     if(itemTotal <= 0) return null; // 🚨 Hide 0 value items
                                     return (
                                       <div key={idx} className="flex justify-between items-center text-gray-800 font-medium text-xs bg-white p-2.5 rounded-xl border border-indigo-50 shadow-sm">
                                         <span>{i.extra_provided_qty}x {i.equipment_master?.item_name}</span>
                                         <span className="font-black text-indigo-900">AED {itemTotal.toFixed(2)}</span>
                                       </div>
                                     )
                                  })}
                                </div>
                              )}

                              {b.booking_extra_added_charges?.length > 0 && (
                                <div className="pl-4 border-l-[3px] border-red-300 space-y-2.5 mt-3">
                                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><AlertCircle size={12}/> Additional Charges / Damage</p>
                                  {b.booking_extra_added_charges.map((c: any, idx: number) => (
                                     <div key={idx} className="flex justify-between items-center text-gray-800 font-medium text-xs bg-white p-2.5 rounded-xl border border-red-50 shadow-sm">
                                       <span className="flex items-center gap-1.5">
                                          <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-black">{c.charge_type}</span>
                                          {c.item_description}
                                       </span>
                                       <span className="font-black text-red-800">AED {Number(c.amount).toFixed(2)}</span>
                                     </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── INVOICE HISTORY (LEDGER) ── */}
          <div className="lg:col-span-5 bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col overflow-hidden h-[600px]">
            <div className="p-6 md:p-8 border-b border-slate-100 shrink-0">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><Calendar size={20} className="text-blue-600"/> Invoice History</h3>
              <p className="text-xs font-bold text-gray-500 mt-1">Combined Monthly & POS History</p>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1 bg-slate-50/30">
              {combinedLedger.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold">No ledger entries found.</div>
              ) : (
                combinedLedger.map((l: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-4 md:p-5 border border-gray-200 rounded-2xl hover:bg-white hover:shadow-md hover:border-blue-200 transition-all bg-white group">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl transition-colors mt-0.5 border ${l.origin === 'Monthly Contract' ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-100'}`}>
                        {l.origin === 'Monthly Contract' ? <Building2 size={18}/> : <Store size={18}/>}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-tight">{l.name || "Unknown Client"}</p>

                        <div className="flex flex-col items-start gap-1.5 mt-2">
                           <div className="flex items-center gap-1.5">
                             <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${l.origin === 'Monthly Contract' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                               {l.origin === 'Monthly Contract' ? 'Reg Bill' : 'Inst Bill'}
                             </span>
                             <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{l.invoice_no}</p>
                           </div>

                           {/* 🚨 Invoice Date Range for Monthly Bills */}
                           {l.origin === 'Monthly Contract' && l.start_date && l.end_date && (
                              <span className="text-[9px] bg-gray-50 border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                Period: {format(parseISO(l.start_date), 'dd MMM')} - {format(parseISO(l.end_date), 'dd MMM yyyy')}
                              </span>
                           )}
                        </div>

                        {/* 🚨 Faint Included Instant Bills Notice */}
                        {l.mergedAmount > 0 && (
                           <p className="text-[9px] font-black text-indigo-400/80 mt-2 flex items-center gap-1">
                             <PackagePlus size={10}/> Includes Instant Bills: AED {l.mergedAmount.toFixed(2)}
                           </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between h-full gap-3">
                      <div className="text-right">
                        <p className="text-base font-black text-gray-900">AED {Number(l.total_amount).toFixed(2)}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-1 inline-block border shadow-sm ${l.is_paid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                          {l.is_paid ? 'Paid' : 'Due'}
                        </span>
                      </div>

                      {/* 🚨 View PDF Button */}
                      {l.pdf_url && (
                        <a href={l.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 hover:bg-gray-900 hover:text-white rounded-lg transition-colors border border-gray-200 text-xs font-black shadow-sm" title="Open PDF">
                          <Eye size={14}/> View
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}