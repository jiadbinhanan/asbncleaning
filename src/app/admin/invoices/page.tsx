'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, FileText, Search, History, PlusCircle,
  Building2, Calendar, Download, Eye, FileDigit,
  Tag, PackagePlus, RefreshCw, AlertCircle, CheckCircle2,
  Trash2, AlertTriangle, X, CreditCard,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { pdf } from '@react-pdf/renderer';
import { InvoiceDocument } from "./InvoiceDocument";
import { getInvoiceUploadSignature, deleteMonthlyInvoice } from "./actions";
import InstantPOS from "./InstantPOS";
import toast, { Toaster } from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Modal (full-screen centered — used for History tab delete)
// ─────────────────────────────────────────────────────────────────────────────
function DeleteConfirmModal({
  invoice,
  onConfirm,
  onCancel,
  loading,
}: {
  invoice: any;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 z-10"
      >
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mx-auto mb-5">
          <AlertTriangle size={32} className="text-red-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 text-center mb-2">Delete this Invoice?</h2>
        <p className="text-sm font-bold text-gray-500 text-center mb-6">This action cannot be undone.</p>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 space-y-2">
          <div className="flex justify-between"><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Invoice No</span><span className="text-sm font-black text-gray-900">{invoice.invoice_no}</span></div>
          <div className="flex justify-between"><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Company</span><span className="text-sm font-bold text-gray-700">{invoice.company_name}</span></div>
          <div className="flex justify-between"><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Amount</span><span className="text-sm font-black text-red-600">AED {Number(invoice.total_amount).toFixed(2)}</span></div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-amber-800 leading-relaxed">All bookings will become available for re-invoicing. The PDF will be permanently removed from cloud storage.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl transition-all disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Deleting...</> : <><Trash2 size={16} /> Yes, Delete</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Already-Invoiced Inline Popover
// ─────────────────────────────────────────────────────────────────────────────
function InvoicedPopover({
  data,
  invoices,
  onClose,
  onDelete,
  deleting,
}: {
  data: { booking: any, x: number, y: number };
  invoices: any[];
  onClose: () => void;
  onDelete: (inv: any) => void;
  deleting: boolean;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const inv = invoices.find((i) => i.invoice_no === data.booking.invoice_no);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);


  const leftPos = Math.min(data.x, typeof window !== 'undefined' ? window.innerWidth - 380 : data.x);
  const topPos = typeof window !== 'undefined' && data.y > window.innerHeight - 300 ? data.y - 280 : data.y + 12;

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{ position: 'fixed', top: topPos, left: leftPos, zIndex: 9999 }}
      className="w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-red-50/60">
        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5">
          <AlertCircle size={12} /> Already Invoiced
        </p>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
          <X size={15} />
        </button>
      </div>

      {inv ? (
        <div className={`p-5 ${inv.is_paid ? 'bg-white' : 'bg-amber-50/20'}`}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <FileText size={16} className="text-blue-600 shrink-0" />
            <span className="font-black text-gray-900">{inv.invoice_no}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border flex items-center gap-1 ${inv.is_paid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
              {inv.is_paid ? <><CheckCircle2 size={10} /> Paid</> : <><AlertCircle size={10} /> Unpaid</>}
            </span>
          </div>

          <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-1">
            <Building2 size={12} className="text-gray-400" /> {inv.company_name}
          </p>
          {inv.start_date && inv.end_date && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              {format(parseISO(inv.start_date), 'dd MMM')} – {format(parseISO(inv.end_date), 'dd MMM yyyy')}
            </p>
          )}

          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 mb-4">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Billed</p>
              <p className="text-xl font-black text-green-600">AED {Number(inv.total_amount).toFixed(2)}</p>
            </div>
            <p className="text-[10px] font-bold text-gray-400">{format(parseISO(inv.created_at), 'dd MMM yyyy')}</p>
          </div>

          <div className="flex items-center gap-2">
            {!inv.is_paid && (
              <button
                onClick={() => onDelete(inv)}
                disabled={deleting}
                className="p-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-colors border border-red-100"
                title="Delete Invoice"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            )}
            {inv.pdf_url && (
              <>
                <a href={`/api/pdf/${encodeURIComponent(inv.invoice_no)}`} target="_blank" rel="noreferrer" className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl transition-colors text-xs font-black text-center flex items-center justify-center gap-1.5">
                  <Eye size={14} /> View
                </a>
                <a href={`/api/pdf/${encodeURIComponent(inv.invoice_no)}?dl=1`} download className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-colors text-xs font-black flex items-center justify-center gap-1.5">
                  <Download size={14} /> Download
                </a>
              </>
            )}
          </div>

          {!inv.is_paid && (
            <p className="text-[10px] font-bold text-gray-400 text-center mt-3">
              Delete this invoice to re-invoice these bookings.
            </p>
          )}
        </div>
      ) : (
        <div className="p-6 text-center text-gray-500">
          <p className="text-sm font-bold">Invoice <span className="text-gray-900">{data.booking.invoice_no}</span> not found.</p>
          <p className="text-xs mt-1">It may belong to a different period.</p>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoiceManagement() {
  const supabase = createClient();

  // ── Global States ──────────────────────────────────────────────────────────
  const [activeMainTab, setActiveMainTab] = useState<'monthly' | 'instant'>('monthly');
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [companies, setCompanies] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [allInstantInvoices, setAllInstantInvoices] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // ── Generate Tab States ────────────────────────────────────────────────────
  const [selectedCompany, setSelectedCompany] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoiceMode, setInvoiceMode] = useState<'combined' | 'cleaning_only' | 'inventory_only'>('combined');
  const [bookings, setBookings] = useState<any[]>([]);
  const [unitConfigs, setUnitConfigs] = useState<any[]>([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");

  // ── Instant Dues States ────────────────────────────────────────────────────
  const [unpaidInstantBills, setUnpaidInstantBills] = useState<any[]>([]);
  const [selectedInstantBillIds, setSelectedInstantBillIds] = useState<string[]>([]);

  // ── Discount ───────────────────────────────────────────────────────────────
  const [discountMode, setDiscountMode] = useState<'percent' | 'manual'>('percent');
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [discountManual, setDiscountManual] = useState<string>("");
  const [discountRemarks, setDiscountRemarks] = useState<string>("");

  // ── Bank Details ───────────────────────────────────────────────────────────
  const [bankDetails, setBankDetails] = useState({
    bankName: "EMIRATES NBD",
    accountName: "BISHNU BAHADUR THAPA",
    accountNumber: "125937795501",
    iban: "AE83 0260 0001 2593 7795 501",
    swift: "EBILAEAD",
    routingNo: "302620000",
  });

  // ── History Search ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Delete Modal (History tab) ─────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Inline Popover State ───────────────────────────────────────────────────
  const [popoverData, setPopoverData] = useState<{ booking: any, x: number, y: number } | null>(null);
  const [popoverDeleting, setPopoverDeleting] = useState(false);

  // ── 1. Initial data fetch ──────────────────────────────────────────────────
  useEffect(() => {
    const initData = async () => {
      setLoadingInitial(true);
      const [compRes, invRes, ucRes, instRes] = await Promise.all([
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('unit_equipment_config').select('unit_id, equipment_id, extra_unit_price'),
        supabase.from('instant_invoices').select('id, invoice_no, is_paid, merged_into_monthly, total_amount').order('created_at', { ascending: false }),
      ]);
      if (compRes.data) setCompanies(compRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (ucRes.data) setUnitConfigs(ucRes.data);
      if (instRes.data) setAllInstantInvoices(instRes.data);
      setLoadingInitial(false);
    };
    initData();
  }, [supabase]);

  // ── 2. Auto-generate Invoice Number ───────────────────────────────────────
  const generateMonthlyInvoiceNo = useCallback(() => {
    if (selectedCompany && startDate) {
      const dateObj = new Date(startDate);
      const year = dateObj.getFullYear().toString().slice(-2);
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const compShort = companies.find(c => c.id.toString() === selectedCompany)?.name?.slice(0, 4).toUpperCase() || "INV";
      setInvoiceNo(`BTM/${year}${month}-${compShort}-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [selectedCompany, startDate, companies]);

  useEffect(() => { generateMonthlyInvoiceNo(); }, [generateMonthlyInvoiceNo]);

  // ── 3. Fetch Bookings ──────────────────────────────────────────────────────
  const fetchBookingsForInvoice = async () => {
    if (!selectedCompany || !startDate || !endDate) return toast.error("Please fill all fields.");
    setLoadingFetch(true);
    setBookings([]); setUnpaidInstantBills([]); setSelectedInstantBillIds([]); setDiscountPercent(""); setDiscountManual(""); setDiscountRemarks("");

    const companyId = parseInt(selectedCompany);

    const { data: bData, error: bError } = await supabase
      .from('bookings')
      .select(`
        id, booking_ref, cleaning_date, service_type, price, unit_id, invoice_no,
        units ( id, unit_number, building_name, company_id ),
        booking_inventory_logs ( id, equipment_id, extra_provided_qty, supervisor_price, remarks, equipment_master ( item_name, item_type ) ),
        booking_extra_added_charges ( id, charge_type, item_description, amount )
      `)
      .eq('status', 'finalized')
      .gte('cleaning_date', startDate)
      .lte('cleaning_date', endDate)
      .order('cleaning_date', { ascending: true });

    const { data: instantData } = await supabase
      .from('instant_invoices').select('*')
      .eq('company_id', companyId).eq('is_paid', false).eq('merged_into_monthly', false)
      .gte('created_at', `${startDate}T00:00:00.000Z`).lte('created_at', `${endDate}T23:59:59.999Z`);

    if (bError) { toast.error("Error fetching bookings"); setLoadingFetch(false); return; }
    setUnpaidInstantBills(instantData || []);

    const valid = (bData || []).filter((b: any) => {
      const unit = Array.isArray(b.units) ? b.units[0] : b.units;
      return unit?.company_id === companyId;
    });

    const processed = valid.map((b: any) => {
      const isAlreadyInvoiced = !!b.invoice_no;
      const extraLogs = (b.booking_inventory_logs || []).filter((i: any) => i.extra_provided_qty > 0);
      const extras = extraLogs.map((i: any) => {
        const config = unitConfigs.find((c: any) => c.unit_id === b.unit_id && c.equipment_id === i.equipment_id);
        const unitPrice = i.supervisor_price != null ? Number(i.supervisor_price) : Number(config?.extra_unit_price || 0);
        return { item_name: i.equipment_master?.item_name || "Unknown", quantity: i.extra_provided_qty, unit_price: unitPrice, total_price: i.extra_provided_qty * unitPrice, remarks: i.remarks };
      });
      const extraCharges = (b.booking_extra_added_charges || []).map((c: any) => ({ item_name: c.item_description, charge_type: c.charge_type, total_price: Number(c.amount) }));
      return { ...b, extras, extraCharges, isAlreadyInvoiced };
    });

    const filtered = processed.filter(b => {
      if (invoiceMode === 'cleaning_only') return Number(b.price) > 0;
      if (invoiceMode === 'inventory_only') return b.extras.length > 0;
      return Number(b.price) > 0 || b.extras.length > 0;
    });

    setBookings(filtered);
    setLoadingFetch(false);
    if (filtered.length === 0 && (instantData || []).length === 0) toast("No pending bookings or unpaid instant bills found.", { icon: 'ℹ️' });
  };

  const toggleInstantBill = (id: string) => setSelectedInstantBillIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    const validBookings = bookings.filter(b => !b.isAlreadyInvoiced);
    const bt = validBookings.reduce((sum, b) => {
      const et = b.extras?.reduce((a: number, x: any) => a + Number(x.total_price), 0) || 0;
      const ct = b.extraCharges?.reduce((a: number, c: any) => a + Number(c.total_price), 0) || 0;
      if (invoiceMode === 'cleaning_only') return sum + Number(b.price);
      if (invoiceMode === 'inventory_only') return sum + et + ct;
      return sum + Number(b.price) + et + ct;
    }, 0);
    const it = selectedInstantBillIds.reduce((sum, id) => sum + (Number(unpaidInstantBills.find(b => b.id === id)?.total_amount) || 0), 0);
    return bt + it;
  }, [bookings, invoiceMode, selectedInstantBillIds, unpaidInstantBills]);

  const discountValue = useMemo(() => {
    if (discountMode === 'percent') {
      const p = parseFloat(discountPercent || "0");
      return (!p || p <= 0 || p > 100) ? 0 : (subtotal * p) / 100;
    } else {
      const m = parseFloat(discountManual || "0");
      return (!m || m < 0 || m > subtotal) ? 0 : m;
    }
  }, [subtotal, discountPercent, discountManual, discountMode]);
  const finalTotal = useMemo(() => subtotal - discountValue, [subtotal, discountValue]);
  const visibleItemsCount = useMemo(() => {
    return bookings.filter(b => { if (b.isAlreadyInvoiced) return false; if (invoiceMode === 'cleaning_only') return Number(b.price) > 0; if (invoiceMode === 'inventory_only') return b.extras?.length > 0; return true; }).length + selectedInstantBillIds.length;
  }, [bookings, invoiceMode, selectedInstantBillIds]);

  // ── 4. Generate PDF & Upload ───────────────────────────────────────────────
  const handleGenerateAndSave = async () => {
    const validBookings = bookings.filter(b => !b.isAlreadyInvoiced);
    if (validBookings.length === 0 && selectedInstantBillIds.length === 0) return toast.error("No valid items to invoice.");
    if (!invoiceNo) return toast.error("Invoice number is missing.");
    setGenerating(true);
    try {
      const compName = companies.find(c => c.id.toString() === selectedCompany)?.name || "Unknown";
      const selInstantBills = unpaidInstantBills.filter(b => selectedInstantBillIds.includes(b.id));

      const instantBillsByUnit: Record<number, { billNo: string; label: string; items: any[] }[]> = {};
      const instantBillsNoUnit: { billNo: string; items: any[] }[] = [];

      for (const bill of selInstantBills) {
        const rawItems: any[] = Array.isArray(bill.items) ? bill.items : [];
        const itemsWithUnit = rawItems.filter((i: any) => i.unit_id);
        const itemsWithoutUnit = rawItems.filter((i: any) => !i.unit_id);

        const byUnit: Record<number, any[]> = {};
        for (const item of itemsWithUnit) {
          const uid = Number(item.unit_id);
          if (!byUnit[uid]) byUnit[uid] = [];
          byUnit[uid].push(item);
        }
        for (const [uid, items] of Object.entries(byUnit)) {
          const numUid = Number(uid);
          if (!instantBillsByUnit[numUid]) instantBillsByUnit[numUid] = [];
          instantBillsByUnit[numUid].push({
            billNo: bill.invoice_no,
            label: items[0]?.unit_label ?? `Unit ${uid}`,
            items,
          });
        }
        if (itemsWithoutUnit.length > 0) {
          instantBillsNoUnit.push({ billNo: bill.invoice_no, items: itemsWithoutUnit });
        }
        if (rawItems.length === 0) {
          instantBillsNoUnit.push({ billNo: bill.invoice_no, items: [] });
        }
      }

      const invoiceData = {
        invoiceNo,
        date: new Date().toISOString(),
        companyName: compName,
        bookings: validBookings,
        instantBills: selInstantBills,
        instantBillsByUnit,
        instantBillsNoUnit,
        subtotal,
        discountPercent: discountValue > 0 && subtotal > 0 ? Number(((discountValue / subtotal) * 100).toFixed(1)) : 0,
        discountValue,
        discountRemarks,
        finalTotal,
        bankDetails,
        invoiceMode,
      };
      const blob = await pdf(<InvoiceDocument data={invoiceData} />).toBlob();
      const file = new File([blob], `${invoiceNo.replace(/\//g, '-')}.pdf`, { type: 'application/pdf' });
      const { signature, timestamp, apiKey, cloudName, folderPath, publicId } = await getInvoiceUploadSignature(compName, invoiceNo);
      const formData = new FormData();
      formData.append("file", file); formData.append("api_key", apiKey!); formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature); formData.append("folder", folderPath); formData.append("public_id", publicId);
      const uploadData = await (await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData })).json();
      if (!uploadData.secure_url) throw new Error("Cloudinary upload failed");
      const { error: invError } = await supabase.from('invoices').insert([{ company_id: parseInt(selectedCompany), company_name: compName, invoice_no: invoiceNo, start_date: startDate, end_date: endDate, subtotal, discount: discountValue, discount_remarks: discountRemarks, total_amount: finalTotal, pdf_url: uploadData.secure_url, booking_ids: validBookings.map(b => b.id), instant_invoice_ids: selectedInstantBillIds }]);
      if (invError) throw invError;
      if (validBookings.length > 0) await supabase.from('bookings').update({ invoice_no: invoiceNo }).in('id', validBookings.map(b => b.id));
      if (selectedInstantBillIds.length > 0) await supabase.from('instant_invoices').update({ merged_into_monthly: true }).in('id', selectedInstantBillIds);
      toast.success("Invoice Generated & Saved!");
      const { data: newHistory } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (newHistory) setInvoices(newHistory);
      const { data: newInstant } = await supabase.from('instant_invoices').select('id, invoice_no, is_paid, merged_into_monthly, total_amount').order('created_at', { ascending: false });
      if (newInstant) setAllInstantInvoices(newInstant);
      setActiveTab('history');
    } catch (err: any) { toast.error("Error: " + err.message); } finally { setGenerating(false); }
  };

  // ── 5. Mark Paid ──────────────────────────────────────────────────────────
  const handleMarkMonthlyPaid = async (id: string) => {
    const { error } = await supabase.from('invoices').update({ is_paid: true, payment_date: new Date().toISOString() }).eq('id', id);
    if (!error) {
      toast.success("Invoice marked as Paid!");
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, is_paid: true } : inv));
      // Also mark merged instant invoices as paid
      const inv = invoices.find(i => i.id === id);
      if (inv?.instant_invoice_ids?.length > 0) {
        await supabase.from('instant_invoices').update({ is_paid: true, payment_date: new Date().toISOString() }).in('id', inv.instant_invoice_ids);
      }
    }
    else toast.error("Failed to update payment status.");
  };

  // ── 5b. Mark Unpaid ───────────────────────────────────────────────────────
  const handleMarkMonthlyUnpaid = async (id: string) => {
    const { error } = await supabase.from('invoices').update({ is_paid: false, payment_date: null }).eq('id', id);
    if (!error) {
      toast.success("Invoice marked as Unpaid.");
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, is_paid: false, payment_date: null } : inv));
      // Also unmark merged instant invoices
      const inv = invoices.find(i => i.id === id);
      if (inv?.instant_invoice_ids?.length > 0) {
        await supabase.from('instant_invoices').update({ is_paid: false, payment_date: null }).in('id', inv.instant_invoice_ids);
      }
    }
    else toast.error("Failed to update payment status.");
  };

  // ── 6. Delete Monthly Invoice ─────────────────────────────────────────────
  const executeDeletion = async (invoiceId: string): Promise<boolean> => {
    const result = await deleteMonthlyInvoice(invoiceId);
    if (!result.success) { toast.error(result.error || "Delete failed."); return false; }
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    toast.success("Invoice deleted. Bookings are now available for re-invoicing.");
    return true;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await executeDeletion(deleteTarget.id); setDeleteTarget(null); }
    catch (err: any) { toast.error("Error: " + err.message); }
    finally { setDeleting(false); }
  };

  const handlePopoverDelete = async (inv: any) => {
    const confirmed = window.confirm(
      `Delete invoice ${inv.invoice_no}?\n\nThis will permanently remove the PDF and reset all related bookings for re-invoicing. This cannot be undone.`
    );
    if (!confirmed) return;
    setPopoverDeleting(true);
    try {
      const ok = await executeDeletion(inv.id);
      if (ok) setPopoverData(null);
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setPopoverDeleting(false); }
  };

  // ── History filters ────────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    if (!searchQuery) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(i => i.invoice_no?.toLowerCase().includes(q) || i.company_name?.toLowerCase().includes(q));
  }, [invoices, searchQuery]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredHistory.forEach(inv => { const d = format(parseISO(inv.created_at), "yyyy-MM-dd"); if (!groups[d]) groups[d] = []; groups[d].push(inv); });
    return { groups, sortedDates: Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) };
  }, [filteredHistory]);


  if (loadingInitial) return <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-12" /></div>;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans relative">
      <Toaster position="top-center" />

      {/* Delete modal (History tab) */}
      <AnimatePresence>
        {deleteTarget && <DeleteConfirmModal invoice={deleteTarget} onConfirm={handleDeleteConfirm} onCancel={() => !deleting && setDeleteTarget(null)} loading={deleting} />}
      </AnimatePresence>

      {/* Inline popover (Generate tab) */}
      <AnimatePresence>
        {popoverData && (
          <InvoicedPopover
            data={popoverData}
            invoices={invoices}
            onClose={() => setPopoverData(null)}
            onDelete={handlePopoverDelete}
            deleting={popoverDeleting}
          />
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white px-6 md:px-10 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between py-6 gap-6">

          {/* Left: Title */}
          <div className="shrink-0 w-full md:w-auto">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <FileDigit className="text-blue-500" size={30} /> Billing & Invoices
            </h1>
            <p className="text-blue-300 font-bold mt-1 text-sm">Generate automated PDF invoices and manage billing history.</p>
          </div>

          {/* Right: Navigation (Stacked, 2 on top, 2 on bottom) */}
          <div className="shrink-0 flex flex-col gap-2 w-full max-w-[260px] md:self-end">
            {/* Row 1: Invoice type */}
            <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 gap-1 w-full">
              <button
                onClick={() => setActiveMainTab('monthly')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 ${activeMainTab === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              >
                <Calendar size={13} /> Monthly
              </button>
              <button
                onClick={() => setActiveMainTab('instant')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 ${activeMainTab === 'instant' ? 'bg-indigo-500 text-white shadow' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              >
                <PackagePlus size={13} /> Instant POS
              </button>
            </div>
            {/* Row 2: Action */}
            <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 gap-1 w-full">
              <button
                onClick={() => setActiveTab('generate')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 ${activeTab === 'generate' ? (activeMainTab === 'instant' ? 'bg-indigo-500 text-white shadow' : 'bg-blue-600 text-white shadow') : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              >
                <PlusCircle size={13} /> {activeMainTab === 'instant' ? 'New Bill' : 'Generate New'}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 ${activeTab === 'history' ? (activeMainTab === 'instant' ? 'bg-indigo-500 text-white shadow' : 'bg-blue-600 text-white shadow') : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
              >
                <History size={13} /> View History
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="w-full px-6 md:px-10 pt-8 relative z-10">

        {activeMainTab === 'monthly' ? (
          <>
            {/* ── GENERATE TAB ── */}
            <AnimatePresence mode="wait">
            {activeTab === 'generate' && (
              <motion.div key="monthly-generate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                className="grid grid-cols-1 xl:grid-cols-12 gap-6"
              >
                {/* Left: Settings */}
                <div className="xl:col-span-3 space-y-5">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                      <Building2 size={18} className="text-blue-600" /> Invoice Settings
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Company</label>
                        <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 text-sm">
                          <option value="">Select Company...</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">From</label>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-gray-900" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">To</label>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Format</label>
                        <select value={invoiceMode} onChange={e => setInvoiceMode(e.target.value as any)} className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900 text-sm">
                          <option value="combined">A: Cleaning + Extra Inventory</option>
                          <option value="cleaning_only">B: Cleaning Services Only</option>
                          <option value="inventory_only">C: Extra Inventory Only</option>
                        </select>
                      </div>
                      <button onClick={fetchBookingsForInvoice} disabled={loadingFetch} className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black rounded-xl transition-all shadow-sm active:scale-95 flex justify-center items-center gap-2 disabled:opacity-60 text-sm">
                        {loadingFetch ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} Fetch Work Data
                      </button>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                      Bank Details <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase">Editable</span>
                    </h2>
                    <div className="space-y-3">
                      {[{ label: "Bank Name", key: "bankName" }, { label: "Account Name", key: "accountName" }, { label: "Account No", key: "accountNumber" }, { label: "IBAN", key: "iban" }, { label: "SWIFT", key: "swift" }, { label: "Routing No", key: "routingNo" }].map(({ label, key }) => (
                        <div key={key}>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
                          <input value={(bankDetails as any)[key]} onChange={e => setBankDetails({ ...bankDetails, [key]: e.target.value })} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-blue-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Preview */}
                <div className="xl:col-span-9">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 h-full flex flex-col justify-between min-h-[400px]">
                    {bookings.length > 0 || unpaidInstantBills.length > 0 ? (
                      <>
                        <div>
                          <div className="flex justify-between items-start mb-5 pb-5 border-b border-gray-100">
                            <div>
                              <p className="text-xs font-bold text-gray-400">Invoice Draft For</p>
                              <h3 className="text-xl font-black text-gray-900">{companies.find(c => c.id.toString() === selectedCompany)?.name}</h3>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                                  <FileDigit size={13} className="text-blue-500" />
                                  <span className="text-xs font-black text-blue-800 tracking-wide">{invoiceNo}</span>
                                </div>
                                <button onClick={generateMonthlyInvoiceNo} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md border border-gray-200" title="Refresh"><RefreshCw size={13} /></button>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-gray-400">Valid Items</p>
                              <p className="text-2xl font-black text-blue-600">{visibleItemsCount}</p>
                            </div>
                          </div>

                          {unpaidInstantBills.length > 0 && (
                            <div className="mb-5 bg-amber-50/50 border border-amber-200 rounded-2xl p-4">
                              <h4 className="text-sm font-black text-amber-800 flex items-center gap-2 mb-2"><AlertCircle size={15} /> Unpaid Instant Bills in this period</h4>
                              <p className="text-xs font-medium text-amber-700 mb-3">Select to include in this monthly invoice.</p>
                              <div className="space-y-2">
                                {unpaidInstantBills.map(bill => (
                                  <label key={bill.id} className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <input type="checkbox" checked={selectedInstantBillIds.includes(bill.id)} onChange={() => toggleInstantBill(bill.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer" />
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

                          {/* Bookings list */}
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                            {bookings.map((b, i) => (
                              <div key={i} className={`rounded-xl border overflow-hidden transition-all ${b.isAlreadyInvoiced ? 'bg-red-50/50 border-red-100 opacity-80' : 'bg-gray-50 border-gray-100'}`}>
                                {invoiceMode !== 'inventory_only' && (
                                  <div className="flex justify-between items-center p-3.5">
                                    <div className="truncate pr-3 min-w-0">
                                      <p className="font-black text-gray-900 text-sm flex items-center gap-1.5 flex-wrap">
                                        Unit {b.units?.unit_number}
                                        <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md uppercase tracking-widest border border-blue-200">{b.booking_ref || `#${b.id}`}</span>
                                        {b.isAlreadyInvoiced && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPopoverData(popoverData?.booking?.id === b.id ? null : { booking: b, x: e.clientX, y: e.clientY });
                                            }}
                                            className="text-[10px] font-black text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md uppercase hover:bg-red-200 transition-colors flex items-center gap-1"
                                          >
                                            <CreditCard size={9} /> {b.invoice_no}
                                          </button>
                                        )}
                                      </p>
                                      <p className="text-xs font-bold text-gray-500 mt-0.5">{b.service_type} · {format(parseISO(b.cleaning_date), "dd MMM yyyy")}</p>
                                    </div>
                                    <p className={`font-black text-sm shrink-0 ${b.isAlreadyInvoiced ? 'text-gray-400 line-through' : 'text-gray-800'}`}>AED {Number(b.price).toFixed(2)}</p>
                                  </div>
                                )}
                                {(invoiceMode === 'combined' || invoiceMode === 'inventory_only') && b.extras?.length > 0 && (
                                  <div className={`space-y-1 p-3 ${invoiceMode === 'combined' ? 'bg-indigo-50/50 border-t border-gray-100' : ''}`}>
                                    {b.extras.map((ex: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center pl-3 pr-1">
                                        <p className={`text-xs font-bold flex items-center gap-1 ${b.isAlreadyInvoiced ? 'text-gray-400' : 'text-indigo-900'}`}>
                                          {invoiceMode === 'combined' && <PackagePlus size={9} className="text-indigo-400" />}
                                          {ex.quantity}x {ex.item_name}{ex.remarks && <span className="text-gray-400 font-normal">· {ex.remarks}</span>}
                                        </p>
                                        <p className={`text-xs font-black ${b.isAlreadyInvoiced ? 'text-gray-400 line-through' : 'text-indigo-700'}`}>AED {Number(ex.total_price).toFixed(2)}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {(invoiceMode === 'combined' || invoiceMode === 'inventory_only') && b.extraCharges?.length > 0 && (
                                  <div className="space-y-1 p-3 bg-red-50/40 border-t border-red-100">
                                    {b.extraCharges.map((c: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center pl-3 pr-1">
                                        <p className={`text-xs font-bold flex items-center gap-1 ${b.isAlreadyInvoiced ? 'text-gray-400' : 'text-red-800'}`}>
                                          <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">{c.charge_type === 'damage' ? 'DMG' : 'EXTRA'}</span>
                                          {c.item_name}
                                        </p>
                                        <p className={`text-xs font-black ${b.isAlreadyInvoiced ? 'text-gray-400 line-through' : 'text-red-700'}`}>AED {Number(c.total_price).toFixed(2)}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Totals & Generate */}
                        <div className="mt-6 pt-5 border-t border-gray-100 space-y-4">
                          <div className="flex justify-between items-center">
                            <p className="text-gray-500 font-bold">Subtotal</p>
                            <p className="text-xl font-black text-gray-700">AED {subtotal.toFixed(2)}</p>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
                            <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1"><Tag size={11} /> Discount (Optional)</label>
                            {/* Mode toggle */}
                            <div className="flex gap-1 bg-amber-100/60 p-1 rounded-xl">
                              <button type="button" onClick={() => { setDiscountMode('percent'); setDiscountManual(""); }} className={`flex-1 text-[10px] font-black py-1.5 rounded-lg transition-all ${discountMode === 'percent' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800'}`}>% Percent</button>
                              <button type="button" onClick={() => { setDiscountMode('manual'); setDiscountPercent(""); }} className={`flex-1 text-[10px] font-black py-1.5 rounded-lg transition-all ${discountMode === 'manual' ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800'}`}>AED Manual</button>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2.5 flex-1 focus-within:border-amber-400 transition-colors">
                                {discountMode === 'percent' ? (
                                  <>
                                    <input type="number" min="0" max="100" step="0.5" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} placeholder="0" className="flex-1 outline-none text-lg font-black text-gray-900 bg-transparent w-full" />
                                    <span className="text-gray-400 font-black text-lg">%</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-gray-400 font-black text-sm">AED</span>
                                    <input type="number" min="0" step="0.01" value={discountManual} onChange={e => setDiscountManual(e.target.value)} placeholder="0.00" className="flex-1 outline-none text-lg font-black text-gray-900 bg-transparent w-full" />
                                  </>
                                )}
                              </div>
                              {discountValue > 0 && <div className="text-right shrink-0"><p className="text-[10px] font-black text-amber-600 uppercase">Saving</p><p className="text-base font-black text-amber-700">- AED {discountValue.toFixed(2)}</p></div>}
                            </div>
                            {/* Remarks */}
                            <input type="text" value={discountRemarks} onChange={e => setDiscountRemarks(e.target.value)} placeholder="Discount reason / remarks (optional)" className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-amber-400 placeholder:text-gray-300 transition-colors" />
                          </div>
                          <div className="flex justify-between items-center bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100">
                            <p className="text-gray-600 font-black">Final Invoice Total</p>
                            <p className="text-3xl font-black text-green-600">AED {finalTotal.toFixed(2)}</p>
                          </div>
                          <button onClick={handleGenerateAndSave} disabled={generating} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                            {generating ? <><Loader2 className="animate-spin" /> Processing & Uploading...</> : <><FileText size={18} /> Generate Official PDF Invoice</>}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
                        <FileText size={56} className="mb-2" />
                        <p className="text-lg font-black">No Draft Available</p>
                        <p className="text-sm font-bold">Select settings and fetch data to preview.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
              <motion.div key="monthly-history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                <div className="mb-6 relative max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" placeholder="Search by Company or Invoice ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full p-3.5 pl-12 bg-white rounded-2xl border-2 border-gray-100 outline-none focus:border-blue-500 font-bold text-gray-900 shadow-sm text-sm" />
                </div>
                <div className="space-y-8">
                  {groupedHistory.sortedDates.length === 0 ? (
                    <div className="text-center p-16 bg-white rounded-3xl border border-gray-100 text-gray-400 font-bold">No invoices found.</div>
                  ) : groupedHistory.sortedDates.map(dateStr => (
                    <div key={dateStr} className="space-y-3">
                      <h3 className="text-xs font-black text-gray-500 tracking-widest uppercase flex items-center gap-2 pl-1">
                        <Calendar size={14} /> {format(parseISO(dateStr), "dd MMM yyyy")}
                      </h3>
                      {/* History cards */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {groupedHistory.groups[dateStr].map((inv: any, idx: number) => (
                          <motion.div
                            key={inv.id}
                            initial={{ opacity: 0, y: 16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.22, delay: idx * 0.04 }}
                            className={`p-5 rounded-2xl border shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${inv.is_paid ? 'bg-white border-gray-100' : 'bg-amber-50/30 border-amber-200'}`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <FileText size={15} className="text-blue-600" />
                                  <span className="font-black text-gray-900">{inv.invoice_no}</span>
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border flex items-center gap-1 ${inv.is_paid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                                    {inv.is_paid ? <><CheckCircle2 size={11} /> Paid</> : <><AlertCircle size={11} /> Unpaid</>}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5"><Building2 size={12} className="text-gray-400" /> {inv.company_name}</p>
                                {inv.start_date && inv.end_date && (
                                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                                    {format(parseISO(inv.start_date), 'dd MMM')} – {format(parseISO(inv.end_date), 'dd MMM yyyy')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total</p>
                                {Number(inv.discount || 0) > 0 && (
                                  <p className="text-[9px] font-bold text-rose-400 flex items-center justify-end gap-1 mb-0.5">
                                    <span className="line-through text-gray-400">AED {Number(inv.subtotal || inv.total_amount).toFixed(2)}</span>
                                    <span className="bg-rose-50 border border-rose-200 text-rose-600 px-1 rounded font-black text-[8px]">-{Number(inv.discount).toFixed(2)}</span>
                                  </p>
                                )}
                                <p className="text-lg font-black text-green-600">AED {Number(inv.total_amount).toFixed(2)}</p>
                                {inv.discount_remarks && (
                                  <p className="text-[8px] font-bold text-gray-400 mt-0.5 max-w-[120px] text-right leading-tight">{inv.discount_remarks}</p>
                                )}
                              </div>
                            </div>
                            {/* Merged instant invoices list */}
                            {inv.instant_invoice_ids?.length > 0 && (
                              <div className="mb-3 bg-indigo-50/60 border border-indigo-100 rounded-xl p-3">
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1"><PackagePlus size={10} /> Instant POS Included</p>
                                <div className="space-y-1">
                                  {inv.instant_invoice_ids.map((iid: string) => {
                                    const instInv = allInstantInvoices.find((ii: any) => ii.id === iid);
                                    return (
                                      <div key={iid} className="flex items-center justify-between bg-white border border-indigo-100 rounded-lg px-2 py-1">
                                        <p className="text-[10px] font-bold text-indigo-700 truncate">{instInv?.invoice_no || iid.slice(0, 13) + '…'}</p>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                          {instInv?.total_amount != null && (
                                            <span className="text-[10px] font-black text-indigo-900">AED {Number(instInv.total_amount).toFixed(2)}</span>
                                          )}
                                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${inv.is_paid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {inv.is_paid ? 'Paid' : 'Merged'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                              {!inv.is_paid ? (
                                <button onClick={() => handleMarkMonthlyPaid(inv.id)} className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm active:scale-95" title="Mark as Paid"><CheckCircle2 size={17} /></button>
                              ) : (
                                <button onClick={() => handleMarkMonthlyUnpaid(inv.id)} className="p-2.5 bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white rounded-xl transition-colors border border-amber-200" title="Mark as Unpaid"><AlertCircle size={17} /></button>
                              )}
                              {!inv.is_paid && (
                                <button onClick={() => setDeleteTarget(inv)} className="p-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-colors" title="Delete"><Trash2 size={17} /></button>
                              )}
                              <a href={`/api/pdf/${encodeURIComponent(inv.invoice_no)}`} target="_blank" rel="noreferrer" className="p-2.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl transition-colors" title="View"><Eye size={17} /></a>
                              <a href={`/api/pdf/${encodeURIComponent(inv.invoice_no)}?dl=1`} download className="p-2.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-colors" title="Download"><Download size={17} /></a>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </>
        ) : (
          <InstantPOS 
            companies={companies} 
            activeTab={activeTab === 'generate' ? 'create' : 'history'}
            onTabChangeAction={(tab) => setActiveTab(tab === 'create' ? 'generate' : 'history')} 
          />
        )}
      </div>
    </div>
  );
}