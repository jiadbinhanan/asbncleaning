'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, FileText, Search, History, PlusCircle,
  Building2, Calendar, Download, Eye, FileDigit,
  Tag, ChevronDown, ChevronUp, PackagePlus, RefreshCw, AlertCircle, CheckCircle2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { pdf } from '@react-pdf/renderer';
import { InvoiceDocument } from "./InvoiceDocument";
import { getInvoiceUploadSignature } from "./actions";
import InstantPOS from "./InstantPOS";
import toast, { Toaster } from "react-hot-toast";

export default function InvoiceManagement() {
  const supabase = createClient();

  // ── Global States ─────────────────────────────────────────────────────────
  const [activeMainTab, setActiveMainTab] = useState<'monthly' | 'instant'>('monthly');
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [companies, setCompanies] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // ── Generate Tab States ───────────────────────────────────────────────────
  const [selectedCompany, setSelectedCompany] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoiceMode, setInvoiceMode] = useState<'combined' | 'cleaning_only' | 'inventory_only'>('combined');
  const [bookings, setBookings] = useState<any[]>([]);
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");

  // ── Instant Dues States (The Bridge) ──────────────────────────────────────
  const [unpaidInstantBills, setUnpaidInstantBills] = useState<any[]>([]);
  const [selectedInstantBillIds, setSelectedInstantBillIds] = useState<string[]>([]);

  // ── Discount State ────────────────────────────────────────────────────────
  const [discountPercent, setDiscountPercent] = useState<string>("");

  // ── Bank Details ──────────────────────────────────────────────────────────
  const [bankDetails, setBankDetails] = useState({
    bankName: "EMIRATES NBD",
    accountName: "BISHNU BAHADUR THAPA",
    accountNumber: "125937795501",
    iban: "AE83 0260 0001 2593 7795 501",
    swift: "EBILAEAD",
    routingNo: "302620000"
  });

  // ── History States ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── 1. Fetch companies + history + unit_configs on mount ──────────────────
  useEffect(() => {
    const initData = async () => {
      setLoadingInitial(true);
      const [compRes, invRes, ucRes] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('unit_equipment_config').select('unit_id, equipment_id, extra_unit_price'),
      ]);

      if (compRes.data) setCompanies(compRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (ucRes.data) setUnitConfigs(ucRes.data);

      setLoadingInitial(false);
    };
    initData();
  }, [supabase]);

  // ── 2. Auto-generate Invoice Number ──────────────────────────────────────
  const generateMonthlyInvoiceNo = useCallback(() => {
    if (selectedCompany && startDate) {
      const dateObj = new Date(startDate);
      const year = dateObj.getFullYear().toString().slice(-2);
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const compShort = companies.find(c => c.id.toString() === selectedCompany)?.name?.slice(0, 4).toUpperCase() || "INV";
      setInvoiceNo(`BTM/${year}${month}-${compShort}-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [selectedCompany, startDate, companies]);

  useEffect(() => {
    generateMonthlyInvoiceNo();
  }, [generateMonthlyInvoiceNo]);

  // ── 3. Fetch Bookings ────────────────────────────────────────────────────
  const fetchBookingsForInvoice = async () => {
    if (!selectedCompany || !startDate || !endDate) {
      return toast.error("Please fill all fields.");
    }

    setLoadingFetch(true);
    setBookings([]);
    setUnpaidInstantBills([]);
    setSelectedInstantBillIds([]);
    setDiscountPercent("");

    const companyId = parseInt(selectedCompany);

    // Fetch Bookings
    const { data: bData, error: bError } = await supabase
      .from('bookings')
      .select(`
        id, booking_ref, cleaning_date, service_type, price, unit_id, invoice_no,
        units ( id, unit_number, building_name, company_id ),
        booking_inventory_logs (
          id, equipment_id, extra_provided_qty, supervisor_price, remarks,
          equipment_master ( item_name, item_type )
        ),
        booking_extra_added_charges ( id, charge_type, item_description, amount )
      `)
      .eq('status', 'finalized')
      .gte('cleaning_date', startDate)
      .lte('cleaning_date', endDate)
      .order('cleaning_date', { ascending: true });

    // Fetch Unpaid Instant Invoices for this company
    const { data: instantData } = await supabase
      .from('instant_invoices')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_paid', false)
      .eq('merged_into_monthly', false)
      .gte('created_at', `${startDate}T00:00:00.000Z`)
      .lte('created_at', `${endDate}T23:59:59.999Z`);

    if (bError) { 
      toast.error("Error fetching bookings"); 
      setLoadingFetch(false); 
      return; 
    }

    const validInstantBills = instantData || [];
    setUnpaidInstantBills(validInstantBills);

    const valid = (bData || []).filter((b: any) => {
      const currentUnit = Array.isArray(b.units) ? b.units[0] : b.units;
      return currentUnit?.company_id === companyId;
    });

    const processed = valid.map((b: any) => {
      // 🚨 Double Billing Protection Flag
      const isAlreadyInvoiced = !!b.invoice_no;

      const extraLogs = (b.booking_inventory_logs || []).filter((i: any) => i.extra_provided_qty > 0);

      const extras = extraLogs.map((i: any) => {
        const config = unitConfigs.find((c: any) => c.unit_id === b.unit_id && c.equipment_id === i.equipment_id);
        const unitPrice = i.supervisor_price !== null && i.supervisor_price !== undefined ? Number(i.supervisor_price) : Number(config?.extra_unit_price || 0);
        return {
          item_name: i.equipment_master?.item_name || "Unknown",
          quantity: i.extra_provided_qty,
          unit_price: unitPrice,
          total_price: i.extra_provided_qty * unitPrice,
          remarks: i.remarks,
        };
      });

      const extraCharges = (b.booking_extra_added_charges || []).map((c: any) => ({
        item_name: c.item_description,
        charge_type: c.charge_type,
        total_price: Number(c.amount),
      }));

      return { ...b, extras, extraCharges, isAlreadyInvoiced };
    });

    const filtered = processed.filter(b => {
      if (invoiceMode === 'cleaning_only') return Number(b.price) > 0;
      if (invoiceMode === 'inventory_only') return b.extras.length > 0;
      return Number(b.price) > 0 || b.extras.length > 0;
    });

    setBookings(filtered);
    setLoadingFetch(false);

    if (filtered.length === 0 && validInstantBills.length === 0) {
      toast("No pending bookings or unpaid instant bills found.", { icon: 'ℹ️' });
    }
  };

  const toggleInstantBill = (id: string) => {
    setSelectedInstantBillIds(prev => prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]);
  };

  // ── Subtotal Calculation (Excluding Already Invoiced) ──
  const subtotal = useMemo(() => {
    const validBookings = bookings.filter(b => !b.isAlreadyInvoiced);

    const bookingsTotal = validBookings.reduce((sum, b) => {
      const extrasTotal = b.extras?.reduce((acc: number, ex: any) => acc + Number(ex.total_price), 0) || 0;
      const chargesTotal = b.extraCharges?.reduce((acc: number, c: any) => acc + Number(c.total_price), 0) || 0;

      if (invoiceMode === 'cleaning_only') return sum + Number(b.price);
      if (invoiceMode === 'inventory_only') return sum + extrasTotal + chargesTotal;

      return sum + Number(b.price) + extrasTotal + chargesTotal;
    }, 0);

    const instantBillsTotal = selectedInstantBillIds.reduce((sum, id) => {
      const bill = unpaidInstantBills.find(b => b.id === id);
      return sum + (Number(bill?.total_amount) || 0);
    }, 0);

    return bookingsTotal + instantBillsTotal;
  }, [bookings, invoiceMode, selectedInstantBillIds, unpaidInstantBills]);

  const discountValue = useMemo(() => {
    const pct = parseFloat(discountPercent || "0");
    if (!pct || pct <= 0 || pct > 100) return 0;
    return (subtotal * pct) / 100;
  }, [subtotal, discountPercent]);

  const finalTotal = useMemo(() => subtotal - discountValue, [subtotal, discountValue]);

  const visibleItemsCount = useMemo(() => {
    const count = bookings.filter(b => {
      if (b.isAlreadyInvoiced) return false; 
      if (invoiceMode === 'cleaning_only') return Number(b.price) > 0;
      if (invoiceMode === 'inventory_only') return b.extras?.length > 0;
      return true;
    }).length;

    return count + selectedInstantBillIds.length;
  }, [bookings, invoiceMode, selectedInstantBillIds]);

  // ── 4. Generate PDF & Upload ──────────────────────────────────────────────
  const handleGenerateAndSave = async () => {
    const validBookingsForPDF = bookings.filter(b => !b.isAlreadyInvoiced);

    if (validBookingsForPDF.length === 0 && selectedInstantBillIds.length === 0) {
      return toast.error("No valid items to invoice.");
    }
    if (!invoiceNo) {
      return toast.error("Invoice number is missing.");
    }

    setGenerating(true);

    try {
      const compName = companies.find(c => c.id.toString() === selectedCompany)?.name || "Unknown";
      const selectedInstantBillsData = unpaidInstantBills.filter(b => selectedInstantBillIds.includes(b.id));

      const invoiceData = {
        invoiceNo, 
        date: new Date().toISOString(), 
        companyName: compName,
        bookings: validBookingsForPDF, 
        instantBills: selectedInstantBillsData, 
        subtotal, 
        discountPercent: parseFloat(discountPercent || "0"),
        discountValue, 
        finalTotal, 
        bankDetails, 
        invoiceMode,
      };

      const blob = await pdf(<InvoiceDocument data={invoiceData} />).toBlob();
      const file = new File([blob], `${invoiceNo.replace(/\//g, '-')}.pdf`, { type: 'application/pdf' });

      // AFTER (fixed) — uses folderPath and publicId returned from the signature function
const { signature, timestamp, apiKey, cloudName, folderPath, publicId } = await getInvoiceUploadSignature(compName, invoiceNo);

const formData = new FormData();
formData.append("file", file);
formData.append("api_key", apiKey!);
formData.append("timestamp", timestamp.toString());
formData.append("signature", signature);
formData.append("folder", folderPath);    // ✅ matches what was signed
formData.append("public_id", publicId);   // ✅ matches what was signed

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadData.secure_url) throw new Error("Cloudinary upload failed");

      // Save to invoices table
      const { error: invError } = await supabase.from('invoices').insert([{
        company_id: parseInt(selectedCompany),
        company_name: compName, 
        invoice_no: invoiceNo,
        start_date: startDate, 
        end_date: endDate,
        total_amount: finalTotal, 
        pdf_url: uploadData.secure_url,
        booking_ids: validBookingsForPDF.map(b => b.id),
      }]);

      if (invError) throw invError;

      // Update bookings
      if (validBookingsForPDF.length > 0) {
        await supabase.from('bookings').update({ invoice_no: invoiceNo }).in('id', validBookingsForPDF.map(b => b.id));
      }

      // Update instant invoices
      if (selectedInstantBillIds.length > 0) {
        await supabase.from('instant_invoices').update({ merged_into_monthly: true }).in('id', selectedInstantBillIds);
      }

      toast.success("Invoice Generated & Saved! 🎉");

      const { data: newHistory } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (newHistory) setInvoices(newHistory);

      setActiveTab('history');

    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Mark Monthly Invoice as Paid ─────────────────────────────────────────
  const handleMarkMonthlyPaid = async (id: number) => {
    const { error } = await supabase
      .from('invoices')
      .update({ is_paid: true, payment_date: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      toast.success("Invoice marked as Paid! Revenue Updated.");
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, is_paid: true } : inv));
    } else {
      toast.error("Failed to update payment status.");
    }
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(i => 
      i.invoice_no?.toLowerCase().includes(q) || 
      i.company_name?.toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredHistory.forEach(inv => {
      const date = format(parseISO(inv.created_at), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(inv);
    });
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return { groups, sortedDates };
  }, [filteredHistory]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url); 
      const blob = await res.blob();
      const link = document.createElement('a'); 
      link.href = URL.createObjectURL(blob);
      link.download = filename; 
      link.click(); 
      URL.revokeObjectURL(link.href);
    } catch { 
      window.open(url, '_blank'); 
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 size-12"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative">
      <Toaster position="top-center"/>

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-24 px-6 md:px-12 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"/>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <FileDigit className="text-blue-500" size={36}/> Billing & Invoices
            </h1>
            <p className="text-blue-300 font-bold mt-2">Generate automated PDF invoices and manage billing history.</p>
          </div>

          <div className="flex flex-wrap bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('generate')} 
              className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex justify-center items-center gap-2 ${activeTab === 'generate' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
            >
              <PlusCircle size={16}/> Generate New
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all flex justify-center items-center gap-2 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'}`}
            >
              <History size={16}/> View History
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-12 relative z-20">

        {/* MAIN TAB SWITCHER */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-gray-100 flex flex-wrap items-center gap-2 relative z-30">
            <button 
              onClick={() => setActiveMainTab('monthly')} 
              className={`px-6 py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 flex-1 md:flex-none ${activeMainTab === 'monthly' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Calendar size={18}/> Monthly Invoices
            </button>
            <button 
              onClick={() => setActiveMainTab('instant')} 
              className={`px-6 py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 flex-1 md:flex-none ${activeMainTab === 'instant' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <PackagePlus size={18}/> Instant POS (Quick Bill)
            </button>
          </div>
        </div>

        {activeMainTab === 'monthly' ? (
          <>
            {activeTab === 'generate' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left: Settings */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100">
                    <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                      <Building2 className="text-blue-600"/> Invoice Settings
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Company</label>
                        <select 
                          value={selectedCompany} 
                          onChange={e => setSelectedCompany(e.target.value)} 
                          className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                        >
                          <option value="">Select Company...</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">From Date</label>
                          <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">To Date</label>
                          <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-gray-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Invoice Format</label>
                        <select 
                          value={invoiceMode} 
                          onChange={e => setInvoiceMode(e.target.value as any)} 
                          className="w-full p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                        >
                          <option value="combined">A: Cleaning + Extra Inventory</option>
                          <option value="cleaning_only">B: Cleaning Services Only</option>
                          <option value="inventory_only">C: Extra Inventory Only</option>
                        </select>
                      </div>

                      <button 
                        onClick={fetchBookingsForInvoice} 
                        disabled={loadingFetch} 
                        className="w-full mt-2 py-4 bg-gray-900 hover:bg-black text-white font-black rounded-xl transition-all shadow-md active:scale-95 flex justify-center items-center gap-2 disabled:opacity-60"
                      >
                        {loadingFetch ? <Loader2 className="animate-spin"/> : <Search size={18}/>} 
                        Fetch Work Data
                      </button>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                      Bank Details 
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase">Editable</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[ 
                        { label: "Bank Name", key: "bankName", span: true }, 
                        { label: "Account Name", key: "accountName", span: true }, 
                        { label: "Account Number", key: "accountNumber" }, 
                        { label: "IBAN", key: "iban" }, 
                        { label: "SWIFT Code", key: "swift" }, 
                        { label: "Routing No", key: "routingNo" } 
                      ].map(({ label, key, span }) => (
                        <div key={key} className={span ? "md:col-span-2" : ""}>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
                          <input 
                            value={(bankDetails as any)[key]} 
                            onChange={e => setBankDetails({ ...bankDetails, [key]: e.target.value })} 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Preview */}
                <div className="lg:col-span-8">
                  <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-6 md:p-10 h-full flex flex-col justify-between min-h-[400px]">
                    {bookings.length > 0 || unpaidInstantBills.length > 0 ? (
                      <>
                        <div>
                          <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
                            <div>
                              <p className="text-xs font-bold text-gray-400">Invoice Draft For</p>
                              <h3 className="text-xl font-black text-gray-900">{companies.find(c => c.id.toString() === selectedCompany)?.name}</h3>

                              <div className="mt-2 flex items-center gap-2">
                                <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                                  <FileDigit size={14} className="text-blue-500"/>
                                  <span className="text-xs font-black text-blue-800 tracking-wide">{invoiceNo}</span>
                                </div>
                                <button 
                                  onClick={generateMonthlyInvoiceNo} 
                                  className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-md border border-gray-200" 
                                  title="Refresh Number"
                                >
                                  <RefreshCw size={14}/>
                                </button>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-gray-400">Total Items</p>
                              <p className="text-xl font-black text-blue-600">{visibleItemsCount}</p>
                            </div>
                          </div>

                          {unpaidInstantBills.length > 0 && (
                            <div className="mb-6 bg-amber-50/50 border border-amber-200 rounded-2xl p-5">
                              <h4 className="text-sm font-black text-amber-800 flex items-center gap-2 mb-3">
                                <AlertCircle size={16}/> Unpaid Instant Bills
                              </h4>
                              <p className="text-xs font-medium text-amber-700 mb-4">
                                The following instant bills are due within this date range. Select to include them in this monthly invoice.
                              </p>

                              <div className="space-y-2">
                                {unpaidInstantBills.map(bill => (
                                  <label key={bill.id} className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedInstantBillIds.includes(bill.id)} 
                                        onChange={() => toggleInstantBill(bill.id)} 
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                      />
                                      <div>
                                        <p className="text-sm font-black text-gray-800">{bill.invoice_no}</p>
                                        <p className="text-[10px] font-bold text-gray-500">{format(new Date(bill.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                                      </div>
                                    </div>
                                    <p className="text-sm font-black text-amber-700">AED {Number(bill.total_amount).toFixed(2)}</p>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                            {bookings.map((b, i) => (
                              <div key={i} className={`rounded-xl border overflow-hidden transition-all ${b.isAlreadyInvoiced ? 'bg-red-50/50 border-red-100 opacity-70' : 'bg-gray-50 border-gray-100'}`}>

                                {invoiceMode !== 'inventory_only' && (
                                  <div className="flex justify-between items-center p-4">
                                    <div className="truncate pr-4">
                                      <p className="font-black text-gray-900 text-sm flex items-center gap-2">
                                        Unit {b.units?.unit_number}
                                        <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md uppercase tracking-widest border border-blue-200">
                                          {b.booking_ref || `#${b.id}`}
                                        </span>
                                        {/* 🚨 ALREADY INVOICED BADGE */}
                                        {b.isAlreadyInvoiced && (
                                          <span className="text-[10px] font-black text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md uppercase">
                                            Already Invoiced: {b.invoice_no}
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs font-bold text-gray-500 mt-1">
                                        {b.service_type} · {format(parseISO(b.cleaning_date), "dd MMM yyyy")}
                                      </p>
                                    </div>
                                    <p className={`font-black text-sm shrink-0 ${b.isAlreadyInvoiced ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                      AED {Number(b.price).toFixed(2)}
                                    </p>
                                  </div>
                                )}

                                {(invoiceMode === 'combined' || invoiceMode === 'inventory_only') && b.extras?.length > 0 && (
                                  <div className={`space-y-1.5 p-3 ${invoiceMode === 'combined' ? 'bg-indigo-50/50 border-t border-gray-100' : ''}`}>
                                    {b.extras.map((ex: any, idx: number) => (
                                      <div key={idx} className={`flex justify-between items-center ${invoiceMode === 'combined' ? 'pl-4 pr-1' : ''}`}>
                                        <p className={`text-xs font-bold flex items-center gap-1 ${b.isAlreadyInvoiced ? 'text-gray-400' : 'text-indigo-900'}`}>
                                          {invoiceMode === 'combined' && <PackagePlus size={10} className="text-indigo-400"/>} 
                                          {ex.quantity}x {ex.item_name} 
                                          {ex.remarks && <span className="text-gray-400 font-normal ml-1">· {ex.remarks}</span>}
                                        </p>
                                        <p className={`text-xs font-black ${b.isAlreadyInvoiced ? 'text-gray-400 line-through' : 'text-indigo-700'}`}>
                                          AED {Number(ex.total_price).toFixed(2)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {(invoiceMode === 'combined' || invoiceMode === 'inventory_only') && b.extraCharges?.length > 0 && (
                                  <div className="space-y-1.5 p-3 bg-red-50/40 border-t border-red-100">
                                    {b.extraCharges.map((c: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center pl-4 pr-1">
                                        <p className={`text-xs font-bold flex items-center gap-1 ${b.isAlreadyInvoiced ? 'text-gray-400' : 'text-red-800'}`}>
                                          <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">
                                            {c.charge_type === 'damage' ? '🔥 DMG' : '✏️'}
                                          </span> 
                                          {c.item_name}
                                        </p>
                                        <p className={`text-xs font-black ${b.isAlreadyInvoiced ? 'text-gray-400 line-through' : 'text-red-700'}`}>
                                          AED {Number(c.total_price).toFixed(2)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                          <div className="flex justify-between items-center">
                            <p className="text-gray-500 font-bold">Subtotal</p>
                            <p className="text-xl font-black text-gray-700">AED {subtotal.toFixed(2)}</p>
                          </div>

                          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1 mb-2">
                              <Tag size={11}/> Discount (Optional)
                            </label>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2.5 flex-1 focus-within:border-amber-400 transition-colors">
                                <input 
                                  type="number" min="0" max="100" step="0.5" 
                                  value={discountPercent} 
                                  onChange={e => setDiscountPercent(e.target.value)} 
                                  placeholder="0" 
                                  className="flex-1 outline-none text-lg font-black text-gray-900 bg-transparent w-full"
                                />
                                <span className="text-gray-400 font-black text-lg">%</span>
                              </div>
                              {discountValue > 0 && (
                                <div className="text-right shrink-0">
                                  <p className="text-[10px] font-black text-amber-600 uppercase">Saving</p>
                                  <p className="text-base font-black text-amber-700">- AED {discountValue.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
                            <p className="text-gray-600 font-black">Final Invoice Total</p>
                            <p className="text-3xl font-black text-green-600">AED {finalTotal.toFixed(2)}</p>
                          </div>

                          <button 
                            onClick={handleGenerateAndSave} 
                            disabled={generating} 
                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {generating ? <><Loader2 className="animate-spin"/> Processing & Uploading...</> : <><FileText size={20}/> Generate Official PDF Invoice</>}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
                        <FileText size={64} className="mb-2"/>
                        <p className="text-lg font-black">No Draft Available</p>
                        <p className="text-sm font-bold">Select settings and fetch data to preview.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TAB 2: HISTORY ─────────────────────────────────────────────── */}
            {activeTab === 'history' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-8 relative max-w-2xl">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                  <input 
                    type="text" 
                    placeholder="Search by Company Name or Invoice ID..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="w-full p-4 pl-14 bg-white rounded-[1.5rem] border-2 border-gray-100 outline-none focus:border-blue-500 font-bold text-gray-900 shadow-sm"
                  />
                </div>

                <div className="space-y-10">
                  {groupedHistory.sortedDates.length === 0 ? (
                    <div className="text-center p-20 bg-white rounded-3xl border border-gray-100 text-gray-400 font-bold">No invoices found.</div>
                  ) : (
                    groupedHistory.sortedDates.map(dateStr => (
                      <div key={dateStr} className="space-y-4">
                        <h3 className="text-sm font-black text-gray-500 tracking-widest uppercase mb-2 flex items-center gap-2 pl-2">
                          <Calendar size={18}/> {format(parseISO(dateStr), "dd MMM yyyy")}
                        </h3>

                        <div className="flex flex-col gap-4">
                          {groupedHistory.groups[dateStr].map((inv: any) => (
                            <div 
                              key={inv.id} 
                              className={`p-5 md:p-6 rounded-3xl border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${inv.is_paid ? 'bg-white border-gray-100' : 'bg-amber-50/30 border-amber-200'}`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <FileText size={18} className="text-blue-600"/>
                                  <span className="font-black text-gray-900 text-lg">{inv.invoice_no}</span>
                                  {/* 🚨 PAID/UNPAID BADGE */}
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border flex items-center gap-1 ${inv.is_paid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                                    {inv.is_paid ? <><CheckCircle2 size={12}/> Paid</> : <><AlertCircle size={12}/> Unpaid</>}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                  <Building2 size={14} className="text-gray-400"/> {inv.company_name}
                                </h4>
                                {inv.start_date && inv.end_date && (
                                  <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">
                                    Period: {format(parseISO(inv.start_date), 'dd MMM')} – {format(parseISO(inv.end_date), 'dd MMM yyyy')}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Billed</p>
                                  <p className="text-xl font-black text-green-600">AED {Number(inv.total_amount).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* 🚨 MARK AS PAID BUTTON */}
                                  {!inv.is_paid && (
                                    <button 
                                      onClick={() => handleMarkMonthlyPaid(inv.id)} 
                                      className="p-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm active:scale-95" 
                                      title="Mark as Paid"
                                    >
                                      <CheckCircle2 size={20}/>
                                    </button>
                                  )}
                                  <a 
                                    href={inv.pdf_url} target="_blank" rel="noreferrer" 
                                    className="p-3.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl transition-colors shadow-sm" 
                                    title="View"
                                  >
                                    <Eye size={20}/>
                                  </a>
                                  <button 
                                    onClick={() => handleDownload(inv.pdf_url, `${inv.invoice_no.replace(/\//g, '-')}.pdf`)} 
                                    className="p-3.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-colors shadow-sm" 
                                    title="Download"
                                  >
                                    <Download size={20}/>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <InstantPOS companies={companies} />
        )}

      </div>
    </div>
  );
}