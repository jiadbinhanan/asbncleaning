"use client";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Edit2, CheckCircle2, Lock, FileText, Image as ImageIcon, 
  CalendarDays, Settings, Tag, CreditCard, Layers, X, Loader2, PlayCircle, Clock, Info, ChevronDown, ChevronUp, History, TrendingUp
} from "lucide-react";
import { getFixedSchedulesAction, addFixedScheduleAction, editFixedScheduleAction, deleteFixedScheduleAction, addExpenseAction } from "./actions";
import { format, parseISO, addMonths, addDays, differenceInDays } from "date-fns";

export default function FixedExpensesTab({ 
  currentMonthDateStr, 
  paymentMethods, 
  refreshGlobalStats,
  currentMonthExpenses // we will fetch our own fixed expenses directly to be safe
}: { 
  currentMonthDateStr: string; 
  paymentMethods: string[];
  refreshGlobalStats: () => void;
  currentMonthExpenses: any[];
}) {
  const supabase = createClient();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  // Forms
  const [newSchedule, setNewSchedule] = useState({ 
    category_name: '', 
    default_amount: '', 
    frequency_type: 'months', 
    frequency_interval: 1, 
    schedule_date: 1, 
    base_start_date: format(new Date(), 'yyyy-MM-dd'),
    default_description: '',
    default_payment_method: ''
  });
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  
  // Pay form
  const [payFormData, setPayFormData] = useState({
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: ""
  });
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [schedulesRes, expensesRes] = await Promise.all([
      getFixedSchedulesAction(),
      supabase.schema('expenses').from('expenses').select('*').eq('expense_type', 'Fixed').order('expense_date', { ascending: false })
    ]);
    
    if (schedulesRes.success && schedulesRes.data) {
      setSchedules(schedulesRes.data);
    }
    if (expensesRes.data) {
      setFixedExpenses(expensesRes.data);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 1024 * 1024) {
        alert("Maximum file size allowed is 1 MB.");
        e.target.value = "";
        setFileDataUrl(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileDataUrl(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setFileDataUrl(null);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.category_name || !newSchedule.default_amount) return;
    
    setSubmitting(true);
    const res = await addFixedScheduleAction(
      newSchedule.category_name,
      Number(newSchedule.default_amount),
      newSchedule.frequency_type,
      Number(newSchedule.frequency_interval),
      Number(newSchedule.schedule_date),
      newSchedule.base_start_date,
      newSchedule.default_description,
      newSchedule.default_payment_method,
      true
    );
    if (res.success) {
      fetchData();
      setNewSchedule({ 
        category_name: '', default_amount: '', frequency_type: 'months', frequency_interval: 1, schedule_date: 1, 
        base_start_date: format(new Date(), 'yyyy-MM-dd'), default_description: '', default_payment_method: ''
      });
      setShowSettings(false);
    } else {
      alert("Error adding schedule: " + res.message);
    }
    setSubmitting(false);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    const res = await deleteFixedScheduleAction(id);
    if (res.success) {
      fetchData();
    } else {
      alert("Error deleting: " + res.message);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !payFormData.amount || !payFormData.payment_method) return;
    
    setSubmitting(true);
    const res = await addExpenseAction(
      Number(payFormData.amount),
      payFormData.description,
      payFormData.expense_date,
      selectedSchedule.category_name,
      'Fixed',
      payFormData.payment_method,
      fileDataUrl
    );

    if (res.success) {
      refreshGlobalStats(); 
      fetchData(); // Refresh fixed ledger and checklist
      setIsPayModalOpen(false);
      setFileDataUrl(null);
    } else {
      alert("Error logging expense: " + res.message);
    }
    setSubmitting(false);
  };

  // Logic to calculate next due date
  const calculateNextDueDate = (schedule: any, lastPaidExpense: any) => {
    let baseDate = lastPaidExpense ? parseISO(lastPaidExpense.expense_date) : parseISO(schedule.base_start_date);
    
    if (schedule.frequency_type === 'days') {
      return addDays(baseDate, schedule.frequency_interval);
    } else {
      // Monthly rotation
      let nextMonth = addMonths(baseDate, schedule.frequency_interval);
      // Force the schedule date
      const year = nextMonth.getFullYear();
      const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
      const day = String(schedule.schedule_date).padStart(2, '0');
      
      // Handle edge cases where day > days in month (e.g. Feb 30 -> Feb 28)
      const lastDayOfMonth = new Date(year, nextMonth.getMonth() + 1, 0).getDate();
      const safeDay = Math.min(Number(day), lastDayOfMonth);
      
      return parseISO(`${year}-${month}-${String(safeDay).padStart(2, '0')}`);
    }
  };

  // Derive Checklist Data
  const checklist = useMemo(() => {
    return schedules.map(schedule => {
      // Find the most recent expense for this category
      const relatedExpenses = fixedExpenses.filter(e => e.category_name === schedule.category_name);
      const lastPaid = relatedExpenses.length > 0 ? relatedExpenses[0] : null; // Already sorted DESC

      const nextDueDate = calculateNextDueDate(schedule, lastPaid);
      const today = new Date();
      
      // If next due date is in the future (> 15 days), we consider it "Paid" for the current cycle visually,
      // Or we can just show everything and sort by urgency.
      // Let's define "isDue" if nextDueDate <= today + 7 days
      const daysUntilDue = differenceInDays(nextDueDate, today);
      const isDue = daysUntilDue <= 15; // Show as due if within 15 days
      const isOverdue = daysUntilDue < 0;

      return {
        ...schedule,
        lastPaid,
        nextDueDate,
        daysUntilDue,
        isDue,
        isOverdue
      };
    }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [schedules, fixedExpenses]);

  const stats = useMemo(() => {
    const totalSchedules = checklist.length;
    const dueCount = checklist.filter(c => c.isDue).length;
    const totalSpentThisMonth = fixedExpenses.filter(e => e.expense_date.startsWith(currentMonthDateStr)).reduce((sum, e) => sum + Number(e.amount), 0);
    const targetMonthlySpend = checklist.reduce((sum, c) => {
      if (c.frequency_type === 'months') {
        return sum + (Number(c.default_amount) / c.frequency_interval);
      } else {
        return sum + (Number(c.default_amount) / (c.frequency_interval / 30));
      }
    }, 0);

    return { totalSchedules, dueCount, totalSpentThisMonth, targetMonthlySpend };
  }, [checklist, fixedExpenses, currentMonthDateStr]);

  return (
    <div className="space-y-6">
      
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CalendarDays size={14} className="text-blue-500"/> Active Schedules</p>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stats.totalSchedules}</h3>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Clock size={14} className="text-orange-500"/> Pending / Due Soon</p>
          <h3 className="text-2xl font-black text-orange-600 tracking-tight">{stats.dueCount}</h3>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between md:col-span-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp size={14} className="text-green-500"/> Est. Monthly Target vs Spent (This Month)</p>
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">AED {stats.totalSpentThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
            <span className="text-xs font-bold text-gray-500">Target: AED {stats.targetMonthlySpend.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${stats.totalSpentThisMonth > stats.targetMonthlySpend ? 'bg-red-500' : 'bg-green-500'}`} 
              style={{ width: `${Math.min((stats.totalSpentThisMonth / (stats.targetMonthlySpend || 1)) * 100, 100)}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── Toolbar & Info ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3 relative">
          <h2 className="text-lg font-black text-gray-900">Fixed Planner</h2>
          <button 
            onMouseEnter={() => setShowInfo(true)} 
            onMouseLeave={() => setShowInfo(false)}
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors cursor-help"
          >
            <Info size={14}/> Add New Duty / Guide
          </button>
          
          <AnimatePresence>
            {showInfo && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 w-80 bg-gray-900 text-white p-4 rounded-xl shadow-2xl z-50 text-xs font-medium space-y-2"
              >
                <p className="font-bold text-blue-300">How Rotation Works:</p>
                <p><span className="text-white font-bold">Days Mode:</span> Rotates exactly X days after the last payment. Best for generic intervals (e.g., 45 days, 65 days).</p>
                <p><span className="text-white font-bold">Months Mode:</span> Rotates every X months on a strictly specified day (1-31). This prevents calendar drift caused by 28/30/31-day months. Best for rent, salaries.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${showSettings ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
        >
          <Settings size={16} /> {showSettings ? 'Close Setup' : 'Setup Schedules'}
        </button>
      </div>

      {/* ── Inline Expandable Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 space-y-6">
              
              {/* Add Form */}
              <form onSubmit={handleAddSchedule} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><Plus size={16} className="text-blue-600"/> Create New Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Category Name</label>
                    <input type="text" value={newSchedule.category_name} onChange={e => setNewSchedule({...newSchedule, category_name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Default Amount (AED)</label>
                    <input type="number" value={newSchedule.default_amount} onChange={e => setNewSchedule({...newSchedule, default_amount: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Rotation Type</label>
                    <select value={newSchedule.frequency_type} onChange={e => setNewSchedule({...newSchedule, frequency_type: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500">
                      <option value="months">Calendar Months</option>
                      <option value="days">Exact Days</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Interval ({newSchedule.frequency_type})</label>
                      <input type="number" min="1" value={newSchedule.frequency_interval} onChange={e => setNewSchedule({...newSchedule, frequency_interval: Number(e.target.value)})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" required />
                    </div>
                    {newSchedule.frequency_type === 'months' && (
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Strict Day</label>
                        <input type="number" min="1" max="31" value={newSchedule.schedule_date} onChange={e => setNewSchedule({...newSchedule, schedule_date: Number(e.target.value)})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" title="Day of the month (1-31)" required />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Base Start Date</label>
                    <input type="date" value={newSchedule.base_start_date} onChange={e => setNewSchedule({...newSchedule, base_start_date: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" required />
                  </div>
                  <div className="xl:col-span-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Default Pre-fill Description</label>
                    <input type="text" value={newSchedule.default_description} onChange={e => setNewSchedule({...newSchedule, default_description: e.target.value})} placeholder="Optional default notes..." className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Default Pay Method</label>
                    <select value={newSchedule.default_payment_method} onChange={e => setNewSchedule({...newSchedule, default_payment_method: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-blue-500">
                      <option value="">(None)</option>
                      {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-colors shadow-md flex items-center gap-2">
                    {submitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Save Schedule
                  </button>
                </div>
              </form>

              {/* Schedules Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Logic</th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Defaults</th>
                      <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedules.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-black text-gray-900 text-sm">{item.category_name}</div>
                          <div className="text-xs font-bold text-green-600">AED {item.default_amount}</div>
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-600">
                          {item.frequency_type === 'months' 
                            ? `Every ${item.frequency_interval} month(s) on day ${item.schedule_date}` 
                            : `Every ${item.frequency_interval} days`}
                          <div className="text-[10px] text-gray-400 mt-1">Since {item.base_start_date}</div>
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-600 max-w-[200px] truncate" title={item.default_description}>
                          {item.default_payment_method && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded mr-2">{item.default_payment_method}</span>}
                          {item.default_description || '-'}
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteSchedule(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Checklist View (Responsive Grid) ── */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-blue-600"/> Upcoming & Due</h3>
        
        {loading ? (
          <div className="p-12 flex justify-center text-blue-500"><Loader2 className="animate-spin" size={32} /></div>
        ) : checklist.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-bold bg-white rounded-2xl border border-gray-100 shadow-sm">No fixed schedules found. Setup schedules to see them here.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {checklist.map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  key={item.id} 
                  className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between gap-4 transition-colors relative overflow-hidden bg-white hover:shadow-md ${item.isOverdue ? 'border-red-200' : item.isDue ? 'border-orange-200' : 'border-slate-100'}`}
                >
                  {item.isOverdue && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}
                  {!item.isOverdue && item.isDue && <div className="absolute top-0 left-0 w-full h-1 bg-orange-400" />}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${item.isOverdue ? 'bg-red-500' : item.isDue ? 'bg-orange-400' : 'bg-slate-300'}`}>
                      <CalendarDays size={20}/>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-900 leading-tight">{item.category_name}</h3>
                      <div className="text-sm font-bold text-gray-600 mt-0.5">AED {Number(item.default_amount).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-1">
                      <span>Next Due:</span>
                      <span className={item.isOverdue ? 'text-red-600' : item.isDue ? 'text-orange-600' : 'text-gray-900'}>
                        {format(item.nextDueDate, 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 flex justify-between">
                      <span>Last Paid: {item.lastPaid ? format(parseISO(item.lastPaid.expense_date), 'dd MMM yyyy') : 'Never'}</span>
                      <span className="uppercase tracking-widest">{item.frequency_type === 'months' ? `${item.frequency_interval}M/D${item.schedule_date}` : `${item.frequency_interval}D`}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedSchedule(item);
                      // Pre-fill defaults
                      setPayFormData({
                        amount: item.default_amount.toString(),
                        description: item.default_description || "",
                        payment_method: item.default_payment_method || "",
                        expense_date: new Date().toISOString().split('T')[0]
                      });
                      setIsPayModalOpen(true);
                    }}
                    className={`w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors ${item.isDue || item.isOverdue ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <PlayCircle size={16}/> Pay & Record
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Fixed Expenses Ledger ── */}
      <div className="mt-12">
        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2"><History size={16} className="text-blue-600"/> Fixed Expenses Ledger</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {fixedExpenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-bold text-sm">No historical fixed payments found.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                  <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Category / Details</th>
                  <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fixedExpenses.map((expense: any) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-xs font-bold text-gray-600 whitespace-nowrap">
                      {format(parseISO(expense.expense_date), 'dd MMM yyyy')}
                    </td>
                    <td className="p-4">
                      <div className="font-black text-gray-900 text-sm">{expense.category_name}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span className="font-bold text-gray-700">{expense.payment_method}</span>
                        {expense.description && <span className="truncate max-w-[200px] text-gray-400" title={expense.description}>• {expense.description}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-sm font-black text-red-600">AED {Number(expense.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                      {expense.receipt_url && (
                        <button onClick={() => setLightboxUrl(`/api/pdf/${expense.id}?dl=0`)} className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 mt-1">
                          <ImageIcon size={12}/> Receipt
                          </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pay / Check Modal */}
      <AnimatePresence>
        {isPayModalOpen && selectedSchedule && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <div>
                  <h2 className="text-xl font-black text-gray-900">{selectedSchedule.category_name}</h2>
                  <p className="text-xs font-bold text-gray-500 mt-1">Record fixed payment</p>
                </div>
                <button onClick={() => setIsPayModalOpen(false)} className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-sm"><X size={20} /></button>
              </div>
              <form onSubmit={handlePaySubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Date Paid</label>
                    <input type="date" value={payFormData.expense_date} onChange={e => setPayFormData({...payFormData, expense_date: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white" required />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Payment Method</label>
                    <select value={payFormData.payment_method} onChange={e => setPayFormData({...payFormData, payment_method: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white" required>
                      <option value="">Select Method...</option>
                      {paymentMethods?.map((m: string, i: number) => <option key={i} value={m}>{m}</option>)}
                      {!paymentMethods?.includes(payFormData.payment_method) && payFormData.payment_method && <option value={payFormData.payment_method}>{payFormData.payment_method}</option>}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Final Amount (AED)</label>
                  <input type="number" step="0.01" value={payFormData.amount} onChange={e => setPayFormData({...payFormData, amount: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-red-600 outline-none focus:border-blue-500 focus:bg-white text-lg" required />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5">Description / Notes</label>
                  <textarea value={payFormData.description} onChange={e => setPayFormData({...payFormData, description: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white min-h-[80px]" />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                    <span>Receipt (Optional)</span>
                  </label>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 cursor-pointer shadow-sm" />
                </div>
                
                <div className="pt-2">
                  <button type="submit" disabled={submitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 mt-2">
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Complete Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
