'use client';

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TrendingDown, Wallet, Receipt, AlertCircle, 
  Calendar, CheckCircle2, ChevronDown, ChevronUp, 
  PackagePlus, Building2, RotateCw,
  Briefcase, FileDigit, Store, ArrowDownToLine, ArrowUpRight, Eye,
  PieChart as PieChartIcon, Search, BarChart3, Filter, LineChart, Info
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, isSameDay } from "date-fns";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { PageSkeleton } from '@/components/common/Skeleton';
import DotsLoader from '@/components/common/DotsLoader';
import Kbd from '@/components/common/Kbd';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

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
  const [expenses, setExpenses] = useState<any[]>([]);

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [activeInfoCard, setActiveInfoCard] = useState<number | null>(null);

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

  useKeyboardShortcuts([
    {
      combo: 'Alt+R',
      description: 'Refresh revenue analytics',
      category: 'Actions',
      handler: () => {
        setIsRefreshing(true);
        fetchRevenueData();
      },
    },
    {
      combo: 'Alt+1',
      description: 'Filter: This Month',
      category: 'Filters',
      handler: () => setDateFilter('this_month'),
    },
    {
      combo: 'Alt+2',
      description: 'Filter: Last Month',
      category: 'Filters',
      handler: () => setDateFilter('last_month'),
    },
    {
      combo: 'Alt+3',
      description: 'Filter: All Time',
      category: 'Filters',
      handler: () => setDateFilter('all_time'),
    },
    {
      combo: 'Alt+4',
      description: 'Filter: Custom Date',
      category: 'Filters',
      handler: () => setDateFilter('custom'),
    },
  ]);

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

    const [invRes, instRes, bookRes, configRes, expRes] = await Promise.all([
      supabase.from('invoices').select('id, invoice_no, invoice_date, subtotal, discount, total_amount, is_paid, created_at, payment_date, company_name, start_date, end_date, pdf_url, company_id, instant_invoice_ids').gte('end_date', `${startDateStr}T00:00:00.000Z`).lte('end_date', `${endDateStr}T23:59:59.999Z`),
      supabase.from('instant_invoices').select('id, invoice_no, invoice_date, subtotal, discount, total_amount, is_paid, created_at, payment_date, client_type, customer_name, merged_into_monthly, pdf_url, company_id, companies(name)').gte('invoice_date', startDateStr).lte('invoice_date', endDateStr),
      supabase.from('bookings').select(`
        id, cleaning_date, status, price, invoice_no, unit_id, booking_ref, service_type,
        units ( unit_number, building_name, company_id, companies (name) ),
        booking_inventory_logs ( equipment_id, extra_provided_qty, supervisor_price, equipment_master(item_name) ),
        booking_extra_added_charges ( amount, item_description, charge_type )
      `).eq('status', 'finalized').gte('cleaning_date', startDateStr).lte('cleaning_date', endDateStr).order('cleaning_date', { ascending: false }),
      supabase.from('unit_equipment_config').select('unit_id, equipment_id, extra_unit_price'),
      supabase.schema('expenses').from('expenses').select('*').gte('expense_date', startDateStr).lte('expense_date', endDateStr)
    ]);

    if (invRes.data) setInvoices(invRes.data);
    if (instRes.data) setInstantInvoices(instRes.data);
    if (configRes.data) setUnitConfigs(configRes.data);
    if (expRes.data) setExpenses(expRes.data);

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

    // 2. Total Work Billed — monthly invoice already includes merged instant amounts,
    //    so only add unmerged instant bills to avoid double counting.
    const monthlyBilled = filteredInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const instantBilled = filteredInstant.filter(i => !i.merged_into_monthly).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const mergedInstantBilled = filteredInstant.filter(i => i.merged_into_monthly).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalInstantAll = filteredInstant.reduce((sum, i) => sum + Number(i.total_amount), 0); // all instant (merged+unmerged)
    const totalBilled = monthlyBilled + instantBilled;

    // 3. Total Collected Revenue — merged instant paid status is reflected via monthly invoice,
    //    so only count unmerged instant invoices separately.
    const monthlyCollected = filteredInvoices.filter(i => i.is_paid).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const instantCollected = filteredInstant.filter(i => i.is_paid && !i.merged_into_monthly).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalCollected = monthlyCollected + instantCollected;

    // 4. Total Dues (Outstanding)
    const monthlyDue = filteredInvoices.filter(i => !i.is_paid).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const instantDue = filteredInstant.filter(i => !i.is_paid && !i.merged_into_monthly).reduce((sum, i) => sum + Number(i.total_amount), 0);
    const totalDue = monthlyDue + instantDue;

    // 5. Work Not Invoiced (finalized bookings with no invoice_no)
    const notInvoicedAmount = filteredBookings.filter(b => !b.invoice_no).reduce((sum, b) => sum + b.grandTotal, 0);

    // 6. Total Discounts Given (both monthly invoices and instant invoices)
    const monthlyDiscount = filteredInvoices.reduce((sum, i) => sum + Number(i.discount || 0), 0);
    const instantDiscount = filteredInstant.reduce((sum, i) => sum + Number(i.discount || 0), 0);
    const totalDiscount = monthlyDiscount + instantDiscount;

    // 7. Total Expenses
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // 8. New Card 1 Breakdowns
    const totalCleaningBase = filteredBookings.reduce((sum, b) => sum + (b.baseTotal || 0), 0);
    const totalInvExtra = filteredBookings.reduce((sum, b) => sum + (b.invTotal || 0), 0);
    const totalExtCharge = filteredBookings.reduce((sum, b) => sum + (b.extTotal || 0), 0);

    // 9. New Card 2: Invoiced Work of This Period
    const invoicedBookings = filteredBookings.filter(b => b.invoice_no);
    const invoicedBookingsAmount = invoicedBookings.reduce((sum, b) => sum + b.grandTotal, 0);
    const invoicedBookingsCount = invoicedBookings.length;
    const unmergedInstantCount = filteredInstant.filter(i => !i.merged_into_monthly).length;

    // 10. Actual Revenue
    const actualRevenue = totalCollected - totalExpense;

    return { 
      totalBusiness, totalBilled, totalCollected, totalDue, notInvoicedAmount, 
      monthlyBilled, instantBilled, monthlyCollected, instantCollected,
      mergedInstantBilled, totalInstantAll,
      totalDiscount, monthlyDiscount, instantDiscount,
      totalExpense,
      totalCleaningBase, totalInvExtra, totalExtCharge,
      invoicedBookingsAmount, invoicedBookingsCount, unmergedInstantCount,
      actualRevenue
    };
  }, [filteredInvoices, filteredInstant, filteredBookings, expenses]);

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
      const instantToday = filteredInstant.filter(i => isSameDay(parseISO(i.invoice_date || i.created_at), day)).reduce((sum, i) => sum + Number(i.total_amount), 0);

      const collMonthly = filteredInvoices.filter(i => i.is_paid && isSameDay(parseISO(i.payment_date || i.invoice_date || i.created_at), day)).reduce((sum, i) => sum + Number(i.total_amount), 0);
      const collInstant = filteredInstant.filter(i => i.is_paid && !i.merged_into_monthly && isSameDay(parseISO(i.payment_date || i.invoice_date || i.created_at), day)).reduce((sum, i) => sum + Number(i.total_amount), 0);

      return {
        date: format(day, 'dd MMM'),
        Sales: bookedToday + instantToday,
        Collected: collMonthly + collInstant
      };
    });
  }, [filteredBookings, filteredInvoices, filteredInstant, dateFilter, customStart, customEnd]);

  // ─── Bar Chart Data (Source Breakdown) — Merged POS stacked on Monthly ───
  const sourceBarData = [
    { 
      name: 'Monthly', 
      Billed: stats.monthlyBilled, 
      Collected: stats.monthlyCollected,
      MergedPOS: stats.mergedInstantBilled  // stacked on top of monthly bar
    },
    { 
      name: 'Instant POS', 
      Billed: stats.totalInstantAll,   // all instant (merged + unmerged) combined
      Collected: stats.instantCollected,
      MergedPOS: 0
    },
  ];

  // ─── Company Revenue Analytics Data (Pie) ───
  const companyAnalytics = useMemo(() => {
    const map: Record<string, { 
      id: string, name: string, billed: number, collected: number,
      monthlyBilled: number, monthlyCollected: number,
      monthlyDiscount: number,
      instantBilled: number, instantCollected: number,
      instantDiscount: number,
      mergedInstantIds: string[],
      mergedInstantBilled: number,
      individualInstantBilled: number,
    }> = {};

    const empty = () => ({ billed: 0, collected: 0, monthlyBilled: 0, monthlyCollected: 0, monthlyDiscount: 0, instantBilled: 0, instantCollected: 0, instantDiscount: 0, mergedInstantIds: [] as string[], mergedInstantBilled: 0, individualInstantBilled: 0 });

    // Add monthly invoices
    filteredInvoices.forEach(inv => {
      const compId = inv.company_id?.toString() || 'unknown';
      const compName = inv.company_name || 'Unknown';
      if (!map[compId]) map[compId] = { id: compId, name: compName, ...empty() };
      map[compId].monthlyBilled += Number(inv.total_amount);
      map[compId].monthlyDiscount += Number(inv.discount || 0);
      map[compId].billed += Number(inv.total_amount);
      if (inv.is_paid) { map[compId].monthlyCollected += Number(inv.total_amount); map[compId].collected += Number(inv.total_amount); }
      if (inv.instant_invoice_ids?.length) map[compId].mergedInstantIds.push(...inv.instant_invoice_ids);
    });

    // All instant invoices — track merged vs individual separately
    filteredInstant.forEach(i => {
      const compId = i.company_id?.toString() || 'walk_in';
      const compName = i.client_type === 'registered' ? i.companies?.name : (i.customer_name || 'Walk-in / Cash');
      if (!map[compId]) map[compId] = { id: compId, name: compName, ...empty() };
      map[compId].instantBilled += Number(i.total_amount);
      map[compId].instantDiscount += Number(i.discount || 0);
      if (i.merged_into_monthly) {
        map[compId].mergedInstantBilled += Number(i.total_amount);
      } else {
        map[compId].individualInstantBilled += Number(i.total_amount);
        map[compId].billed += Number(i.total_amount);
        if (i.is_paid) { map[compId].instantCollected += Number(i.total_amount); map[compId].collected += Number(i.total_amount); }
      }
    });

    return Object.values(map).sort((a, b) => b.billed - a.billed);
  }, [filteredInvoices, filteredInstant]);

  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#6366f1'];

  // ─── Expense Category Data ───
  const expenseCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category_name || "Uncategorized";
      map[cat] = (map[cat] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    expenseCategoryData.forEach((cat, index) => {
      map[cat.name] = PIE_COLORS[index % PIE_COLORS.length];
    });
    return map;
  }, [expenseCategoryData]);

  // ─── Ledger History Combination ───
  const combinedLedger = useMemo(() => {
    const list: any[] = [];

    filteredInvoices.forEach(inv => {
      // Use instant_invoice_ids array for accurate merged lookup
      const mergedInstants = (inv.instant_invoice_ids || [])
        .map((iid: string) => instantInvoices.find((ii: any) => ii.id === iid))
        .filter(Boolean);
      const mergedAmount = mergedInstants.reduce((sum: number, inst: any) => sum + Number(inst.total_amount), 0);
      list.push({ ...inv, origin: 'Monthly Contract', date: inv.invoice_date || inv.created_at, name: inv.company_name, mergedAmount, mergedInstants });
    });

    filteredInstant.filter(i => !i.merged_into_monthly).forEach(i => {
      const name = i.client_type === 'registered' ? i.companies?.name : i.customer_name;
      list.push({ ...i, origin: 'Instant POS', date: i.invoice_date || i.created_at, name });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredInvoices, filteredInstant, instantInvoices]);

  // ─── Custom Tooltips ───
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0c1427] p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800">
          <p className="text-sm font-black text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-slate-800 pb-2">{label}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center gap-6 mb-1.5">
              <span className="text-xs font-black flex items-center gap-1.5 text-gray-900 dark:text-slate-200">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: p.color }}></div>
                {p.name}:
              </span>
              <span className="text-sm font-black text-gray-900 dark:text-white">AED {p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // payload contains data for the hovered bar (Monthly or Instant POS)
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#0c1427] p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 min-w-[200px]">
          <p className="text-sm font-black text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-slate-800 pb-2">{label}</p>
          
          {label === 'Monthly' && (
            <>
              <div className="flex justify-between items-center gap-6 mb-1.5">
                <span className="text-xs font-black flex items-center gap-1.5 text-gray-900 dark:text-slate-200">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm bg-slate-400"></div>
                  Contract Billed:
                </span>
                <span className="text-sm font-black text-gray-900 dark:text-white">AED {data.Billed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {data.MergedPOS > 0 && (
                <div className="flex justify-between items-center gap-6 mb-1.5">
                  <span className="text-xs font-black flex items-center gap-1.5 text-gray-900 dark:text-slate-200">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm bg-indigo-500"></div>
                    Merged POS:
                  </span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">AED {data.MergedPOS.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-6 mt-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <span className="text-xs font-black flex items-center gap-1.5 text-gray-900 dark:text-slate-200">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm bg-blue-500"></div>
                  Collected:
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">AED {data.Collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}

          {label === 'Instant POS' && (
            <>
              <div className="flex justify-between items-center gap-6 mb-1">
                <span className="text-xs font-black flex items-center gap-1.5 text-gray-900 dark:text-slate-200">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm bg-slate-400"></div>
                  Total Billed:
                </span>
                <span className="text-sm font-black text-gray-900 dark:text-white">AED {data.Billed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pl-4 mb-2 space-y-1">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">↳ Individual:</span>
                  <span className="text-[10px] font-black text-gray-700 dark:text-slate-300">AED {stats.instantBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400">↳ Merged:</span>
                  <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400">AED {stats.mergedInstantBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex justify-between items-center gap-6 mt-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                <span className="text-xs font-black flex items-center gap-1.5 text-gray-900 dark:text-slate-200">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm bg-blue-500"></div>
                  Collected:
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">AED {data.Collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#0c1427] p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800">
          <p className="text-sm font-black text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: payload[0].color }}></span>
            {data.name}
          </p>
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-600 dark:text-slate-400 flex justify-between gap-4">
              <span>Total Sales:</span> <span className="text-gray-900 dark:text-white font-black">AED {data.billed.toLocaleString()}</span>
            </p>
            <p className="text-xs font-bold text-gray-600 dark:text-slate-400 flex justify-between gap-4">
              <span>Collected:</span> <span className="text-emerald-600 dark:text-emerald-400 font-black">AED {data.collected.toLocaleString()}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomExpenseTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0c1427] p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].color || payload[0].payload.fill }}></div>
          <div>
            <p className="text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">{payload[0].payload.name}</p>
            <p className="text-sm font-black text-red-600 dark:text-red-400">AED {payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] p-6 md:p-12">
        <PageSkeleton layout="dashboard" showStats={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] pb-24 font-sans relative">

      {/* ── CONSTANT HEADER — Midnight Emerald & Forest Waves (dark) ── */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:from-[#051814] dark:via-[#092b23] dark:to-[#030d0b] text-white pt-10 pb-32 px-6 md:px-12 shadow-2xl relative z-10 overflow-hidden dark:border-b dark:border-emerald-500/20 dark:shadow-[0_12px_40px_rgba(16,185,129,0.15)]">
        {/* Light mode gradient */}
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:hidden' />

        {/* Dark mode multi-color emerald forest gradient */}
        <div className='absolute inset-0 hidden dark:block' style={{ background: 'linear-gradient(135deg, #02140d 0%, #05261d 20%, #0a3d2e 40%, #08382a 65%, #031c15 85%, #010a08 100%)' }} />

        {/* Dark mode glowing emerald orbs */}
        <div className='absolute -top-12 -left-12 w-96 h-96 hidden dark:block bg-emerald-500/25 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute bottom-0 right-10 w-96 h-96 hidden dark:block bg-teal-400/20 rounded-full blur-[90px] pointer-events-none' />
        <div className='absolute top-1/4 right-1/3 w-72 h-72 hidden dark:block bg-lime-400/12 rounded-full blur-[80px] pointer-events-none' />

        {/* Dark mode SVG Midnight Emerald Waves */}
        <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block'>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="rev-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="35%" stopColor="#34D399" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#059669" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#0D9488" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="rev-grad-wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.30" />
                <stop offset="40%" stopColor="#84CC16" stopOpacity="0.22" />
                <stop offset="75%" stopColor="#064E3B" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="rev-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#34D399" stopOpacity="0.95" />
                <stop offset="85%" stopColor="#A7F3D0" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="rev-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A3E635" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#34D399" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.8" />
              </linearGradient>
              <filter id="rev-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Background Emerald Wave */}
            <path d="M0,110 C320,40 560,180 860,90 C1160,10 1320,150 1440,80 L1440,320 L0,320 Z" fill="url(#rev-grad-wave1)" />
            <path d="M0,110 C320,40 560,180 860,90 C1160,10 1320,150 1440,80" stroke="url(#rev-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#rev-glow-emerald)" />
            {/* Foreground Jade Wave */}
            <path d="M0,160 C260,200 480,90 780,150 C1080,210 1280,100 1440,140 L1440,320 L0,320 Z" fill="url(#rev-grad-wave2)" />
            <path d="M0,160 C260,200 480,90 780,150 C1080,210 1280,100 1440,140" stroke="url(#rev-crest-2)" strokeWidth="2" strokeLinecap="round" />
            {/* Subtle Lower Wave Ribbon */}
            <path d="M0,230 C360,270 680,180 1020,240 C1240,280 1380,210 1440,220" stroke="url(#rev-crest-1)" strokeWidth="1.2" strokeDasharray="6 6" strokeOpacity="0.4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Light mode decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden"/>

        <div className="w-full relative z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <TrendingUp className="text-blue-500 dark:text-emerald-400" size={36}/> Revenue Analytics
            </h1>
            <p className="text-blue-200 dark:text-emerald-200/80 font-medium mt-2">Track total sales, collections, and company-wise performance.</p>
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

            {/* Date Filters & Refresh */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
              <button onClick={() => setDateFilter('this_month')} className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${dateFilter === 'this_month' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>
                This Month <Kbd variant="glass" size="xs">Alt+1</Kbd>
              </button>
              <button onClick={() => setDateFilter('last_month')} className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${dateFilter === 'last_month' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>
                Last Month <Kbd variant="glass" size="xs">Alt+2</Kbd>
              </button>
              <button onClick={() => setDateFilter('all_time')} className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${dateFilter === 'all_time' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>
                All Time <Kbd variant="glass" size="xs">Alt+3</Kbd>
              </button>
              <button onClick={() => setDateFilter('custom')} className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${dateFilter === 'custom' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}>
                Custom <Kbd variant="glass" size="xs">Alt+4</Kbd>
              </button>
              <button
                onClick={() => {
                  setIsRefreshing(true);
                  fetchRevenueData();
                }}
                title="Refresh Analytics (Alt+R)"
                aria-label="Refresh Analytics"
                className="p-2 hover:bg-white/20 text-white rounded-xl transition-all flex items-center justify-center ml-1"
              >
                <RotateCw size={15} />
              </button>
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
      <div className={`w-full mx-auto px-4 md:px-8 xl:px-12 2xl:px-16 -mt-20 relative z-30 space-y-8 transition-opacity duration-300 ${isRefreshing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

        {isRefreshing && (
          <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 pointer-events-none">
            <div className="bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <DotsLoader size="sm" variant="primary" label="Refreshing Analytics..." />
            </div>
          </div>
        )}

        {/* ── 5 KPI CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Card 1: Total Sales / Business */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0 }}
            className="bg-gradient-to-br from-indigo-800 to-indigo-950 text-white p-5 rounded-[2rem] shadow-xl shadow-indigo-900/20 border border-indigo-700 flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-indigo-900/30 hover:-translate-y-1 transition-all duration-200"
            onClick={() => document.getElementById('charts-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="absolute top-4 right-4 z-20">
              <button onClick={(e) => { e.stopPropagation(); setActiveInfoCard(1); }} className="text-indigo-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Info size={14}/></button>
            </div>
            <AnimatePresence>
              {activeInfoCard === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-indigo-900/95 backdrop-blur-sm z-30 rounded-[2rem] p-5 flex flex-col justify-center text-white" onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }}>
                  <h4 className="font-bold mb-2 flex items-center gap-2"><Info size={14}/> How is this calculated?</h4>
                  <p className="text-xs leading-relaxed text-indigo-100">Total value of all cleaning jobs completed and POS sales made during this period, regardless of whether they have been billed yet.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-125 group-hover:opacity-20 transition-all duration-300"><LineChart size={80}/></div>
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Store size={12}/> Total Sales / Business</p>
            <h2 className="text-2xl font-black text-white mb-2">AED {stats.totalBusiness.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            
            <div className="mt-auto relative z-10 w-full min-w-0 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-indigo-900/40 rounded-lg p-2 flex flex-col justify-center">
                  <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider mb-0.5">Cleaning</p>
                  <p className="text-sm font-black text-white">{stats.totalCleaningBase.toLocaleString()}</p>
                </div>
                <div className="bg-indigo-900/40 rounded-lg p-2 flex flex-col justify-center">
                  <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider mb-0.5">Inst. POS</p>
                  <p className="text-sm font-black text-white">{stats.totalInstantAll.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-[8px] font-medium text-indigo-300/80 leading-tight flex flex-wrap gap-x-1.5 mt-2 px-1">
                <span>Inventory: <span className="font-bold">{stats.totalInvExtra.toLocaleString()}</span></span>
                <span>•</span>
                <span>Extra: <span className="font-bold">{stats.totalExtCharge.toLocaleString()}</span></span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Invoiced Work of This Period */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.06 }}
            className="bg-white dark:bg-[#0c1427] p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-blue-100/60 dark:hover:shadow-blue-950/30 hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-500/50 transition-all duration-200"
            onClick={() => document.getElementById('detailed-work-history')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="absolute top-4 right-4 z-20">
              <button onClick={(e) => { e.stopPropagation(); setActiveInfoCard(2); }} className="text-gray-300 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"><Info size={14}/></button>
            </div>
            <AnimatePresence>
              {activeInfoCard === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-sm z-30 rounded-[2rem] p-5 flex flex-col justify-center text-gray-900 dark:text-white" onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }}>
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400"><Info size={14}/> How is this calculated?</h4>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-slate-300">Total value of cleaning jobs from this period that have had an invoice generated, plus individual (unmerged) POS sales from this period.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 group-hover:scale-125 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-300"><FileDigit size={80}/></div>
            <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FileDigit size={12}/> Invoiced Work of This Period</p>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">AED {(stats.invoicedBookingsAmount + stats.instantBilled).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            
            <div className="mt-auto relative z-10 w-full min-w-0 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-800/40 rounded-lg p-2 flex flex-col justify-center">
                  <p className="text-[9px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider mb-0.5 truncate pr-1">Clean ({stats.invoicedBookingsCount})</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{stats.invoicedBookingsAmount.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-800/40 rounded-lg p-2 flex flex-col justify-center">
                  <p className="text-[9px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider mb-0.5 truncate pr-1">POS ({stats.unmergedInstantCount})</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{stats.instantBilled.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Invoice Generated vs Pending */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-[#0c1427] dark:to-[#121933] p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-indigo-100 dark:border-slate-800 flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-indigo-100/60 dark:hover:shadow-purple-950/30 hover:-translate-y-1 hover:border-indigo-200 dark:hover:border-purple-800/50 transition-all duration-200"
            onClick={() => document.getElementById('detailed-work-history')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="absolute top-4 right-4 z-20">
              <button onClick={(e) => { e.stopPropagation(); setActiveInfoCard(3); }} className="text-indigo-300 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-purple-300 transition-colors opacity-0 group-hover:opacity-100"><Info size={14}/></button>
            </div>
            <AnimatePresence>
              {activeInfoCard === 3 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-indigo-50/95 dark:bg-[#0c1427]/95 backdrop-blur-sm z-30 rounded-[2rem] p-5 flex flex-col justify-center text-indigo-950 dark:text-white" onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }}>
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-indigo-600 dark:text-purple-400"><Info size={14}/> How is this calculated?</h4>
                  <p className="text-xs leading-relaxed text-indigo-800 dark:text-slate-300">Total amount billed to clients via invoices during this period, and the value of completed jobs that are still waiting to be billed.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 text-indigo-500 dark:text-purple-400 group-hover:scale-125 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-300"><Receipt size={80}/></div>
            
            {/* Top section: Generated */}
            <div className="mb-2 pb-2 border-b border-indigo-100/50 dark:border-slate-800">
               <p className="text-[9px] font-black text-indigo-600 dark:text-purple-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><Briefcase size={12}/> Invoice Generated</p>
               <h2 className="text-lg font-black text-indigo-950 dark:text-white leading-tight">AED {stats.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
               {stats.totalDiscount > 0 && (
                 <p className="mt-1 text-[10px] font-bold text-rose-500 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 px-2 py-1 rounded-md inline-block">
                   Discount: AED {stats.totalDiscount.toLocaleString()}
                 </p>
               )}
            </div>

            {/* Bottom section: Pending */}
            <div className="mt-auto">
               <p className="text-[9px] font-black text-indigo-400 dark:text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><Receipt size={12}/> Work Not Invoiced</p>
               <h2 className="text-lg font-black text-indigo-800 dark:text-purple-300 leading-tight">AED {stats.notInvoicedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            </div>
          </motion.div>

          {/* Card 4: Collected Amount (Cyan Theme) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}
            className="bg-white dark:bg-[#0c1427] p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-cyan-100 dark:border-cyan-900/40 flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-cyan-100/60 dark:hover:shadow-cyan-950/30 hover:-translate-y-1 hover:border-cyan-300 dark:hover:border-cyan-700/50 transition-all duration-200"
            onClick={() => document.getElementById('invoice-history')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="absolute top-4 right-4 z-20">
              <button onClick={(e) => { e.stopPropagation(); setActiveInfoCard(4); }} className="text-gray-300 dark:text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"><Info size={14}/></button>
            </div>
            <AnimatePresence>
              {activeInfoCard === 4 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-sm z-30 rounded-[2rem] p-5 flex flex-col justify-center text-cyan-950 dark:text-white" onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }}>
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-cyan-600 dark:text-cyan-400"><Info size={14}/> How is this calculated?</h4>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-slate-300">Actual cash received from clients during this period for any invoices, plus the outstanding amount clients still owe.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -right-4 -bottom-4 opacity-5 dark:opacity-10 text-cyan-500 group-hover:scale-125 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-300"><Wallet size={80}/></div>
            <p className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><ArrowDownToLine size={12}/> Collected Amount</p>
            <h2 className="text-2xl font-black text-cyan-600 dark:text-cyan-400">AED {stats.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            <div className="mt-3 pt-3 border-t border-cyan-50 dark:border-slate-800 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1"><ArrowUpRight size={10} className="text-amber-500"/> Outstanding Dues</span>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">AED {stats.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </motion.div>

          {/* Card 5: Total Expenses & Actual Revenue */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.24 }}
            className="bg-white dark:bg-[#0c1427] p-5 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col justify-center relative overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/30 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
            onClick={() => document.getElementById('expense-summary')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="absolute top-4 right-4 z-20">
              <button onClick={(e) => { e.stopPropagation(); setActiveInfoCard(5); }} className="text-gray-300 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"><Info size={14}/></button>
            </div>
            <AnimatePresence>
              {activeInfoCard === 5 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/95 dark:bg-[#0c1427]/95 backdrop-blur-sm z-30 rounded-[2rem] p-5 flex flex-col justify-center text-gray-900 dark:text-white" onClick={(e) => { e.stopPropagation(); setActiveInfoCard(null); }}>
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><Info size={14}/> How is this calculated?</h4>
                  <p className="text-xs leading-relaxed text-gray-600 dark:text-slate-300">Total money spent on expenses during this period, and your actual net revenue (Collected Amount minus Total Expenses).</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top section: Expenses */}
            <div className="mb-2 pb-2 border-b border-gray-100 dark:border-slate-800">
               <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><TrendingDown size={12}/> Total Expenses</p>
               <h2 className="text-lg font-black text-red-600 dark:text-red-400 leading-tight">AED {stats.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            </div>

            {/* Bottom section: Actual Revenue (Green Design) */}
            <div className="mt-auto bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-2.5 border border-emerald-100 dark:border-emerald-800/40">
               <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><TrendingUp size={12}/> Actual Revenue</p>
               <h2 className="text-xl font-black text-emerald-700 dark:text-emerald-300 leading-tight">AED {stats.actualRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
            </div>
          </motion.div>
        </div>

        {/* ── CHARTS SECTION (Area + Bar) ── */}
        <div id="charts-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Area Chart: Daily Trend */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0c1427] rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400"/> Daily Revenue Trend (Sales vs Collected)</h3>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.2} />
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
          <div className="lg:col-span-1 bg-white dark:bg-[#0c1427] rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 h-[400px] flex flex-col">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-blue-500 dark:text-blue-400"/> Source Performance</h3>
            <div className="flex flex-1 min-h-0 gap-3">
              {/* Stacked Bar Chart */}
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceBarData} margin={{ top: 10, right: 0, left: -28, bottom: 0 }} barCategoryGap="30%" barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} dy={8} interval={0} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} />
                    <RechartsTooltip content={<CustomBarTooltip />} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="Billed" stackId="a" fill="#94a3b8" radius={[0, 0, 4, 4]} maxBarSize={32} />
                    <Bar dataKey="MergedPOS" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Collected" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Text amounts — right side */}
              <div className="w-[100px] shrink-0 flex flex-col justify-center gap-4 py-2">
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Monthly</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0"/>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 dark:text-slate-400">Billed</p>
                      <p className="text-[10px] font-black text-gray-800 dark:text-slate-200">AED {stats.monthlyBilled.toLocaleString()}</p>
                    </div>
                  </div>
                  {stats.mergedInstantBilled > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"/>
                      <div>
                        <p className="text-[8px] font-bold text-indigo-400">+ Merged POS</p>
                        <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400">AED {stats.mergedInstantBilled.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"/>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 dark:text-slate-400">Collected</p>
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">AED {stats.monthlyCollected.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="w-full h-px bg-gray-100 dark:bg-slate-800"/>
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Instant POS</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0"/>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 dark:text-slate-400">Total Billed</p>
                      <p className="text-[10px] font-black text-gray-800 dark:text-slate-200 mb-0.5">AED {stats.totalInstantAll.toLocaleString()}</p>
                      <div className="text-[8px] space-y-0.5 border-l border-gray-200 dark:border-slate-700 pl-1.5 ml-0.5">
                        <p className="text-gray-500 dark:text-slate-400 font-medium">Indiv: <span className="font-bold text-gray-700 dark:text-slate-300">{stats.instantBilled.toLocaleString()}</span></p>
                        <p className="text-indigo-400 font-medium">Merged: <span className="font-bold text-indigo-500 dark:text-indigo-400">{stats.mergedInstantBilled.toLocaleString()}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"/>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 dark:text-slate-400">Collected</p>
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">AED {stats.instantCollected.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── COMPANY REVENUE ANALYTICS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Filled Pie Chart */}
          <div className="lg:col-span-1 bg-white dark:bg-[#0c1427] rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-[450px]">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2"><PieChartIcon size={16} className="text-indigo-600 dark:text-indigo-400"/> Sales by Company</h3>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-4">Top contributors to total sales</p>
            <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
              {companyAnalytics.length === 0 ? (
                <p className="text-sm font-bold text-gray-400 dark:text-slate-500">No data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={companyAnalytics}
                      cx="50%" cy="50%"
                      innerRadius={0}
                      outerRadius={activePieIndex !== null ? 88 : 90}
                      paddingAngle={1}
                      dataKey="billed"
                      stroke="none"
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(null)}
                    >
                      {companyAnalytics.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.65}
                          style={{
                            transform: activePieIndex === index ? 'scale(1.06)' : 'scale(1)',
                            transformOrigin: '50% 50%',
                            transition: 'transform 0.18s ease, opacity 0.15s ease',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} position={{ x: 0, y: 0 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Company List */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0c1427] rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 h-[450px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><Building2 size={16} className="text-blue-600 dark:text-blue-400"/> Company Performance</h3>
              <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-black">{companyAnalytics.length} Clients</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
              {companyAnalytics.length === 0 ? (
                 <div className="text-center py-20 text-gray-400 dark:text-slate-500 font-bold">No sales records found.</div>
              ) : (
                companyAnalytics.map((comp, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-[#090d1a] rounded-2xl border border-gray-100 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-500/50 hover:bg-white dark:hover:bg-[#0c1427] hover:shadow-md transition-all duration-150 group">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}>{i + 1}</div>
                        <h4 className="font-black text-gray-900 dark:text-white text-sm leading-tight flex items-center flex-wrap gap-2">
                          {comp.name}
                          {comp.id === 'walk_in' && <span className="text-[9px] bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest">Walk-in</span>}
                        </h4>
                      </div>
                      {/* Final Sales + discount summary */}
                      <div className="text-right">
                        <p className="text-base font-black text-blue-700 dark:text-blue-400">AED {comp.billed.toLocaleString()}</p>
                        {(comp.monthlyDiscount + comp.instantDiscount) > 0 && (
                          <p className="text-[9px] font-black text-rose-500 dark:text-rose-400 flex items-center justify-end gap-0.5 mt-0.5">
                            Discount: AED {(comp.monthlyDiscount + comp.instantDiscount).toLocaleString()}
                          </p>
                        )}
                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Collected: AED {comp.collected.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Breakdown grid */}
                    <div className="grid grid-cols-2 gap-2 mt-2 border-t border-gray-100 dark:border-slate-800 pt-3">
                      {/* Monthly column */}
                      {comp.monthlyBilled > 0 && (
                        <div className="bg-white dark:bg-[#070b14] rounded-xl border border-blue-100 dark:border-blue-900/40 p-2.5">
                          <p className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Building2 size={9}/> Monthly Invoice</p>
                          <p className="text-[11px] font-black text-gray-900 dark:text-slate-200">AED {comp.monthlyBilled.toLocaleString()}</p>
                          {comp.monthlyDiscount > 0 && <p className="text-[9px] font-bold text-rose-400 mt-0.5">Discount: AED {comp.monthlyDiscount.toLocaleString()}</p>}
                          <p className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 mt-0.5">Collected: AED {comp.monthlyCollected.toLocaleString()}</p>
                        </div>
                      )}

                      {/* POS column */}
                      {comp.instantBilled > 0 && (
                        <div className="bg-white dark:bg-[#070b14] rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-2.5">
                          <p className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Store size={9}/> Instant POS</p>
                          <p className="text-[11px] font-black text-gray-900 dark:text-slate-200">AED {comp.instantBilled.toLocaleString()}</p>
                          {comp.instantDiscount > 0 && <p className="text-[9px] font-bold text-rose-400 mt-0.5">Discount: AED {comp.instantDiscount.toLocaleString()}</p>}
                          {/* Merged vs Individual breakdown */}
                          <div className="mt-1.5 space-y-0.5">
                            {comp.mergedInstantBilled > 0 && (
                              <p className="text-[8px] font-bold text-teal-500 dark:text-teal-400 flex items-center gap-1">
                                <PackagePlus size={8}/> Merged w/ monthly: AED {comp.mergedInstantBilled.toLocaleString()}
                                {comp.mergedInstantIds.length > 0 && <span className="bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-1 rounded font-black">{comp.mergedInstantIds.length}</span>}
                              </p>
                            )}
                            {comp.individualInstantBilled > 0 && (
                              <p className="text-[8px] font-bold text-indigo-400 flex items-center gap-1">
                                <Store size={8}/> Individual: AED {comp.individualInstantBilled.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 mt-0.5">Collected: AED {comp.instantCollected.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── WORK HISTORY (ACCORDION) ── */}
          <div id="detailed-work-history" className="lg:col-span-7 bg-white dark:bg-[#0c1427] rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-[#090d1a] border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Briefcase size={20} className="text-indigo-600 dark:text-indigo-400"/> Detailed Work History</h3>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">Breakdown of Sales by Bookings</p>
              </div>
              <span className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-black px-3 py-1.5 rounded-lg text-gray-600 dark:text-slate-300">{filteredBookings.length} Tasks</span>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar bg-slate-50/30 dark:bg-[#070b14]/50">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-20 text-gray-400 dark:text-slate-500 font-bold">No completed work found for this period.</div>
              ) : (
                filteredBookings.map((b) => {
                  const validInventory = b.booking_inventory_logs?.filter((i: any) => i.extra_provided_qty > 0);

                  return (
                    <div key={b.id} className={`border rounded-2xl overflow-hidden transition-all ${expandedBookingId === b.id ? 'border-indigo-300 dark:border-indigo-500/60 shadow-md bg-white dark:bg-[#0c1427]' : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] hover:border-gray-300 dark:hover:border-slate-700'}`}>

                      {/* Accordion Header */}
                      <div onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group">
                        <div className="flex-1">

                          {/* 🚨 HIGHLIGHTED COMPANY NAME */}
                          <div className="inline-flex items-center gap-2 mb-2">
                             <span className="bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 px-3 py-1 rounded-lg text-sm font-black flex items-center gap-1.5 shadow-sm">
                               <Building2 size={16} className="text-blue-600 dark:text-blue-400"/> {b.units?.companies?.name || "Unknown Company"}
                             </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                             <p className="font-bold text-gray-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                               Unit {b.units?.unit_number} <span className="text-gray-300 dark:text-slate-600 font-normal">|</span> {b.units?.building_name}
                             </p>
                             {b.invoice_no ? (
                               <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 px-1.5 py-0.5 rounded uppercase font-black tracking-widest shadow-sm">Billed</span>
                             ) : (
                               <span className="text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded uppercase font-black tracking-widest shadow-sm">Not Invoiced</span>
                             )}
                          </div>
                          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-2">
                            <span className="uppercase text-gray-400 dark:text-slate-500">{b.booking_ref}</span> • {format(parseISO(b.cleaning_date), 'dd MMM yyyy')}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Total Value</p>
                            <p className="text-lg font-black text-indigo-700 dark:text-indigo-400">AED {b.grandTotal.toFixed(2)}</p>
                          </div>
                          <div className={`p-1.5 rounded-full transition-colors border ${expandedBookingId === b.id ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-500'}`}>
                            {expandedBookingId === b.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Body (Breakdown) */}
                      <AnimatePresence>
                        {expandedBookingId === b.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-indigo-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-[#090d1a]/50">
                            <div className="p-5 space-y-4 text-sm">

                              <div className="flex justify-between items-center text-gray-800 dark:text-slate-200 font-bold bg-white dark:bg-[#0c1427] p-3.5 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-sm">
                                <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500 dark:text-indigo-400"/> Base Service: {b.service_type}</span>
                                <span className="font-black text-gray-900 dark:text-white">AED {b.baseTotal.toFixed(2)}</span>
                              </div>

                              {validInventory && validInventory.length > 0 && (
                                <div className="pl-4 border-l-[3px] border-indigo-300 dark:border-indigo-600 space-y-2.5 mt-3">
                                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><PackagePlus size={12}/> Extra Inventory Provided</p>
                                  {validInventory.map((i: any, idx: number) => {
                                     const config = unitConfigs.find(c => c.unit_id === b.unit_id && c.equipment_id === i.equipment_id);
                                     const uPrice = i.supervisor_price !== null ? Number(i.supervisor_price) : Number(config?.extra_unit_price || 0);
                                     const itemTotal = i.extra_provided_qty * uPrice;
                                     if(itemTotal <= 0) return null; // 🚨 Hide 0 value items
                                     return (
                                       <div key={idx} className="flex justify-between items-center text-gray-800 dark:text-slate-200 font-medium text-xs bg-white dark:bg-[#0c1427] p-2.5 rounded-xl border border-indigo-50 dark:border-slate-800 shadow-sm">
                                         <span>{i.extra_provided_qty}x {i.equipment_master?.item_name}</span>
                                         <span className="font-black text-indigo-900 dark:text-indigo-300">AED {itemTotal.toFixed(2)}</span>
                                       </div>
                                     )
                                  })}
                                </div>
                              )}

                              {b.booking_extra_added_charges?.length > 0 && (
                                <div className="pl-4 border-l-[3px] border-red-300 dark:border-red-600 space-y-2.5 mt-3">
                                  <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><AlertCircle size={12}/> Additional Charges / Damage</p>
                                  {b.booking_extra_added_charges.map((c: any, idx: number) => (
                                     <div key={idx} className="flex justify-between items-center text-gray-800 dark:text-slate-200 font-medium text-xs bg-white dark:bg-[#0c1427] p-2.5 rounded-xl border border-red-50 dark:border-slate-800 shadow-sm">
                                       <span className="flex items-center gap-1.5">
                                          <span className="text-[8px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded uppercase font-black">{c.charge_type}</span>
                                          {c.item_description}
                                       </span>
                                       <span className="font-black text-red-800 dark:text-red-400">AED {Number(c.amount).toFixed(2)}</span>
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
          <div id="invoice-history" className="lg:col-span-5 bg-white dark:bg-[#0c1427] rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden h-[600px]">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Calendar size={20} className="text-blue-600 dark:text-blue-400"/> Invoice History</h3>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">Combined Monthly & POS History</p>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1 bg-slate-50/30 dark:bg-[#070b14]/50">
              {combinedLedger.length === 0 ? (
                <div className="text-center py-10 text-gray-400 dark:text-slate-500 font-bold">No ledger entries found.</div>
              ) : (
                combinedLedger.map((l: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-4 md:p-5 border border-gray-200 dark:border-slate-800 rounded-2xl hover:bg-white dark:hover:bg-[#0e172e] hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/50 transition-all bg-white dark:bg-[#0c1427] group">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl transition-colors mt-0.5 border ${l.origin === 'Monthly Contract' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/40 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/40 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40'}`}>
                        {l.origin === 'Monthly Contract' ? <Building2 size={18}/> : <Store size={18}/>}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{l.name || "Unknown Client"}</p>

                        <div className="flex flex-col items-start gap-1.5 mt-2">
                           <div className="flex items-center gap-1.5">
                             <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${l.origin === 'Monthly Contract' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'}`}>
                               {l.origin === 'Monthly Contract' ? 'Reg Bill' : 'Inst Bill'}
                             </span>
                             <p className="text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">{l.invoice_no}</p>
                           </div>

                           {/* 🚨 Invoice Date Range for Monthly Bills */}
                           {l.origin === 'Monthly Contract' && l.start_date && l.end_date && (
                              <span className="text-[9px] bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                Period: {format(parseISO(l.start_date), 'dd MMM')} - {format(parseISO(l.end_date), 'dd MMM yyyy')}
                              </span>
                           )}
                        </div>

                        {/* Highlighted merged instant bills with invoice_no */}
                        {l.mergedInstants?.length > 0 && (
                          <div className="mt-2.5 space-y-1">
                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 mb-1">
                              <PackagePlus size={9}/> Merged Instant POS Bills
                            </p>
                            {l.mergedInstants.map((inst: any) => (
                              <div key={inst.id} className="flex items-center justify-between gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 rounded-lg px-2 py-1">
                                <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 tracking-wide">{inst.invoice_no}</span>
                                <span className="text-[9px] font-black text-indigo-900 dark:text-indigo-200 shrink-0">AED {Number(inst.total_amount).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between h-full gap-3">
                      <div className="text-right">
                        {Number(l.discount || 0) > 0 && (
                          <p className="text-[9px] font-bold text-rose-400 flex items-center justify-end gap-1 mb-0.5">
                            <span className="line-through text-gray-400 dark:text-slate-500">AED {Number(l.subtotal || l.total_amount).toFixed(2)}</span>
                            <span className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 px-1 rounded font-black">-{Number(l.discount).toFixed(2)}</span>
                          </p>
                        )}
                        <p className="text-base font-black text-gray-900 dark:text-white">AED {Number(l.total_amount).toFixed(2)}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-1 inline-block border shadow-sm ${l.is_paid ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'}`}>
                          {l.is_paid ? 'Paid' : 'Due'}
                        </span>
                      </div>

                      {/* 🚨 View PDF Button */}
                      {l.pdf_url && (
                        <a href={l.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-900 dark:hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-gray-200 dark:border-slate-700 text-xs font-black shadow-sm" title="Open PDF">
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

        {/* ── EXPENSES BY CATEGORY CHART ── */}
        <div className="bg-white dark:bg-[#0c1427] rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden mt-8">
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><PieChartIcon size={20} className="text-red-500"/> Expenses by Category</h3>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">Spending breakdown across categories</p>
          </div>
          <div className="w-full p-4 md:p-6 bg-slate-50/30 dark:bg-[#070b14]/50 overflow-x-auto custom-scrollbar">
            <div className="h-[350px] min-w-[600px]">
              {expenseCategoryData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-500 font-bold">No expenses found.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseCategoryData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" strokeOpacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={15} angle={-30} textAnchor="end" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                    <RechartsTooltip content={<CustomExpenseTooltip />} cursor={{fill: '#334155', fillOpacity: 0.1}} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── EXPENSES SUMMARY ── */}
        <div id="expense-summary" className="bg-white dark:bg-[#0c1427] rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden mt-8 mb-8">
          <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-[#090d1a] border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><TrendingDown size={20} className="text-red-600"/> Expense Summary</h3>
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">Expenses recorded in this period</p>
            </div>
            <span className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-black px-3 py-1.5 rounded-lg text-gray-600 dark:text-slate-300 shadow-sm">Total: AED {stats.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="p-4 md:p-6 bg-slate-50/30 dark:bg-[#070b14]/50">
            {expenses.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-slate-500 font-bold">No expenses recorded for this period.</div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => {
                  const isExpanded = expandedExpenseId === expense.id;
                  const hasDescription = Boolean(expense.description?.trim());
                  const description = hasDescription ? expense.description : "No description provided.";
                  const needsExpansion = hasDescription && description.length > 150;
                  const categoryName = expense.category_name || "Uncategorized";
                  const tagColor = categoryColorMap[categoryName] || '#ef4444';

                  return (
                    <motion.div 
                      key={expense.id} 
                      layout
                      className={`bg-white dark:bg-[#0c1427] border border-gray-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 transition-all group ${needsExpansion ? 'hover:border-blue-200 dark:hover:border-slate-700 hover:shadow-md cursor-pointer' : ''}`}
                      onClick={() => {
                        if (needsExpansion) setExpandedExpenseId(isExpanded ? null : expense.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          <span 
                            className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-white shadow-sm"
                            style={{ backgroundColor: tagColor }}
                          >
                            {categoryName}
                          </span>
                          <span className="text-xs font-bold text-gray-400 dark:text-slate-400">{format(parseISO(expense.expense_date), 'dd MMM yyyy')}</span>
                        </div>
                        
                        <div className="text-right shrink-0 flex items-center justify-end gap-1.5">
                          <span className="text-xs font-black text-blue-900 dark:text-blue-400">AED</span>
                          <span className="text-lg font-black text-red-600 dark:text-red-400">{Number(expense.amount).toFixed(2)}</span>
                          
                          {needsExpansion && (
                            <div className={`ml-2 p-1 rounded-full transition-colors ${isExpanded ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-500' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 group-hover:text-blue-400'}`}>
                              {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className={`text-sm font-medium w-full ${hasDescription ? 'text-gray-700 dark:text-slate-300' : 'text-gray-400 dark:text-slate-500 italic'}`}>
                        {!hasDescription ? (
                          <span>{description}</span>
                        ) : isExpanded || !needsExpansion ? (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{description}</motion.span>
                        ) : (
                          <span>
                            {description.substring(0, 150)}... 
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px] ml-1 uppercase tracking-widest hover:underline bg-blue-50 dark:bg-blue-950/40 px-1 py-0.5 rounded">Read more</span>
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
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