"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Edit2, Download, Search, X, FileText, Image as ImageIcon, 
  CheckCircle2, Lock, Filter, TrendingUp, TrendingDown, CalendarDays, History, Settings, 
  Tag, CreditCard, Layers, ChevronDown, ChevronUp, RotateCcw, DollarSign, PieChart,
  Receipt, ArrowUpRight, ArrowDownRight, SlidersHorizontal, Eye, RotateCw
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addExpenseAction, editExpenseAction, deleteExpenseAction, getExpenseSettingsAction, updateExpenseSettingsAction } from "./actions";
import { 
  format, parseISO, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, 
  formatDistanceToNow, differenceInCalendarDays, subDays
} from "date-fns";
import FixedExpensesTab from "./FixedExpensesTab";
import { TableSkeleton } from "@/components/common/Skeleton";
import DotsLoader from "@/components/common/DotsLoader";
import Kbd from "@/components/common/Kbd";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function ExpensesPage() {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [prevMonthTotal, setPrevMonthTotal] = useState<number>(0);
  const [settings, setSettings] = useState<any>({ categories: [], payment_methods: [] });
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'transactions' | 'planner'>('transactions');

  // Filter States
  const [filterType, setFilterType] = useState<'month' | 'custom' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Search & Advanced Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [minAmountFilter, setMinAmountFilter] = useState("");
  const [maxAmountFilter, setMaxAmountFilter] = useState("");
  const [receiptFilter, setReceiptFilter] = useState(""); // '', 'with', 'without'

  // Expandable row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Custom Category State (No emoji)
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  // Settings State
  const [settingsTab, setSettingsTab] = useState<'categories' | 'payment_methods'>('categories');
  const [newCategory, setNewCategory] = useState({ name: '', type: 'Flexible', default_amount: '' });
  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // Selected Expense for Edit/Delete
  const [selectedExpense, setSelectedExpense] = useState<any>(null);

  // Form States
  const [formData, setFormData] = useState({ 
    amount: "", 
    description: "", 
    expense_date: new Date().toISOString().split('T')[0],
    category_name: "",
    expense_type: "",
    payment_method: ""
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Security Verification
  const [actionPassword, setActionPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // ── 1. Dynamic Date Range Fetching (Default: Current Month) ──
  const fetchExpensesAndStats = async () => {
    setLoading(true);
    try {
      let startDateStr: string | null = null;
      let endDateStr: string | null = null;
      let prevStartStr: string | null = null;
      let prevEndStr: string | null = null;

      if (filterType === 'month') {
        const monthDate = parseISO(`${selectedMonth}-01`);
        startDateStr = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        endDateStr = format(endOfMonth(monthDate), 'yyyy-MM-dd');

        const prevMonthDate = subMonths(monthDate, 1);
        prevStartStr = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd');
        prevEndStr = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd');
      } else if (filterType === 'custom') {
        if (customStart && customEnd) {
          startDateStr = customStart;
          endDateStr = customEnd;

          const daysDiff = differenceInCalendarDays(parseISO(customEnd), parseISO(customStart)) + 1;
          const prevEnd = subDays(parseISO(customStart), 1);
          const prevStart = subDays(prevEnd, daysDiff - 1);
          prevStartStr = format(prevStart, 'yyyy-MM-dd');
          prevEndStr = format(prevEnd, 'yyyy-MM-dd');
        }
      }

      // Build primary query
      let query = supabase.schema('expenses').from("expenses").select("*").order("expense_date", { ascending: false });
      if (startDateStr && endDateStr) {
        query = query.gte("expense_date", startDateStr).lte("expense_date", endDateStr);
      }

      // Build previous period query for comparison stats
      let prevQuery = null;
      if (prevStartStr && prevEndStr) {
        prevQuery = supabase.schema('expenses').from("expenses").select("amount").gte("expense_date", prevStartStr).lte("expense_date", prevEndStr);
      }

      const [expensesRes, prevRes, settingsRes] = await Promise.all([
        query,
        prevQuery,
        getExpenseSettingsAction()
      ]);

      if (expensesRes.data) {
        setExpenses(expensesRes.data);
      }

      if (prevRes?.data) {
        const sum = prevRes.data.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
        setPrevMonthTotal(sum);
      } else {
        setPrevMonthTotal(0);
      }

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
    } catch (err) {
      console.error("Error fetching expense data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesAndStats();
  }, [filterType, selectedMonth, customStart, customEnd]);

  // ── 2. File Upload with 1MB Limit ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.size > 1024 * 1024) {
        alert("Maximum file size allowed is 1 MB.");
        e.target.value = "";
        setFile(null);
        setFileDataUrl(null);
        return;
      }
      setFile(f);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileDataUrl(reader.result as string);
      };
      reader.readAsDataURL(f);
    } else {
      setFile(null);
      setFileDataUrl(null);
    }
  };

  const verifyPassword = async (password: string) => {
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      setVerifying(false);
      return data.success;
    } catch (e) {
      setVerifying(false);
      return false;
    }
  };

  // ── 3. Category & Form Handlers ──
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__OTHER__") {
      setIsCustomCategory(true);
      setFormData(prev => ({
        ...prev,
        category_name: customCategoryName,
        expense_type: prev.expense_type || 'Flexible',
      }));
      return;
    }
    
    setIsCustomCategory(false);
    const cat = settings.categories?.find((c: any) => c.name === val);
    if (cat) {
      setFormData(prev => ({
        ...prev,
        category_name: cat.name,
        expense_type: cat.type,
        amount: cat.type === 'Fixed' && Number(cat.default_amount) > 0 ? cat.default_amount.toString() : prev.amount
      }));
    } else {
      setFormData(prev => ({ ...prev, category_name: val, expense_type: 'Flexible' }));
    }
  };

  const handleCustomCategoryInput = (name: string) => {
    setCustomCategoryName(name);
    setFormData(prev => ({ ...prev, category_name: name }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategoryName.trim() : formData.category_name;
    
    if (!formData.amount || !formData.expense_date || !finalCategory || !formData.payment_method) {
      return alert("Please fill all required fields (Date, Category, Amount, Payment Method)");
    }
    setSubmitting(true);
    
    const res = await addExpenseAction(
      Number(formData.amount), 
      formData.description, 
      formData.expense_date, 
      finalCategory,
      formData.expense_type || 'Flexible',
      formData.payment_method,
      fileDataUrl
    );

    if (res.success) {
      fetchExpensesAndStats();
      closeModals();
    } else {
      alert("Error adding expense: " + res.message);
    }
    setSubmitting(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    const finalCategory = isCustomCategory ? customCategoryName.trim() : formData.category_name;
    
    if (!formData.amount || !formData.expense_date || !finalCategory || !formData.payment_method) {
      return alert("Please fill all required fields");
    }

    setSubmitting(true);

    const isVerified = await verifyPassword(actionPassword);
    if (!isVerified) {
      alert("Incorrect action password");
      setSubmitting(false);
      return;
    }

    const res = await editExpenseAction(
      selectedExpense.id, 
      Number(formData.amount), 
      formData.description, 
      formData.expense_date, 
      finalCategory,
      formData.expense_type || 'Flexible',
      formData.payment_method,
      fileDataUrl
    );

    if (res.success) {
      fetchExpensesAndStats();
      closeModals();
    } else {
      alert("Error editing expense: " + res.message);
    }
    setSubmitting(false);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setSubmitting(true);

    const isVerified = await verifyPassword(actionPassword);
    if (!isVerified) {
      alert("Incorrect action password");
      setSubmitting(false);
      return;
    }

    const res = await deleteExpenseAction(selectedExpense.id);
    if (res.success) {
      fetchExpensesAndStats();
      closeModals();
    } else {
      alert("Error deleting expense: " + res.message);
    }
    setSubmitting(false);
  };

  // ── 4. Settings Management (Fixed button placement) ──
  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;
    const updated = [
      ...(settings.categories || []), 
      { 
        id: Date.now().toString(), 
        name: newCategory.name.trim(), 
        type: newCategory.type, 
        default_amount: newCategory.default_amount ? Number(newCategory.default_amount) : 0 
      }
    ];
    setSettings({ ...settings, categories: updated });
    setNewCategory({ name: '', type: 'Flexible', default_amount: '' });
  };

  const handleSaveSettings = async () => {
    setSubmitting(true);
    const res = await updateExpenseSettingsAction(settings.categories, settings.payment_methods);
    if (res.success) {
      setSettings(res.data);
      alert("Settings saved successfully!");
    } else {
      alert("Error saving settings: " + res.message);
    }
    setSubmitting(false);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setSelectedExpense(null);
    setFormData({ amount: "", description: "", expense_date: new Date().toISOString().split('T')[0], category_name: "", expense_type: "", payment_method: "" });
    setFile(null);
    setFileDataUrl(null);
    setActionPassword("");
  };

  // ── 5. Filtering & Supercharged Search ──
  const activeCategoriesList = useMemo(() => {
    const set = new Set<string>();
    settings.categories?.forEach((c: any) => set.add(c.name));
    expenses.forEach((e: any) => { if (e.category_name) set.add(e.category_name); });
    return Array.from(set);
  }, [settings.categories, expenses]);

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter) count++;
    if (typeFilter) count++;
    if (paymentMethodFilter) count++;
    if (minAmountFilter) count++;
    if (maxAmountFilter) count++;
    if (receiptFilter) count++;
    return count;
  }, [categoryFilter, typeFilter, paymentMethodFilter, minAmountFilter, maxAmountFilter, receiptFilter]);

  const resetAdvancedFilters = () => {
    setCategoryFilter("");
    setTypeFilter("");
    setPaymentMethodFilter("");
    setMinAmountFilter("");
    setMaxAmountFilter("");
    setReceiptFilter("");
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Supercharged Search across all fields
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const descMatch = e.description?.toLowerCase().includes(term);
        const catMatch = e.category_name?.toLowerCase().includes(term);
        const methodMatch = e.payment_method?.toLowerCase().includes(term);
        const amountMatch = e.amount?.toString().includes(term);
        const dateMatch = e.expense_date?.includes(term);
        if (!descMatch && !catMatch && !methodMatch && !amountMatch && !dateMatch) {
          return false;
        }
      }

      // Advanced Filters
      if (categoryFilter && e.category_name !== categoryFilter) return false;
      if (typeFilter && e.expense_type !== typeFilter) return false;
      if (paymentMethodFilter && e.payment_method !== paymentMethodFilter) return false;
      if (minAmountFilter && Number(e.amount) < Number(minAmountFilter)) return false;
      if (maxAmountFilter && Number(e.amount) > Number(maxAmountFilter)) return false;
      if (receiptFilter === 'with' && !e.receipt_url) return false;
      if (receiptFilter === 'without' && e.receipt_url) return false;

      return true;
    });
  }, [expenses, searchTerm, categoryFilter, typeFilter, paymentMethodFilter, minAmountFilter, maxAmountFilter, receiptFilter]);

  // ── 6. KPI Summary Stats ──
  const stats = useMemo(() => {
    const totalSpend = filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const count = filteredExpenses.length;
    const avgSpend = count > 0 ? totalSpend / count : 0;

    const fixedSpend = filteredExpenses
      .filter(e => e.expense_type === 'Fixed')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const flexibleSpend = totalSpend - fixedSpend;
    const fixedPercentage = totalSpend > 0 ? Math.round((fixedSpend / totalSpend) * 100) : 0;

    // Top Category
    const categoryTotals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category_name || "Uncategorized";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(e.amount) || 0);
    });

    let topCatName = "None";
    let topCatAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatName = cat;
      }
    });

    // Trend percentage vs previous month
    let percentChange = 0;
    if (prevMonthTotal > 0) {
      percentChange = ((totalSpend - prevMonthTotal) / prevMonthTotal) * 100;
    }

    return {
      totalSpend,
      count,
      avgSpend,
      fixedSpend,
      flexibleSpend,
      fixedPercentage,
      topCatName,
      topCatAmount,
      percentChange
    };
  }, [filteredExpenses, prevMonthTotal]);

  // ── 7. Grouping by Week ──
  const groupedArray = useMemo(() => {
    const groups = filteredExpenses.reduce((acc: any, expense) => {
      const eDate = parseISO(expense.expense_date);
      const weekStart = startOfWeek(eDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(eDate, { weekStartsOn: 1 });
      const weekKey = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
      
      if (!acc[weekKey]) acc[weekKey] = [];
      acc[weekKey].push(expense);
      return acc;
    }, {});

    return Object.entries(groups).map(([week, items]: any) => ({
      week,
      items: items.sort((a: any, b: any) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()),
      total: items.reduce((sum: number, item: any) => sum + Number(item.amount), 0)
    })).sort((a, b) => new Date(b.items[0].expense_date).getTime() - new Date(a.items[0].expense_date).getTime());
  }, [filteredExpenses]);

  // ── 8. Excel & Top-Notch Decorative PDF Export ──
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredExpenses.map((e, idx) => ({
      "#": idx + 1,
      Date: e.expense_date,
      Category: e.category_name,
      Type: e.expense_type,
      "Description / Notes": e.description || "-",
      "Payment Method": e.payment_method,
      "Amount (AED)": Number(e.amount),
      Receipt: e.receipt_url ? `${window.location.origin}/api/pdf/${e.id}?dl=1` : "No Receipt"
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `Expenses_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── Decorative Header Banner ──
    doc.setFillColor(10, 25, 47); // Dark Navy #0A192F
    doc.rect(0, 0, pageWidth, 42, "F");

    // Accent line
    doc.setFillColor(37, 99, 235); // Royal Blue #2563EB
    doc.rect(0, 42, pageWidth, 2, "F");

    // Company Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("BTM CLEANING & TECHNICAL SERVICES CO.", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(191, 219, 254);
    doc.text("OFFICIAL EXPENSE & DISBURSEMENT AUDIT REPORT", 14, 23);

    // Header Right Metadata
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    const dateRangeLabel = filterType === 'month' 
      ? format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')
      : filterType === 'custom' && customStart && customEnd
        ? `${customStart} to ${customEnd}`
        : 'All Recorded Data';
    doc.text(`Period: ${dateRangeLabel}`, pageWidth - 14, 16, { align: "right" });
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth - 14, 23, { align: "right" });
    doc.text(`Currency: AED (United Arab Emirates Dirham)`, pageWidth - 14, 30, { align: "right" });

    // ── Summary KPI Box ──
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 49, pageWidth - 28, 20, 3, 3, "FD");

    // KPI 1: Total Spend
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL DISBURSEMENT", 20, 56);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`AED ${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 20, 64);

    // KPI 2: Total Records
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TRANSACTIONS", 75, 56);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.count} Entries`, 75, 64);

    // KPI 3: Fixed vs Flexible
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("FIXED / FLEXIBLE", 125, 56);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`AED ${stats.fixedSpend.toLocaleString()} / AED ${stats.flexibleSpend.toLocaleString()}`, 125, 64);

    // KPI 4: Top Category
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOP CATEGORY", 175, 56);
    doc.setFontSize(9.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`${stats.topCatName.slice(0, 15)}`, 175, 64);

    // ── Table Data ──
    const tableColumns = ["#", "Date", "Category", "Type", "Notes / Description", "Method", "Amount (AED)"];
    const tableRows = filteredExpenses.map((e, index) => [
      index + 1,
      format(parseISO(e.expense_date), 'dd/MM/yyyy'),
      e.category_name || "-",
      e.expense_type || "-",
      e.description || "-",
      e.payment_method || "-",
      Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })
    ]);

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 74,
      margin: { left: 14, right: 14 },
      theme: "grid",
      headStyles: {
        fillColor: [10, 25, 47],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "left",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 20 },
        2: { cellWidth: 32, fontStyle: "bold" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: "auto" },
        5: { cellWidth: 25 },
        6: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [220, 38, 38] },
      },
      foot: [
        [
          "",
          "",
          "",
          "",
          "GRAND TOTAL",
          "",
          `AED ${stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ]
      ],
      footStyles: {
        fillColor: [238, 242, 246],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 9,
        halign: "right",
      },
      didDrawPage: (data) => {
        // Footer on every page
        const pageCount = (doc.internal as any).getNumberOfPages();
        const currentPage = (data as any).pageNumber;
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Confidential — For Internal Financial Audit Use Only", 14, pageHeight - 7);
        doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: "right" });
      }
    });

    doc.save(`Expenses_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const searchRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts([
    {
      combo: 'Alt+N',
      description: 'Add new expense',
      category: 'Actions',
      handler: () => setIsAddModalOpen(true),
    },
    {
      combo: 'Alt+E',
      description: 'Export Excel report',
      category: 'Actions',
      handler: exportExcel,
    },
    {
      combo: 'Alt+P',
      description: 'Export PDF report',
      category: 'Actions',
      handler: exportPDF,
    },
    {
      combo: 'Alt+S',
      description: 'Expense settings',
      category: 'Actions',
      handler: () => setIsSettingsModalOpen(true),
    },
    {
      combo: 'Alt+F',
      description: 'Toggle advanced filters',
      category: 'Filters',
      handler: () => setShowAdvancedFilters((prev) => !prev),
    },
    {
      combo: 'Alt+R',
      description: 'Refresh expenses list',
      category: 'Actions',
      handler: fetchExpensesAndStats,
    },
    {
      combo: '1',
      description: 'Switch to Flexible Expenses tab',
      category: 'Navigation',
      handler: () => setActiveTab('transactions'),
    },
    {
      combo: '2',
      description: 'Switch to Fixed Expenses tab',
      category: 'Navigation',
      handler: () => setActiveTab('planner'),
    },
    {
      combo: '/',
      description: 'Focus expense search',
      category: 'Navigation',
      handler: () => searchRef.current?.focus(),
    },
    {
      combo: 'Escape',
      description: 'Close modals',
      category: 'Modals',
      handler: closeModals,
    },
  ]);

  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-[#070b14] pb-24 font-sans relative transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      
      {/* ── MOBILE APP-OPTIMIZED HEADER (md:hidden) ── */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#0c0814]/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-amber-500/20 shadow-sm transition-colors mb-3">
        {/* Top slim bar */}
        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-gray-900 dark:text-white leading-tight truncate">
                Expense Management
              </h1>
              <p className="text-[10px] font-bold text-gray-500 dark:text-amber-300/80 capitalize">
                {filterType === 'month' ? `Month: ${selectedMonth}` : filterType === 'custom' ? 'Custom Date' : 'All Expenses'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Quick Add Expense Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg font-black text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              <Plus size={14} /> Add
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchExpensesAndStats}
              disabled={loading}
              className="p-1.5 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Refresh Expenses"
              aria-label="Refresh Expenses"
            >
              {loading ? <DotsLoader size="xs" variant="primary" /> : <RotateCw size={15} />}
            </button>
          </div>
        </div>

        {/* Filter Controls (Month / Custom / All) */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterType === 'month'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}
          >
            By Month
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterType === 'custom'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}
          >
            Custom Date
          </button>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              filterType === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
            }`}
          >
            All Data
          </button>
        </div>

        {/* Sub-pickers for month or custom */}
        <AnimatePresence>
          {filterType === 'month' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 pb-2.5 flex items-center gap-2 overflow-hidden"
            >
              <span className="text-xs font-bold text-gray-500 dark:text-slate-400">Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-bold text-gray-900 dark:text-white px-2 py-1 flex-1 outline-none"
              />
            </motion.div>
          )}
          {filterType === 'custom' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 pb-2.5 flex items-center gap-1.5 overflow-hidden"
            >
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-bold text-gray-900 dark:text-white px-2 py-1 flex-1 outline-none"
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-bold text-gray-900 dark:text-white px-2 py-1 flex-1 outline-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── DESKTOP HEADER (100% UNTOUCHED & PERFECT) ── */}
      <div className="hidden md:block">
        <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-8 pb-20 px-6 md:px-12 shadow-2xl relative z-10 overflow-hidden dark:border-b dark:border-amber-500/20 dark:shadow-[0_12px_40px_rgba(245,158,11,0.15)]">
          {/* Light mode gradient */}
          <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:hidden' />

          {/* Dark mode multi-color amber sunset gradient */}
          <div className='absolute inset-0 hidden dark:block' style={{ background: 'linear-gradient(135deg, #0d0605 0%, #1c0c08 20%, #2b110a 40%, #240c14 65%, #12050e 85%, #080206 100%)' }} />

          {/* Dark mode glowing amber orbs */}
          <div className='absolute -top-12 -left-12 w-96 h-96 hidden dark:block bg-amber-500/22 rounded-full blur-[100px] pointer-events-none' />
          <div className='absolute bottom-0 right-10 w-96 h-96 hidden dark:block bg-rose-600/20 rounded-full blur-[90px] pointer-events-none' />
          <div className='absolute top-1/4 right-1/3 w-72 h-72 hidden dark:block bg-orange-500/15 rounded-full blur-[80px] pointer-events-none' />

          {/* Dark mode SVG Molten Amber Waves */}
          <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block'>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="exp-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.32" />
                  <stop offset="35%" stopColor="#F97316" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="#F43F5E" stopOpacity="0.20" />
                  <stop offset="100%" stopColor="#9F1239" stopOpacity="0.08" />
                </linearGradient>
                <linearGradient id="exp-grad-wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FB7185" stopOpacity="0.28" />
                  <stop offset="40%" stopColor="#FBBF24" stopOpacity="0.22" />
                  <stop offset="75%" stopColor="#BE123C" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="exp-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FDE047" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.95" />
                  <stop offset="85%" stopColor="#FB7185" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="exp-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#F97316" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FDE047" stopOpacity="0.8" />
                </linearGradient>
                <filter id="exp-glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path d="M0,110 C320,40 560,180 860,90 C1160,10 1320,150 1440,80 L1440,320 L0,320 Z" fill="url(#exp-grad-wave1)" />
              <path d="M0,110 C320,40 560,180 860,90 C1160,10 1320,150 1440,80" stroke="url(#exp-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#exp-glow-amber)" />
              <path d="M0,160 C260,200 480,90 780,150 C1080,210 1280,100 1440,140 L1440,320 L0,320 Z" fill="url(#exp-grad-wave2)" />
              <path d="M0,160 C260,200 480,90 780,150 C1080,210 1280,100 1440,140" stroke="url(#exp-crest-2)" strokeWidth="2" strokeLinecap="round" />
              <path d="M0,220 C360,260 680,170 1020,230 C1240,270 1380,200 1440,210" stroke="url(#exp-crest-1)" strokeWidth="1.2" strokeDasharray="6 6" strokeOpacity="0.4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Light mode decorative orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden"/>

          <div className="w-full relative z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                <TrendingUp className="text-blue-500 dark:text-amber-400" size={36}/> Expense Management
              </h1>
              <p className="text-blue-200 dark:text-amber-200/80 font-medium mt-2">Track company expenses, receipts, and historical data.</p>
            </div>

            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
                <Filter size={16} className="text-blue-400 ml-2 shrink-0 hidden md:block"/>
                <button 
                  onClick={() => setFilterType('month')} 
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'month' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
                >
                  By Month
                </button>
                <button 
                  onClick={() => setFilterType('custom')} 
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'custom' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
                >
                  Custom Date
                </button>
                <button 
                  onClick={() => setFilterType('all')} 
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all ${filterType === 'all' ? 'bg-slate-700 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
                >
                  All Data
                </button>
              </div>

              {/* Sub-filters based on selection */}
              <AnimatePresence mode="wait">
                {filterType === 'month' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md w-full md:w-auto border border-white/10">
                    <span className="text-xs font-bold text-blue-300 pl-2">Select:</span>
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-black text-white outline-none px-2 py-1 w-full dark-color-scheme" />
                  </motion.div>
                )}
                {filterType === 'custom' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md w-full md:w-auto border border-white/10">
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-xs font-black text-white outline-none px-2 py-1 dark-color-scheme" />
                    <span className="text-white/50">-</span>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-xs font-black text-white outline-none px-2 py-1 dark-color-scheme" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="w-full px-4 md:px-8 xl:px-12 -mt-12 relative z-20 space-y-6">
        
        {/* Tab Switcher */}
        <div className="flex bg-white/80 dark:bg-[#0c1427]/90 backdrop-blur-md p-1.5 rounded-2xl w-fit shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 mx-auto -mt-6 relative z-30 transition-colors">
          <button 
            onClick={() => setActiveTab('transactions')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'transactions' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'}`}
          >
            Flexible Expenses <Kbd variant="glass" size="xs">1</Kbd>
          </button>
          <button 
            onClick={() => setActiveTab('planner')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'planner' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'}`}
          >
            Fixed Expenses <Kbd variant="glass" size="xs">2</Kbd>
          </button>
        </div>

        <div className={activeTab === 'planner' ? 'block' : 'hidden'}>
          <FixedExpensesTab 
            currentMonthDateStr={selectedMonth}
            paymentMethods={settings.payment_methods || []}
            refreshGlobalStats={fetchExpensesAndStats}
            currentMonthExpenses={expenses}
            categories={settings.categories || []}
          />
        </div>

        <div className={activeTab === 'transactions' ? 'block space-y-6' : 'hidden'}>
            
            {/* Actions & Search Bar */}
            <div className="bg-white dark:bg-[#0c1427] p-4 rounded-[1.5rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col gap-4 transition-colors">

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Search Input & Advanced Filter Toggle */}
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
                <input 
                  ref={searchRef}
                  type="text" 
                  placeholder="Search by description, category, amount... [/]" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 shadow-inner"
                />
                {!searchTerm ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Kbd variant="glass" size="xs">/</Kbd>
                  </div>
                ) : (
                  <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                    <X size={16}/>
                  </button>
                )}
              </div>

              {/* Advanced Filter Toggle Button */}
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all shrink-0 ${
                  showAdvancedFilters || activeAdvancedFilterCount > 0 
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 shadow-sm' 
                    : 'bg-white dark:bg-[#0c1427] border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <SlidersHorizontal size={16} />
                <span className="hidden sm:inline">Advanced Filters</span>
                <Kbd variant="glass" size="xs">Alt+F</Kbd>
                {activeAdvancedFilterCount > 0 && (
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs font-black flex items-center justify-center">
                    {activeAdvancedFilterCount}
                  </span>
                )}
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto justify-end">
              <button
                onClick={fetchExpensesAndStats}
                title="Refresh Expenses (Alt+R)"
                aria-label="Refresh Expenses"
                className="p-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shadow-sm"
              >
                <RotateCw size={16} />
              </button>
              <button onClick={exportExcel} className="flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors font-bold text-sm shadow-sm">
                <FileText size={16} /> Excel <Kbd variant="glass" size="xs">Alt+E</Kbd>
              </button>
              <button onClick={exportPDF} className="flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors font-bold text-sm shadow-sm">
                <FileText size={16} /> PDF <Kbd variant="glass" size="xs">Alt+P</Kbd>
              </button>
              <button onClick={() => setIsSettingsModalOpen(true)} className="flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-bold text-sm shadow-sm">
                <Settings size={16} /> <span className="hidden sm:inline">Settings</span> <Kbd variant="glass" size="xs">Alt+S</Kbd>
              </button>
              <button onClick={() => setIsAddModalOpen(true)} className="flex shrink-0 items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all text-sm whitespace-nowrap">
                <Plus size={18} /> Add Expense <Kbd variant="dark" size="xs" className="bg-blue-800 text-blue-200 border-blue-700">Alt+N</Kbd>
              </button>
            </div>
          </div>

          {/* Advanced Filter Drawer */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }} 
                className="pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"
              >
                {/* Category Filter */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Category</label>
                  <select 
                    value={categoryFilter} 
                    onChange={e => setCategoryFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {activeCategoriesList.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Expense Type</label>
                  <select 
                    value={typeFilter} 
                    onChange={e => setTypeFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="Fixed">Fixed Expense</option>
                    <option value="Flexible">Flexible Expense</option>
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
                  <select 
                    value={paymentMethodFilter} 
                    onChange={e => setPaymentMethodFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="">All Methods</option>
                    {settings.payment_methods?.map((m: string, i: number) => (
                      <option key={i} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Min Amount (AED)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={minAmountFilter} 
                    onChange={e => setMinAmountFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Max Amount (AED)</label>
                  <input 
                    type="number" 
                    placeholder="Any" 
                    value={maxAmountFilter} 
                    onChange={e => setMaxAmountFilter(e.target.value)} 
                    className="w-full p-2 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Receipt Filter & Reset */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Receipt</label>
                    <select 
                      value={receiptFilter} 
                      onChange={e => setReceiptFilter(e.target.value)} 
                      className="w-full p-2 bg-gray-50 dark:bg-[#070b14] border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-800 dark:text-slate-200 outline-none focus:border-blue-500"
                    >
                      <option value="">All</option>
                      <option value="with">With Receipt</option>
                      <option value="without">No Receipt</option>
                    </select>
                  </div>
                  {activeAdvancedFilterCount > 0 && (
                    <button 
                      onClick={resetAdvancedFilters} 
                      className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                      title="Reset filters"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── MOBILE KPI CARDS (md:hidden) ── */}
        <div className="md:hidden grid grid-cols-2 gap-2.5">
          {/* Card 1: Total Spent */}
          <div className="bg-white dark:bg-[#0c1427] p-3.5 rounded-2xl shadow-sm border border-red-200/80 dark:border-rose-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Spent</span>
              <div className="p-1 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <DollarSign size={13} />
              </div>
            </div>
            <p className="text-base font-black text-red-600 dark:text-rose-400 leading-tight">
              AED {stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
            <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 mt-1 truncate">
              {stats.count} entries
            </p>
          </div>

          {/* Card 2: Prev Period */}
          <div className="bg-white dark:bg-[#0c1427] p-3.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Prior Period</span>
              <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <CalendarDays size={13} />
              </div>
            </div>
            <p className="text-base font-black text-gray-900 dark:text-white leading-tight">
              AED {prevMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
            <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 mt-1 truncate">
              {stats.percentChange !== 0 ? `${stats.percentChange <= 0 ? '↓' : '↑'} ${Math.abs(stats.percentChange).toFixed(1)}% vs prior` : 'Benchmark'}
            </p>
          </div>

          {/* Card 3: Avg Spend */}
          <div className="bg-white dark:bg-[#0c1427] p-3.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Average</span>
              <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Layers size={13} />
              </div>
            </div>
            <p className="text-base font-black text-blue-600 dark:text-blue-400 leading-tight">
              AED {stats.avgSpend.toFixed(0)}
            </p>
            <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 mt-1 truncate">
              Per transaction
            </p>
          </div>

          {/* Card 4: Top Category */}
          <div className="bg-white dark:bg-[#0c1427] p-3.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Top Category</span>
              <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <PieChart size={13} />
              </div>
            </div>
            <p className="text-sm font-black text-gray-900 dark:text-white leading-tight truncate" title={stats.topCatName}>
              {stats.topCatName}
            </p>
            <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 mt-1 truncate">
              AED {stats.topCatAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── 3. DESKTOP ANIMATED SUMMARY & KPI CARDS SECTION (hidden md:grid, 100% UNTOUCHED) ── */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Selected Period Spend */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white dark:bg-[#0c1427] p-5 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Spent</p>
                <h3 className="text-2xl font-black text-red-600 dark:text-rose-400 mt-1">
                  AED {stats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-rose-950/40 text-red-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
                <DollarSign size={24} />
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              {prevMonthTotal > 0 ? (
                <span className={`inline-flex items-center text-xs font-black px-2 py-0.5 rounded-full ${stats.percentChange <= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'}`}>
                  {stats.percentChange <= 0 ? <ArrowDownRight size={14} className="mr-0.5"/> : <ArrowUpRight size={14} className="mr-0.5"/>}
                  {Math.abs(stats.percentChange).toFixed(1)}% vs prior period
                </span>
              ) : (
                <span className="text-xs font-bold text-gray-400 dark:text-slate-500">Current selection</span>
              )}
            </div>
          </motion.div>

          {/* Card 2: Previous Month Spend */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white dark:bg-[#0c1427] p-5 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">Previous Period</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  AED {prevMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <CalendarDays size={24} />
              </div>
            </div>
            
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 mt-3 flex items-center gap-1">
              Historical reference benchmark
            </p>
          </motion.div>

          {/* Card 3: Transactions & Avg */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-white dark:bg-[#0c1427] p-5 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">Transactions</p>
                <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {stats.count} <span className="text-sm font-bold text-gray-500 dark:text-slate-400">Entries</span>
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                <Layers size={24} />
              </div>
            </div>
            
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-3">
              Avg. <span className="font-black text-gray-900 dark:text-white">AED {stats.avgSpend.toFixed(2)}</span> / entry
            </p>
          </motion.div>

          {/* Card 4: Top Category & Ratio */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white dark:bg-[#0c1427] p-5 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="max-w-[70%]">
                <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider">Top Category</p>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1 truncate" title={stats.topCatName}>
                  {stats.topCatName}
                </h3>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400">AED {stats.topCatAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner shrink-0">
                <PieChart size={24} />
              </div>
            </div>
            
            <div className="mt-2.5">
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div style={{ width: `${stats.fixedPercentage}%` }} className="bg-indigo-600 h-full" title={`Fixed: ${stats.fixedPercentage}%`} />
                <div style={{ width: `${100 - stats.fixedPercentage}%` }} className="bg-orange-500 h-full" title={`Flexible: ${100 - stats.fixedPercentage}%`} />
              </div>
              <div className="flex justify-between text-[10px] font-black text-gray-400 dark:text-slate-500 mt-1">
                <span>Fixed {stats.fixedPercentage}%</span>
                <span>Flexible {100 - stats.fixedPercentage}%</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── 4. EXPENSES LIST GROUPED BY WEEK (Expandable Rows with Ellipsis) ── */}
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : groupedArray.length === 0 ? (
          <div className="bg-white dark:bg-[#0c1427] rounded-3xl p-12 text-center shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-slate-500"><Search size={32}/></div>
            <h3 className="text-xl font-black text-gray-800 dark:text-white">No expenses found</h3>
            <p className="text-gray-500 dark:text-slate-400 font-medium mt-2">Adjust your search or filter parameters to view records.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedArray.map((group) => (
              <motion.div 
                key={group.week}
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-[#0c1427] rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors"
              >
                {/* Group Header */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-[#090d1a] border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
                  <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays size={16} className="text-indigo-500 dark:text-indigo-400"/> Week: {group.week}
                  </h3>
                  <div className="text-sm font-black text-gray-900 dark:text-white bg-white dark:bg-[#0c1427] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                    Week Total: <span className="text-red-600 dark:text-rose-400 font-black">AED {group.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Group Items */}
                <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
                  {group.items.map((expense: any) => {
                    const isExpanded = expandedId === expense.id;

                    return (
                      <div 
                        key={expense.id} 
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                      >
                        {/* Main Row Header (Click to toggle expand) */}
                        <div 
                          onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                          className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer select-none"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                              {/* Date */}
                              <span className="text-xs font-black bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700">
                                {format(parseISO(expense.expense_date), 'dd MMM yyyy')}
                              </span>
                              
                              {/* Type Badge */}
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${expense.expense_type === 'Fixed' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50' : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50'}`}>
                                {expense.expense_type || 'Flexible'}
                              </span>

                              {/* Payment Method */}
                              <span className="text-xs font-bold text-gray-600 dark:text-slate-300 flex items-center gap-1 bg-gray-50 dark:bg-slate-800/60 px-2.5 py-0.5 rounded-md border border-gray-200 dark:border-slate-700">
                                <CreditCard size={12}/> {expense.payment_method || 'Cash'}
                              </span>

                              {/* Receipt Indicator */}
                              {expense.receipt_url && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 flex items-center gap-1">
                                  <Receipt size={11}/> Receipt
                                </span>
                              )}
                            </div>

                            {/* Category & Truncated Description */}
                            <div className="flex items-center gap-3">
                              <h4 className="text-base font-black text-gray-900 dark:text-white shrink-0">{expense.category_name}</h4>
                              {expense.description && (
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 truncate max-w-md hidden sm:block">
                                  — {expense.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right Side: Amount & Expand Chevron */}
                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <span className="text-xl font-black text-red-600 dark:text-rose-400">
                              AED {Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            
                            <button 
                              type="button" 
                              className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Accordion Body */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }} 
                              animate={{ opacity: 1, height: 'auto' }} 
                              exit={{ opacity: 0, height: 0 }} 
                              className="px-6 pb-6 pt-2 bg-slate-50/50 dark:bg-[#070b14]/50 border-t border-slate-100 dark:border-slate-800"
                            >
                              <div className="bg-white dark:bg-[#090d1a] p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
                                
                                {/* Full Description */}
                                <div>
                                  <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Full Description / Notes</p>
                                  <p className="text-sm font-medium text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
                                    {expense.description || "No specific notes provided for this transaction."}
                                  </p>
                                </div>

                                {/* Metadata & Action Buttons */}
                                <div className="flex flex-wrap justify-between items-center gap-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                                  <div className="text-xs font-bold text-gray-400 dark:text-slate-500 flex flex-wrap items-center gap-3">
                                    <span>Created on {format(parseISO(expense.expense_date), 'dd MMMM yyyy')}</span>
                                    {expense.updated_at && (
                                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <History size={13}/> Last edited {formatDistanceToNow(new Date(expense.updated_at))} ago
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {expense.receipt_url && (
                                      <button onClick={() => setLightboxUrl(`/api/pdf/${expense.id}?dl=0`)} 
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-black transition-colors border border-blue-200 dark:border-blue-800/50"
                                      >
                                        <Eye size={14}/> View Receipt
                                      </button>
                                    )}
                                    
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        setSelectedExpense(expense); 
                                        const isExisting = settings.categories?.some((c: any) => c.name === expense.category_name);
                                        if (!isExisting && expense.category_name) {
                                          setIsCustomCategory(true);
                                          setCustomCategoryName(expense.category_name);
                                        } else {
                                          setIsCustomCategory(false);
                                          setCustomCategoryName("");
                                        }
                                        setFormData({ 
                                          amount: expense.amount, 
                                          description: expense.description || "", 
                                          expense_date: expense.expense_date,
                                          category_name: expense.category_name,
                                          expense_type: expense.expense_type,
                                          payment_method: expense.payment_method
                                        }); 
                                        setIsEditModalOpen(true); 
                                      }} 
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-black transition-colors"
                                    >
                                      <Edit2 size={14}/> Edit
                                    </button>
                                    
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        setSelectedExpense(expense); 
                                        setIsDeleteModalOpen(true); 
                                      }} 
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-rose-950/40 hover:bg-red-100 dark:hover:bg-rose-900/50 text-red-700 dark:text-rose-300 rounded-xl text-xs font-black transition-colors border border-red-200 dark:border-rose-800/50"
                                    >
                                      <Trash2 size={14}/> Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ── 9. MODALS ── */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
        
        {/* Settings Modal (Fixed Button Overflow) */}
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-[#090d1a] shrink-0">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Settings size={24} className="text-blue-500"/> Expense Settings</h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm"><X size={20} /></button>
              </div>
              
              <div className="flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0c1427] px-6 pt-4 gap-6 shrink-0">
                <button onClick={() => setSettingsTab('categories')} className={`pb-3 text-sm font-black tracking-wide border-b-2 transition-all ${settingsTab === 'categories' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}><Layers size={16} className="inline mr-1"/> Categories</button>
                <button onClick={() => setSettingsTab('payment_methods')} className={`pb-3 text-sm font-black tracking-wide border-b-2 transition-all ${settingsTab === 'payment_methods' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}><CreditCard size={16} className="inline mr-1"/> Payment Methods</button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50 dark:bg-[#070b14]/50">
                {settingsTab === 'categories' ? (
                  <div className="space-y-6">
                    {/* Add Category Card with Top-Right Button */}
                    <div className="bg-white dark:bg-[#0c1427] p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">Add New Category</h3>
                        <button 
                          onClick={handleAddCategory} 
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                        >
                          <Plus size={15} /> Add Category
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-9">
                          <input 
                            type="text" 
                            placeholder="Category Name" 
                            value={newCategory.name} 
                            onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
                            className="w-full p-3 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <span className="w-full flex items-center h-full px-3 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 rounded-xl text-sm font-bold shadow-sm justify-center">
                            Flexible
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Existing Categories Table */}
                    <div className="bg-white dark:bg-[#0c1427] rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-[#090d1a] border-b border-gray-100 dark:border-slate-800">
                          <tr>
                            <th className="p-4 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Name</th>
                            <th className="p-4 text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
                          {settings.categories?.filter((cat: any) => cat.type !== 'Fixed').map((cat: any) => (
                            <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="p-4 font-black text-gray-900 dark:text-white text-sm">{cat.name}</td>
                              <td className="p-4 text-right">
                                <button onClick={() => setSettings({ ...settings, categories: settings.categories.filter((c: any) => c.id !== cat.id) })} className="text-red-500 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0c1427] p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800">
                      <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">Add Payment Method</h3>
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          placeholder="Method Name (e.g. PayPal, Card)" 
                          value={newPaymentMethod} 
                          onChange={e => setNewPaymentMethod(e.target.value)} 
                          className="flex-1 p-3 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm"
                        />
                        <button onClick={() => {
                          if (!newPaymentMethod.trim()) return;
                          setSettings({ ...settings, payment_methods: [...(settings.payment_methods||[]), newPaymentMethod.trim()] });
                          setNewPaymentMethod('');
                        }} className="px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-colors shrink-0 shadow-md shadow-blue-500/20">Add</button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#0c1427] rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                      <ul className="divide-y divide-gray-100 dark:divide-slate-800/80">
                        {settings.payment_methods?.map((method: string, i: number) => (
                          <li key={i} className="p-4 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <span className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-2"><CreditCard size={16} className="text-gray-500 dark:text-slate-400"/> {method}</span>
                            <button onClick={() => setSettings({ ...settings, payment_methods: settings.payment_methods.filter((m: string) => m !== method) })} className="text-red-500 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0c1427] shrink-0">
                <button onClick={handleSaveSettings} disabled={submitting} className="w-full py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-black flex justify-center items-center gap-2 hover:bg-black dark:hover:bg-blue-700 transition-all shadow-lg disabled:opacity-70">
                  {submitting ? <DotsLoader size="sm" variant="white" label="Saving Settings..." /> : <><CheckCircle2 size={20} /> Save Settings</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Expense Modal (Clean "Other" Category without emoji) */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-[#090d1a] shrink-0">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Add New Expense</h2>
                <button onClick={closeModals} className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Date</label>
                    <input 
                      type="date" 
                      value={formData.expense_date} 
                      onChange={e => setFormData({...formData, expense_date: e.target.value})} 
                      className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Payment Method</label>
                    <select 
                      value={formData.payment_method} 
                      onChange={e => setFormData({...formData, payment_method: e.target.value})} 
                      className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm" 
                      required
                    >
                      <option value="">Select Method...</option>
                      {settings.payment_methods?.map((m: string, i: number) => <option key={i} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Category</label>
                  <select 
                    value={isCustomCategory ? "__OTHER__" : formData.category_name} 
                    onChange={handleCategoryChange} 
                    className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm" 
                    required
                  >
                    <option value="">Select Category...</option>
                    <optgroup label="Custom Option">
                      <option value="__OTHER__">+ Other (Custom Category)</option>
                    </optgroup>
                    <optgroup label="Flexible Expenses">
                      {settings.categories?.filter((c: any) => c.type === 'Flexible').map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                  </select>
                </div>

                {isCustomCategory && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-3">
                    <div>
                      <label className="block text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Tag size={14} className="text-blue-600 dark:text-blue-400"/> Enter Custom Category Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Office Equipment, Staff Training" 
                        value={customCategoryName} 
                        onChange={e => handleCustomCategoryInput(e.target.value)} 
                        className="w-full p-3 bg-white dark:bg-[#070b14] border border-blue-300 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40 shadow-sm" 
                        required 
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Expense Type</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, expense_type: 'Flexible' }))} 
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.expense_type !== 'Fixed' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-blue-200 dark:border-slate-700'}`}
                        >
                          Flexible Expense
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, expense_type: 'Fixed' }))} 
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.expense_type === 'Fixed' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-blue-200 dark:border-slate-700'}`}
                        >
                          Fixed Expense
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Amount (AED)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-black text-red-600 dark:text-rose-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm text-lg" 
                    placeholder="0.00" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Additional Notes (Optional)</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 min-h-[80px] shadow-sm" 
                    placeholder="Specific details or supplier invoice notes..." 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                    <span>Receipt (Optional)</span>
                    <span className="text-[9px] text-orange-500 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800/50 font-bold">Max size: 1 MB</span>
                  </label>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full p-3 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 dark:file:bg-blue-950/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer shadow-sm" />
                </div>
                
                <div className="pt-2">
                  <button type="submit" disabled={submitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 mt-2">
                    {submitting ? <DotsLoader size="sm" variant="white" label="Saving Expense..." /> : <><CheckCircle2 size={20} /> Save Expense</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Expense Modal (Clean "Other" Category without emoji) */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-[#090d1a] shrink-0">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Edit Expense</h2>
                <button onClick={closeModals} className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm"><X size={20} /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                {selectedExpense?.updated_at && (
                  <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 p-3 rounded-xl flex items-center gap-2 text-xs font-bold border border-blue-100 dark:border-blue-800/50 mb-2">
                    <History size={16}/> Last edited on {format(new Date(selectedExpense.updated_at), 'dd MMM yyyy, hh:mm a')}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Date</label>
                    <input 
                      type="date" 
                      value={formData.expense_date} 
                      onChange={e => setFormData({...formData, expense_date: e.target.value})} 
                      className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Payment Method</label>
                    <select 
                      value={formData.payment_method} 
                      onChange={e => setFormData({...formData, payment_method: e.target.value})} 
                      className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm" 
                      required
                    >
                      <option value="">Select Method...</option>
                      {settings.payment_methods?.map((m: string, i: number) => <option key={i} value={m}>{m}</option>)}
                      {!settings.payment_methods?.includes(formData.payment_method) && formData.payment_method && (
                        <option value={formData.payment_method}>{formData.payment_method} (Saved)</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Category</label>
                  <select 
                    value={isCustomCategory ? "__OTHER__" : formData.category_name} 
                    onChange={handleCategoryChange} 
                    className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm" 
                    required
                  >
                    <option value="">Select Category...</option>
                    <optgroup label="Custom Option">
                      <option value="__OTHER__">+ Other (Custom Category)</option>
                    </optgroup>
                    <optgroup label="Flexible Expenses">
                      {settings.categories?.filter((c: any) => c.type === 'Flexible').map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </optgroup>
                  </select>
                </div>

                {isCustomCategory && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-3">
                    <div>
                      <label className="block text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                        <Tag size={14} className="text-blue-600 dark:text-blue-400"/> Enter Custom Category Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Office Equipment, Staff Training" 
                        value={customCategoryName} 
                        onChange={e => handleCustomCategoryInput(e.target.value)} 
                        className="w-full p-3 bg-white dark:bg-[#070b14] border border-blue-300 dark:border-slate-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40" 
                        required 
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Expense Type</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, expense_type: 'Flexible' }))} 
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.expense_type !== 'Fixed' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-blue-200 dark:border-slate-700'}`}
                        >
                          Flexible Expense
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setFormData(prev => ({ ...prev, expense_type: 'Fixed' }))} 
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${formData.expense_type === 'Fixed' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-blue-200 dark:border-slate-700'}`}
                        >
                          Fixed Expense
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Amount (AED)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-black text-red-600 dark:text-rose-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 shadow-sm text-lg" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">Additional Notes (Optional)</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 min-h-[80px] shadow-sm" 
                  />
                </div>
                
                <div className="bg-slate-50 dark:bg-[#070b14] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mt-2">
                  <label className="block text-xs font-black text-gray-700 dark:text-slate-300 uppercase tracking-widest mb-3 flex justify-between items-center">
                    <span>Receipt File</span>
                    <span className="text-[9px] text-orange-500 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-100 dark:border-orange-800/50 font-bold">Max size: 1 MB</span>
                  </label>
                  {selectedExpense?.receipt_url && !fileDataUrl && (
                    <div className="flex justify-between items-center bg-white dark:bg-[#0c1427] p-3 rounded-xl border border-gray-200 dark:border-slate-800 mb-3 shadow-sm">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><ImageIcon size={14}/> Existing Receipt attached</span>
                      <button onClick={(e) => { e.preventDefault(); setLightboxUrl(`/api/pdf/${selectedExpense.id}?dl=0`); }} className="text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1 rounded">View</button>
                    </div>
                  )}
                  <p className="text-[10px] font-bold text-gray-600 dark:text-slate-400 mb-1">{selectedExpense?.receipt_url ? "Upload a new file to replace the existing one:" : "Upload a file:"}</p>
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="w-full p-2.5 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:font-black file:bg-blue-50 dark:file:bg-blue-950/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer shadow-sm" />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-slate-800 mt-4">
                  <label className="block text-xs font-black text-red-600 dark:text-rose-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Lock size={14}/> Action Password Required</label>
                  <input 
                    type="password" 
                    value={actionPassword} 
                    onChange={e => setActionPassword(e.target.value)} 
                    className="w-full p-3.5 bg-white dark:bg-[#070b14] border border-red-300 dark:border-red-800/60 rounded-xl font-black text-gray-900 dark:text-white placeholder:text-red-300 dark:placeholder:text-red-900/40 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40 shadow-sm" 
                    placeholder="Enter action password" 
                    required 
                  />
                </div>
                
                <button type="submit" disabled={submitting || verifying} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 mt-4">
                  {(submitting || verifying) ? <DotsLoader size="sm" variant="white" label="Saving Changes..." /> : <><CheckCircle2 size={20} /> Save Changes</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedExpense && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-[#0c1427] border border-gray-100 dark:border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden relative z-10 text-center">
              <div className="p-8">
                <div className="w-16 h-16 bg-red-100 dark:bg-rose-950/40 rounded-full flex items-center justify-center mx-auto mb-5 text-red-600 dark:text-rose-400"><Trash2 size={32} /></div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Delete Expense?</h2>
                <p className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-6">This action cannot be undone. Please enter the action password to confirm.</p>
                <form onSubmit={handleDeleteSubmit} className="space-y-4">
                  <input 
                    type="password" 
                    value={actionPassword} 
                    onChange={e => setActionPassword(e.target.value)} 
                    className="w-full p-4 bg-white dark:bg-[#070b14] border border-gray-300 dark:border-slate-700 rounded-xl font-black text-gray-900 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/40 text-center tracking-widest shadow-sm" 
                    placeholder="Password" 
                    required 
                    autoFocus 
                  />
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModals} className="flex-1 py-3.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                    <button type="submit" disabled={submitting || verifying} className="flex-1 py-3.5 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2">{(submitting || verifying) ? <DotsLoader size="xs" variant="white" label="Deleting..." /> : 'Delete'}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
              {/* Receipt Lightbox Modal */}
        {lightboxUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setLightboxUrl(null)} 
              className="absolute inset-0 bg-black/80 cursor-pointer" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-white dark:bg-[#0c1427] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative z-10 flex flex-col"
            >
              <div className="p-4 bg-gray-900 text-white flex justify-between items-center shrink-0">
                <span className="font-bold text-sm flex items-center gap-2">
                  <Receipt size={16} className="text-blue-400" /> Receipt Preview
                </span>
                <div className="flex items-center gap-2">
                  <a 
                    href={lightboxUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Open in Tab
                  </a>
                  <button 
                    onClick={() => setLightboxUrl(null)} 
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-2 bg-gray-100 dark:bg-slate-900 flex items-center justify-center overflow-auto min-h-[300px] max-h-[calc(90vh-60px)]">
                <iframe 
                  src={lightboxUrl} 
                  className="w-full h-full min-h-[500px] rounded-lg border-0 bg-white" 
                  title="Receipt"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
        document.body
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* For dark inputs on the header */
        input.dark-color-scheme::-webkit-calendar-picker-indicator {
            filter: invert(1);
            opacity: 0.6;
            cursor: pointer;
        }
      `}</style>
    </div>
  );
}
