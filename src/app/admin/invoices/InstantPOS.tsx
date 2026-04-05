"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store, UserCircle, Plus, Trash2, RefreshCw, 
  CheckCircle2, AlertCircle, ShoppingCart, 
  Building2, Receipt, Download, Banknote, Loader2, 
  ArrowRight, Tag, Eye, Layers
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

type Company = { id: number; name: string };
type InventoryItem = { id: number; item_name: string; total_quantity: number };
type InvoiceItem = {
  id: string;
  type: "inventory" | "custom";
  equipment_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export default function InstantPOS({ companies }: { companies: Company[] }) {
  const supabase = createClient();

  // ─── States ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Create Bill States
  const [invoiceNo, setInvoiceNo] = useState("");
  const [clientType, setClientType] = useState<"registered" | "walk_in">("walk_in");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [walkInName, setWalkInName] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [isPaid, setIsPaid] = useState<boolean>(true); // Default true
  const [saving, setSaving] = useState(false);

  // Bank Details States (Editable for PDF)
  const [bankDetails, setBankDetails] = useState({
    bankName: "Emirates NBD",
    accountName: "BTM Cleaning Services LLC",
    accountNumber: "1012345678901",
    iban: "AE12026000012345678901"
  });

  // ─── Initialization ─────────────────────────────────────────────────────
  const generateInvoiceNo = () => {
    const formatted = format(new Date(), "ddMMyy-HHmm");
    setInvoiceNo(`BTM-INST-${formatted}`);
  };

  useEffect(() => {
    generateInvoiceNo();
    fetchInventory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase.from('equipment_master').select('id, item_name, total_quantity').order('item_name');
    if (data) setInventory(data);
  };

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('instant_invoices')
      .select('*, companies(name)')
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Items Logic ────────────────────────────────────────────────────────
  const handleAddItem = (type: "inventory" | "custom") => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), type, description: "", quantity: 1, unit_price: 0, total_price: 0 }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // Auto-fill description for inventory
        if (field === 'equipment_id' && item.type === 'inventory') {
          const eq = inventory.find(inv => inv.id === Number(value));
          if (eq) updatedItem.description = eq.item_name;
        }

        // Validate stock quantity
        if (field === 'quantity' && item.type === 'inventory' && updatedItem.equipment_id) {
          const eq = inventory.find(inv => inv.id === Number(updatedItem.equipment_id));
          if (eq && value > eq.total_quantity) {
            toast.error(`Only ${eq.total_quantity} left in stock!`);
            updatedItem.quantity = eq.total_quantity;
          }
        }

        // Auto calculate total
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total_price = Number(updatedItem.quantity) * Number(updatedItem.unit_price);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // ─── Calculations ───────────────────────────────────────────────────────
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total_price, 0), [items]);
  const totalAmount = subtotal - (Number(discount) || 0);

  // ─── Submission ─────────────────────────────────────────────────────────
  const handleGenerateInvoice = async () => {
    if (items.length === 0) return toast.error("Please add at least one item.");
    if (clientType === 'registered' && !selectedCompanyId) return toast.error("Select a registered client.");
    if (clientType === 'walk_in' && !walkInName.trim()) return toast.error("Enter customer name.");

    setSaving(true);

    try {
      // 1. Deduct Inventory Stock immediately
      for (const item of items) {
        if (item.type === 'inventory' && item.equipment_id) {
          const eq = inventory.find(i => i.id === item.equipment_id);
          if (eq) {
            const newQty = eq.total_quantity - item.quantity;
            await supabase.from('equipment_master').update({ total_quantity: newQty }).eq('id', item.equipment_id);
          }
        }
      }

      // 2. Insert into Database (JSON items)
      const payload = {
        invoice_no: invoiceNo,
        client_type: clientType,
        company_id: clientType === 'registered' ? parseInt(selectedCompanyId) : null,
        customer_name: clientType === 'walk_in' ? walkInName : null,
        items: items, // Supabase automatically converts JS array to JSONB
        subtotal: subtotal,
        discount: Number(discount) || 0,
        total_amount: totalAmount,
        is_paid: isPaid,
        // pdf_url: null -> Will be updated in the next step when PDF is integrated
      };

      const { data, error } = await supabase.from('instant_invoices').insert([payload]).select().single();
      if (error) throw error;

      toast.success("Instant Invoice Recorded Successfully!");

      // 🚨 TODO: Trigger PDF Generation here using 'data' and 'bankDetails'
      // Example: const pdfUrl = await generateInstantPDF(data, bankDetails);
      // await supabase.from('instant_invoices').update({ pdf_url: pdfUrl }).eq('id', data.id);

      // Reset Form
      setItems([]);
      setDiscount(0);
      generateInvoiceNo();
      if (clientType === 'walk_in') setWalkInName("");
      fetchInventory(); // Refresh stock to get latest quantities

    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Mark as Paid Logic ─────────────────────────────────────────────────
  const handleMarkAsPaid = async (id: string) => {
    const { error } = await supabase.from('instant_invoices').update({ is_paid: true }).eq('id', id);
    if (!error) {
      toast.success("Invoice marked as Paid!");
      setHistory(prev => prev.map(inv => inv.id === id ? { ...inv, is_paid: true } : inv));
    } else {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ─── TABS ─── */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 mb-8 max-w-md mx-auto">
        <button 
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'create' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <ShoppingCart size={18}/> New Bill
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Receipt size={18}/> Bill History
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ─── LEFT: BILLING FORM ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Invoice Meta */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Invoice Number</p>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 tracking-wider">
                    {invoiceNo}
                  </span>
                  <button onClick={generateInvoiceNo} className="p-2.5 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl border border-gray-100 transition-colors" title="Refresh Number">
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 max-w-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Customer Details</p>
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 mb-3">
                  <button type="button" onClick={() => setClientType('walk_in')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${clientType === 'walk_in' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Walk-in / Cash</button>
                  <button type="button" onClick={() => setClientType('registered')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${clientType === 'registered' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Registered Client</button>
                </div>

                {clientType === 'walk_in' ? (
                  <div className="relative">
                    <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input 
                      type="text" placeholder="Enter customer name..." 
                      value={walkInName} onChange={(e) => setWalkInName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 text-sm font-bold shadow-sm transition-all"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <select 
                      value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 text-sm font-bold appearance-none cursor-pointer shadow-sm transition-all"
                    >
                      <option value="">Select Registered Company...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <ShoppingCart size={22} className="text-indigo-600"/> Items & Services
                </h3>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button onClick={() => handleAddItem('inventory')} className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 border border-indigo-200">
                    <Layers size={16}/> Stock Item
                  </button>
                  <button onClick={() => handleAddItem('custom')} className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-900 text-white hover:bg-black rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                    <Plus size={16}/> Custom Service
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-4 bg-white">
                {items.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[1.5rem]">
                    <Store size={48} className="mx-auto text-gray-300 mb-3"/>
                    <p className="text-base font-bold text-gray-500">No items added to the bill yet.</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">Select "Stock Item" or "Custom Service" to begin.</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {items.map((item) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        key={item.id} 
                        className="flex flex-wrap md:flex-nowrap items-end gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-200 relative group transition-all hover:border-indigo-200 hover:shadow-sm"
                      >
                        <div className="w-full md:flex-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            {item.type === 'inventory' ? <><Layers size={10}/> Inventory Product</> : <><Tag size={10}/> Custom Description</>}
                          </label>
                          {item.type === 'inventory' ? (
                            <select 
                              value={item.equipment_id || ""}
                              onChange={(e) => handleItemChange(item.id, 'equipment_id', e.target.value)}
                              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
                            >
                              <option value="">Select Product...</option>
                              {inventory.map(inv => (
                                <option key={inv.id} value={inv.id} disabled={inv.total_quantity <= 0}>
                                  {inv.item_name} ({inv.total_quantity > 0 ? `${inv.total_quantity} left` : 'Out of Stock'})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input 
                              type="text" placeholder="e.g. Sofa Deep Cleaning"
                              value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 shadow-sm"
                            />
                          )}
                        </div>

                        <div className="w-24">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Qty</label>
                          <input 
                            type="number" min="1"
                            value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 text-center shadow-sm"
                          />
                        </div>

                        <div className="w-32">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Rate (AED)</label>
                          <input 
                            type="number" min="0" step="0.01"
                            value={item.unit_price} onChange={(e) => handleItemChange(item.id, 'unit_price', e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 text-right shadow-sm"
                          />
                        </div>

                        <div className="w-32 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-right shrink-0">
                          <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 block">Total</label>
                          <p className="text-sm font-black text-indigo-700">{item.total_price.toFixed(2)}</p>
                        </div>

                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: SUMMARY & SETTINGS ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Billing Summary */}
            <div className="bg-gray-900 rounded-[2rem] p-6 md:p-8 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
              <h3 className="text-xl font-black flex items-center gap-2 mb-6">
                <Receipt size={22} className="text-indigo-400"/> Bill Summary
              </h3>

              <div className="space-y-4 mb-8 text-sm font-medium">
                <div className="flex justify-between items-center text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-bold text-white">AED {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Discount (AED)</span>
                  <input 
                    type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-right text-white font-bold outline-none focus:border-indigo-400 transition-all"
                  />
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-end bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Net Total</span>
                  <span className="text-3xl font-black text-emerald-400">AED {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Checkbox */}
              <label className="flex items-center gap-3 p-4 bg-white/10 border border-white/20 rounded-xl cursor-pointer hover:bg-white/20 transition-colors group mb-6">
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isPaid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-400 text-transparent'}`}>
                  <CheckCircle2 size={16} strokeWidth={3}/>
                </div>
                <div className="select-none">
                  <p className="text-sm font-black text-white leading-none">Payment Received</p>
                  <p className="text-[10px] font-medium text-gray-400 mt-1">Mark this bill as paid instantly</p>
                </div>
              </label>

              <button 
                onClick={handleGenerateInvoice} disabled={saving}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
              >
                {saving ? <Loader2 size={18} className="animate-spin"/> : <ArrowRight size={18}/>}
                Generate Bill & PDF
              </button>
            </div>

            {/* Editable Bank Details */}
            <div className="bg-white rounded-[2rem] border border-gray-200 p-6 md:p-8 shadow-sm">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-5 uppercase tracking-widest">
                <Banknote size={16} className="text-indigo-600"/> Bank Details (For PDF)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Bank Name</label>
                  <input type="text" value={bankDetails.bankName} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Account Name</label>
                  <input type="text" value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Account Number</label>
                  <input type="text" value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">IBAN</label>
                  <input type="text" value={bankDetails.iban} onChange={e => setBankDetails({...bankDetails, iban: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all" />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── HISTORY TAB ─── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Instant POS History</h2>
              <p className="text-sm font-bold text-gray-500 mt-1">View past bills, download PDFs, and mark pending payments.</p>
            </div>
            <div className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-black text-sm border border-indigo-100 flex items-center gap-2 shadow-sm">
              <FileText size={18}/> {history.length} Bills Total
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 size={40} className="animate-spin text-indigo-600"/></div>
          ) : history.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-[2rem]">
              <Receipt size={56} className="mx-auto text-gray-300 mb-4"/>
              <p className="text-xl font-black text-gray-800">No instant bills found.</p>
              <p className="text-sm font-medium text-gray-500 mt-1">Generate a quick bill to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map((inv) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  key={inv.id} 
                  className={`rounded-3xl border p-6 flex flex-col transition-all hover:shadow-xl group ${inv.is_paid ? 'border-gray-200 bg-white hover:border-indigo-200' : 'border-amber-200 bg-amber-50/40 hover:border-amber-300'}`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
                      {format(new Date(inv.created_at), 'dd MMM yyyy')}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 ${inv.is_paid ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'}`}>
                      {inv.is_paid ? <><CheckCircle2 size={14}/> Paid</> : <><AlertCircle size={14}/> Unpaid Due</>}
                    </span>
                  </div>

                  <h4 className="text-xl font-black text-gray-900 mb-1">{inv.invoice_no}</h4>
                  <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 mb-6">
                    {inv.client_type === 'registered' ? <Building2 size={16} className="text-blue-500"/> : <UserCircle size={16} className="text-orange-500"/>} 
                    {inv.client_type === 'registered' ? inv.companies?.name : inv.customer_name}
                  </p>

                  <div className="mt-auto pt-5 border-t border-gray-100 flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Net Total</p>
                      <p className="text-2xl font-black text-indigo-700">AED {Number(inv.total_amount).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Payment Checkbox from History */}
                      {!inv.is_paid && (
                        <button 
                          onClick={() => handleMarkAsPaid(inv.id)}
                          className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-md active:scale-95" title="Mark as Paid"
                        >
                          <CheckCircle2 size={20}/>
                        </button>
                      )}

                      {/* PDF Action Buttons */}
                      {inv.pdf_url ? (
                        <>
                          <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors border border-indigo-200" title="View PDF">
                            <Eye size={20}/>
                          </a>
                          <button className="p-3 bg-gray-900 hover:bg-black text-white rounded-xl transition-all shadow-md" title="Download PDF">
                            <Download size={20}/>
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => toast('PDF Generation Coming Soon!', { icon: '📄' })}
                          className="px-4 py-3 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all shadow-md"
                        >
                          Generate PDF
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