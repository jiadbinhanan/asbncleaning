"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, UserCircle, Plus, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, ShoppingCart,
  Building2, Receipt, Download, Banknote, Loader2,
  ArrowRight, Tag, Eye, Layers, FileText, Search,
  Home, X, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { pdf } from "@react-pdf/renderer";
import { InstantInvoiceDocument } from "./InstantInvoiceDocument";
import { getInstantInvoiceUploadSignature, deleteInstantInvoice } from "./actions";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Company = { id: number; name: string };
type Unit = { id: number; unit_number: string; building_name: string | null };
type InventoryItem = { id: number; item_name: string; current_stock: number; base_price: number };

type InvoiceItem = {
  id: string;
  type: "inventory" | "custom";
  equipment_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

// Items keyed by unit id (0 = walk-in / no unit)
type ItemsByUnit = Record<number, InvoiceItem[]>;

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Modal
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
        <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 text-center mb-1">Delete this Invoice?</h2>
        <p className="text-sm font-bold text-gray-500 text-center mb-5">This action cannot be undone.</p>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5 space-y-2">
          <div className="flex justify-between"><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Invoice No</span><span className="text-sm font-black text-gray-900">{invoice.invoice_no}</span></div>
          <div className="flex justify-between"><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Customer</span><span className="text-sm font-bold text-gray-700">{invoice.client_type === "registered" ? invoice.companies?.name : invoice.customer_name}</span></div>
          <div className="flex justify-between"><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Amount</span><span className="text-sm font-black text-red-600">AED {Number(invoice.total_amount).toFixed(2)}</span></div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex gap-2">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-amber-800 leading-relaxed">The PDF will be permanently removed from cloud storage. Inventory stock deducted by this invoice will NOT be restored automatically.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl transition-all disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Deleting...</> : <><Trash2 size={15} /> Yes, Delete</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function InstantPOS({ 
  companies,
  activeTab: externalTab,
  onTabChangeAction
}: { 
  companies: Company[];
  activeTab?: "create" | "history";
  onTabChangeAction?: (tab: "create" | "history") => void;
}) {
  const supabase = createClient();

  // ── Tab & Loading ──────────────────────────────────────────────────────────
  const [internalTab, setInternalTab] = useState<"create" | "history">("create");
  const activeTab = externalTab || internalTab;

  const setActiveTab = (tab: "create" | "history") => {
    if (onTabChangeAction) onTabChangeAction(tab);
    else setInternalTab(tab);
  };

  const [loading, setLoading] = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // ── Invoice Header ─────────────────────────────────────────────────────────
  const [invoiceNo, setInvoiceNo] = useState("");
  const [clientType, setClientType] = useState<"registered" | "walk_in">("walk_in");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [walkInName, setWalkInName] = useState("");

  // ── Unit Selection (registered clients only) ───────────────────────────────
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);

  // ── Items per unit (unitId 0 = walk-in / no-unit mode) ────────────────────
  const [itemsByUnit, setItemsByUnit] = useState<ItemsByUnit>({ 0: [] });
  const [activeUnitTab, setActiveUnitTab] = useState<number>(0);

  // ── Bill Settings ──────────────────────────────────────────────────────────
  const [discount, setDiscount] = useState<number>(0);
  const [isPaid, setIsPaid] = useState<boolean>(false);

  // ── Save Progress ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState("");

  // ── Delete Modal ───────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── History Search ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Bank Details ───────────────────────────────────────────────────────────
  const [bankDetails, setBankDetails] = useState({
    bankName: "EMIRATES NBD",
    accountName: "BISHNU BAHADUR THAPA",
    accountNumber: "125937795501",
    iban: "AE83 0260 0001 2593 7795 501",
    swift: "EBILAEAD",
    routingNo: "302620000",
  });

  // ─────────────────────────────────────────────────────────────────────────
  const generateInvoiceNo = () => {
    setInvoiceNo(`BTM-INST-${format(new Date(), "ddMMyy-HHmm")}`);
  };

  useEffect(() => {
    generateInvoiceNo();
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase.from("equipment_master").select("id, item_name, current_stock, base_price").order("item_name");
    if (data) setInventory(data);
  };

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase.from("instant_invoices").select("*, companies(name)").order("created_at", { ascending: false });
    if (data) setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Fetch units when registered company changes ────────────────────────────
  useEffect(() => {
    if (clientType === "registered" && selectedCompanyId) {
      supabase
        .from("units")
        .select("id, unit_number, building_name")
        .eq("company_id", parseInt(selectedCompanyId))
        .order("unit_number")
        .then(({ data }) => {
          setUnits(data || []);
          setSelectedUnitIds([]);
          setItemsByUnit({ 0: [] });
          setActiveUnitTab(0);
        });
    } else {
      setUnits([]);
      setSelectedUnitIds([]);
      setItemsByUnit({ 0: [] });
      setActiveUnitTab(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, clientType]);

  // ── Toggle unit selection ──────────────────────────────────────────────────
  const toggleUnit = (unitId: number) => {
    setSelectedUnitIds((prev) => {
      if (prev.includes(unitId)) {
        // Remove unit — also remove its items
        const next = prev.filter((id) => id !== unitId);
        setItemsByUnit((ib) => {
          const updated = { ...ib };
          delete updated[unitId];
          return updated;
        });
        // Switch active tab to first remaining unit or 0
        if (activeUnitTab === unitId) setActiveUnitTab(next[0] ?? 0);
        return next;
      } else {
        const next = [...prev, unitId];
        setItemsByUnit((ib) => ({ ...ib, [unitId]: [] }));
        setActiveUnitTab(unitId);
        return next;
      }
    });
  };

  // ── Determine which unit id is "active" for item editing ──────────────────
  // Walk-in uses key 0; registered with units uses selectedUnitIds
  const activeKey: number = clientType === "registered" && selectedUnitIds.length > 0 ? activeUnitTab : 0;
  const currentItems: InvoiceItem[] = itemsByUnit[activeKey] ?? [];

  const setCurrentItems = (items: InvoiceItem[] | ((prev: InvoiceItem[]) => InvoiceItem[])) => {
    setItemsByUnit((prev) => ({
      ...prev,
      [activeKey]: typeof items === "function" ? items(prev[activeKey] ?? []) : items,
    }));
  };

  // ── Item handlers ──────────────────────────────────────────────────────────
  const handleAddItem = (type: "inventory" | "custom") => {
    setCurrentItems((prev) => [...prev, { id: crypto.randomUUID(), type, description: "", quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    setCurrentItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setCurrentItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        if (field === "equipment_id" && item.type === "inventory") {
          const eq = inventory.find((i) => i.id.toString() === value.toString());
          if (eq) { updated.description = eq.item_name; updated.unit_price = Number(eq.base_price || 0); }
        }

        if (field === "quantity" && item.type === "inventory" && updated.equipment_id) {
          const eq = inventory.find((i) => i.id.toString() === updated.equipment_id?.toString());
          if (eq && Number(value) > eq.current_stock) {
            toast.error(`Only ${eq.current_stock} left in stock!`);
            updated.quantity = eq.current_stock;
          }
        }

        if (field === "quantity" || field === "unit_price") {
          updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      })
    );
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  // Sum across ALL units
  const allItems: InvoiceItem[] = useMemo(
    () => Object.values(itemsByUnit).flat(),
    [itemsByUnit]
  );
  const subtotal = useMemo(() => allItems.reduce((s, i) => s + i.total_price, 0), [allItems]);
  const totalAmount = subtotal - (Number(discount) || 0);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (allItems.length === 0) { toast.error("Please add at least one item."); return false; }
    if (allItems.some((i) => !i.description?.trim())) { toast.error("All items must have a description."); return false; }
    if (clientType === "registered" && !selectedCompanyId) { toast.error("Select a registered client."); return false; }
    if (clientType === "registered" && selectedUnitIds.length === 0) { toast.error("Select at least one unit."); return false; }
    if (clientType === "walk_in" && !walkInName.trim()) { toast.error("Enter customer name."); return false; }
    return true;
  };

  // ── Generate Invoice ───────────────────────────────────────────────────────
  const handleGenerateInvoice = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      setSaveProgress("Saving invoice to database...");

      // Build items payload — attach unit info for registered clients
      const itemsPayload = clientType === "registered" && selectedUnitIds.length > 0
        ? selectedUnitIds.flatMap((uid) =>
            (itemsByUnit[uid] || []).map((item) => {
              const unit = units.find((u) => u.id === uid);
              return {
                ...item,
                unit_id: uid,
                unit_label: unit ? `Unit ${unit.unit_number}${unit.building_name ? ` – ${unit.building_name}` : ""}` : `Unit ${uid}`,
              };
            })
          )
        : allItems;

      const customerDispName =
        clientType === "registered"
          ? companies.find((c) => c.id === parseInt(selectedCompanyId))?.name
          : walkInName;

      const payload = {
        invoice_no: invoiceNo,
        client_type: clientType,
        company_id: clientType === "registered" ? parseInt(selectedCompanyId) : null,
        customer_name: clientType === "walk_in" ? walkInName : null,
        items: itemsPayload,
        subtotal,
        discount: Number(discount) || 0,
        total_amount: totalAmount,
        is_paid: isPaid,
        merged_into_monthly: false,
      };

      const { data: invoiceDataDB, error } = await supabase.from("instant_invoices").insert([payload]).select().single();
      if (error) throw new Error("Database Save Error: " + error.message);

      setSaveProgress("Updating inventory ledger...");

      for (const item of allItems) {
        if (item.type === "inventory" && item.equipment_id) {
          const eq = inventory.find((i) => i.id.toString() === item.equipment_id?.toString());
          if (eq) {
            const newQty = eq.current_stock - item.quantity;
            const { error: eqErr } = await supabase.from("equipment_master").update({ current_stock: newQty }).eq("id", eq.id);
            if (eqErr) throw new Error(`Stock Update Failed: ${eqErr.message}`);
            const { error: ledgerErr } = await supabase.from("inventory_transaction_logs").insert([{
              equipment_id: eq.id,
              transaction_type: "out",
              quantity: item.quantity,
              reference_type: "sold",
              balance_after: newQty,
              remarks: `Sold via Instant POS (Invoice: ${invoiceNo})`,
            }]);
            if (ledgerErr) throw new Error(`Ledger Update Failed: ${ledgerErr.message}`);
          }
        }
      }

      setSaveProgress("Generating PDF document...");

      const invoiceData = {
        invoiceNo,
        date: new Date().toISOString(),
        customerName: customerDispName || "Walk-In Customer",
        // Pass grouped unit items for PDF rendering
        unitGroups: clientType === "registered" && selectedUnitIds.length > 0
          ? selectedUnitIds.map((uid) => {
              const unit = units.find((u) => u.id === uid)!;
              return {
                unitLabel: `Unit ${unit.unit_number}${unit.building_name ? ` – ${unit.building_name}` : ""}`,
                items: itemsByUnit[uid] || [],
              };
            })
          : [{ unitLabel: null, items: allItems }],
        subtotal,
        discountPercent: discount > 0 && subtotal > 0 ? Number(((discount / subtotal) * 100).toFixed(1)) : 0,
        discountValue: Number(discount) || 0,
        finalTotal: totalAmount,
        bankDetails,
      };

      const blob = await pdf(<InstantInvoiceDocument data={invoiceData} />).toBlob();
      const file = new File([blob], `${invoiceNo.replace(/\//g, "-")}.pdf`, { type: "application/pdf" });

      setSaveProgress("Uploading to secure cloud...");

      const { signature, timestamp, apiKey, cloudName, folderPath } =
        await getInstantInvoiceUploadSignature(customerDispName || "WalkIn", invoiceNo);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey!);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folderPath);
      formData.append("public_id", invoiceNo.replace(/\//g, "-"));

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(`Cloud Upload Failed: ${uploadData.error?.message || "Unknown"}`);

      if (uploadData.secure_url) {
        await supabase.from("instant_invoices").update({ pdf_url: uploadData.secure_url }).eq("id", invoiceDataDB.id);
      }

      toast.success("Instant Invoice Recorded & PDF Generated!", { duration: 4000 });

      // Reset form
      setItemsByUnit({ 0: [] });
      setSelectedUnitIds([]);
      setActiveUnitTab(0);
      setDiscount(0);
      setIsPaid(false);
      generateInvoiceNo();
      if (clientType === "walk_in") setWalkInName("");
      fetchInventory();
      setActiveTab("history"); // Navigate to history using parent prop action
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.", { duration: 5000 });
    } finally {
      setSaving(false);
      setSaveProgress("");
    }
  };

  // ── Mark as Paid ───────────────────────────────────────────────────────────
  const handleMarkAsPaid = async (id: string) => {
    const { error } = await supabase.from("instant_invoices").update({ is_paid: true }).eq("id", id);
    if (!error) { toast.success("Invoice marked as Paid!"); setHistory((prev) => prev.map((inv) => inv.id === id ? { ...inv, is_paid: true } : inv)); }
    else toast.error("Failed to update status.");
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteInstantInvoice(deleteTarget.id);
      if (!result.success) { toast.error(result.error || "Delete failed."); return; }
      setHistory((prev) => prev.filter((inv) => inv.id !== deleteTarget.id));
      toast.success("Invoice deleted.");
      setDeleteTarget(null);
    } catch (err: any) { toast.error("Error: " + err.message); }
    finally { setDeleting(false); }
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async (url: string, filename: string) => {
    try {
      const blob = await (await fetch(url)).blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch { window.open(url, "_blank"); }
  };

  // ── Filtered History ───────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    if (!searchQuery) return history;
    const q = searchQuery.toLowerCase();
    return history.filter((inv: any) => {
      const name = inv.client_type === "registered" ? inv.companies?.name : inv.customer_name;
      return inv.invoice_no?.toLowerCase().includes(q) || name?.toLowerCase().includes(q) ||
        inv.total_amount?.toString().includes(q) || format(new Date(inv.created_at), "dd MMM yyyy").toLowerCase().includes(q);
    });
  }, [history, searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Registered client has units selected?
  const hasUnitMode = clientType === "registered" && selectedUnitIds.length > 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            invoice={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => !deleting && setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      {/* ── CREATE TAB ── */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* ── LEFT COLUMN: Bill Builder ── xl:col-span-9 */}
          <div className="xl:col-span-9 space-y-5">

            {/* ── Invoice header card ── */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-6">

                {/* Invoice number */}
                <div className="shrink-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Invoice Number</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 tracking-wider">{invoiceNo}</span>
                    <button onClick={generateInvoiceNo} className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl border border-gray-100 transition-colors" title="Refresh">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>

                {/* Client type + selection */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Customer</p>
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 mb-3 max-w-xs">
                    <button type="button" onClick={() => { setClientType("walk_in"); setSelectedCompanyId(""); }} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${clientType === "walk_in" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Walk-in / Cash</button>
                    <button type="button" onClick={() => setClientType("registered")} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${clientType === "registered" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Registered Client</button>
                  </div>

                  {clientType === "walk_in" ? (
                    <div className="relative max-w-sm">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input type="text" placeholder="Enter customer name..." value={walkInName} onChange={(e) => setWalkInName(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 text-sm font-black text-gray-900 shadow-sm" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 w-full">
                      {/* Company selector */}
                      <div className="relative w-full max-w-sm">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 text-sm font-black text-gray-900 appearance-none cursor-pointer shadow-sm">
                          <option value="">Select Company...</option>
                          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>

                      {/* Unit chips — shown after company selected */}
                      {selectedCompanyId && units.length > 0 && (
                        <div className="w-full">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Units</p>
                          <div className="flex flex-wrap gap-2">
                            {units.map((unit) => {
                              const selected = selectedUnitIds.includes(unit.id);
                              return (
                                <button
                                  key={unit.id}
                                  type="button"
                                  onClick={() => toggleUnit(unit.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${selected ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300"}`}
                                >
                                  <Home size={11} />
                                  Unit {unit.unit_number}
                                  {unit.building_name && <span className="opacity-70">· {unit.building_name}</span>}
                                  {selected && <X size={11} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedCompanyId && units.length === 0 && (
                        <p className="text-xs font-bold text-gray-400 self-center">No units found for this company.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Items section ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Unit tabs (registered + units selected) */}
              {hasUnitMode && (
                <div className="flex gap-1 p-3 bg-gray-50 border-b border-gray-100 overflow-x-auto">
                  {selectedUnitIds.map((uid) => {
                    const unit = units.find((u) => u.id === uid)!;
                    const unitItemCount = (itemsByUnit[uid] || []).length;
                    return (
                      <button
                        key={uid}
                        onClick={() => setActiveUnitTab(uid)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${activeUnitTab === uid ? "bg-indigo-600 text-white border-indigo-600 shadow" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}
                      >
                        <Home size={12} /> Unit {unit.unit_number}
                        {unitItemCount > 0 && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-black ${activeUnitTab === uid ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                            {unitItemCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Items toolbar */}
              <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/40">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-indigo-600" />
                  {hasUnitMode
                    ? `Items for Unit ${units.find((u) => u.id === activeUnitTab)?.unit_number ?? "—"}`
                    : "Items & Services"}
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => handleAddItem("inventory")} className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 border border-indigo-200">
                    <Layers size={14} /> Stock Item
                  </button>
                  <button onClick={() => handleAddItem("custom")} className="px-3 py-2 bg-gray-900 text-white hover:bg-black rounded-xl text-xs font-black transition-colors flex items-center gap-1.5">
                    <Plus size={14} /> Custom Service
                  </button>
                </div>
              </div>

              {/* Disabled state when registered but no unit selected */}
              {clientType === "registered" && selectedCompanyId && selectedUnitIds.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <Home size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-500">Select at least one unit above to start adding items.</p>
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  {currentItems.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                      <Store size={40} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-bold text-gray-500">No items yet. Add a stock item or custom service.</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {currentItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-wrap xl:flex-nowrap items-end gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 group hover:border-indigo-200 hover:shadow-sm transition-all"
                        >
                          {/* Description */}
                          <div className="w-full xl:flex-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                              {item.type === "inventory" ? <><Layers size={9} /> Inventory Product</> : <><Tag size={9} /> Custom Description</>}
                            </label>
                            {item.type === "inventory" ? (
                              <select value={item.equipment_id || ""} onChange={(e) => handleItemChange(item.id, "equipment_id", e.target.value)}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-indigo-400 cursor-pointer">
                                <option value="">Select Product...</option>
                                {inventory.map((inv) => (
                                  <option key={inv.id} value={inv.id} disabled={inv.current_stock <= 0}>
                                    {inv.item_name} ({inv.current_stock > 0 ? `${inv.current_stock} left` : "Out of Stock"})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input type="text" placeholder="e.g. Sofa Deep Cleaning" value={item.description} onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-indigo-400" />
                            )}
                          </div>
                          {/* Qty */}
                          <div className="w-24 shrink-0">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Qty</label>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-indigo-400 text-center" />
                          </div>
                          {/* Rate */}
                          <div className="w-32 shrink-0">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Rate (AED)</label>
                            <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => handleItemChange(item.id, "unit_price", e.target.value)}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-indigo-400 text-right" />
                          </div>
                          {/* Total */}
                          <div className="w-28 shrink-0 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-right">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 block">Total</label>
                            <p className="text-sm font-black text-indigo-700">{item.total_price.toFixed(2)}</p>
                          </div>
                          {/* Remove */}
                          <button onClick={() => handleRemoveItem(item.id)}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 xl:opacity-0 xl:group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              )}

              {/* Per-unit subtotals (if multi-unit mode) */}
              {hasUnitMode && selectedUnitIds.some((uid) => (itemsByUnit[uid] || []).length > 0) && (
                <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {selectedUnitIds.map((uid) => {
                    const unit = units.find((u) => u.id === uid)!;
                    const unitTotal = (itemsByUnit[uid] || []).reduce((s, i) => s + i.total_price, 0);
                    if (unitTotal === 0) return null;
                    return (
                      <div key={uid} className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex justify-between items-center">
                        <span className="text-xs font-black text-indigo-700">Unit {unit.unit_number}</span>
                        <span className="text-sm font-black text-indigo-900">AED {unitTotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Summary + Bank ── xl:col-span-3 */}
          <div className="xl:col-span-3 space-y-5">

            {/* Bill Summary */}
            <div className="bg-gray-900 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl" />
              <h3 className="text-lg font-black flex items-center gap-2 mb-5">
                <Receipt size={18} className="text-indigo-400" /> Bill Summary
              </h3>
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-bold text-white">AED {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Discount (AED)</span>
                  <input type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-right text-white font-black outline-none focus:border-indigo-400" />
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between items-end bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Net Total</span>
                  <span className="text-2xl font-black text-emerald-400">AED {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <label className="flex items-center gap-3 p-3.5 bg-white/10 border border-white/20 rounded-xl cursor-pointer hover:bg-white/20 transition-colors mb-5">
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="hidden" />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isPaid ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-400 text-transparent"}`}>
                  <CheckCircle2 size={13} strokeWidth={3} />
                </div>
                <div className="select-none">
                  <p className="text-sm font-black text-white leading-none">Payment Received</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Mark as paid instantly</p>
                </div>
              </label>

              <button onClick={handleGenerateInvoice} disabled={saving}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 text-sm">
                {saving
                  ? <><Loader2 size={16} className="animate-spin" /><span>{saveProgress}</span></>
                  : <><ArrowRight size={16} /> Generate Bill & PDF</>
                }
              </button>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-xs font-black text-gray-800 flex items-center gap-2 mb-4 uppercase tracking-widest">
                <Banknote size={14} className="text-indigo-600" /> Bank Details
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "Bank Name", key: "bankName" },
                  { label: "Account Name", key: "accountName" },
                  { label: "Account Number", key: "accountNumber" },
                  { label: "IBAN", key: "iban" },
                  { label: "SWIFT Code", key: "swift" },
                  { label: "Routing No", key: "routingNo" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">{label}</label>
                    <input type="text" value={(bankDetails as any)[key]} onChange={(e) => setBankDetails({ ...bankDetails, [key]: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-900 outline-none focus:border-indigo-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === "history" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Instant POS History</h2>
              <p className="text-sm font-bold text-gray-500 mt-1">View past bills, download PDFs, and manage payments.</p>
            </div>
            <div className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-black text-sm border border-indigo-100 flex items-center gap-2">
              <FileText size={16} /> {filteredHistory.length} Bills Total
            </div>
          </div>

          <div className="mb-6 relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search by Invoice No, Customer, Amount or Date..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3.5 pl-12 bg-white rounded-2xl border-2 border-gray-100 outline-none focus:border-indigo-500 font-bold text-gray-900 shadow-sm text-sm" />
          </div>

          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 size={36} className="animate-spin text-indigo-600" /></div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
              <Receipt size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-black text-gray-800">No instant bills found.</p>
              <p className="text-sm text-gray-500 mt-1">Generate a quick bill to see it here.</p>
            </div>
          ) : (
            /* Wide monitor: 2 cols lg, 3 cols xl, 4 cols 2xl */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredHistory.map((inv: any) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-2xl border p-5 flex flex-col transition-all hover:shadow-lg ${inv.is_paid ? "border-gray-200 bg-white" : "border-amber-200 bg-amber-50/40"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                      {format(new Date(inv.created_at), "dd MMM yyyy")}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border flex items-center gap-1 ${inv.is_paid ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
                      {inv.is_paid ? <><CheckCircle2 size={12} /> Paid</> : <><AlertCircle size={12} /> Unpaid</>}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-gray-900 mb-0.5">{inv.invoice_no}</h4>
                  <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-4">
                    {inv.client_type === "registered" ? <Building2 size={13} className="text-blue-500" /> : <UserCircle size={13} className="text-orange-500" />}
                    {inv.client_type === "registered" ? inv.companies?.name : inv.customer_name}
                  </p>

                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Net Total</p>
                      <p className="text-xl font-black text-indigo-700">AED {Number(inv.total_amount).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!inv.is_paid && (
                        <button onClick={() => handleMarkAsPaid(inv.id)} className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm active:scale-95" title="Mark as Paid">
                          <CheckCircle2 size={17} />
                        </button>
                      )}
                      {/* Delete — unpaid only */}
                      {!inv.is_paid && (
                        <button onClick={() => setDeleteTarget(inv)} className="p-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-colors" title="Delete">
                          <Trash2 size={17} />
                        </button>
                      )}
                      {inv.pdf_url ? (
                        <>
                          <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="p-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-colors" title="View PDF">
                            <Eye size={17} />
                          </a>
                          <button onClick={() => handleDownload(inv.pdf_url, `${inv.invoice_no.replace(/\//g, "-")}.pdf`)}
                            className="p-2.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-all shadow-sm" title="Download PDF">
                            <Download size={17} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => toast("PDF not available for old drafts.", { icon: "📄" })}
                          className="px-3 py-2.5 bg-gray-900 text-white text-xs font-black rounded-xl">
                          No PDF
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}