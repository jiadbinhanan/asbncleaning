"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, History, User, DollarSign,
  ArrowLeft, Search, Calendar, ExternalLink, Building2, RefreshCw,
  ChevronDown, AlertCircle, LayoutTemplate, Trash2, RotateCw,
} from "lucide-react";
import DotsLoader from "@/components/common/DotsLoader";
import { TableSkeleton } from "@/components/common/Skeleton";
import Kbd from "@/components/common/Kbd";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { format } from "date-fns";
import { QuotationDocument } from "@/components/admin/quotations/QuotationDocument";
import type { TemplateSection } from "@/components/admin/quotations/QuotationDocument";
import TemplateBuilder from "@/components/admin/quotations/TemplateBuilder";
import { getQuotationUploadSignature, saveQuotationRecord, deleteQuotationRecord } from "./actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Quotation = {
  id: string;
  quote_no: string;
  company_name: string;
  quote_date: string;
  pdf_url: string;
  created_at: string;
};

type Template = {
  id: string;
  name: string;
  is_default: boolean;
  sections: TemplateSection[];
};

type ActiveView = "generator" | "history" | "templates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cloneSections = (sections: TemplateSection[]): TemplateSection[] =>
  sections.map((sec) => ({
    ...sec,
    columns: sec.columns.map((c) => ({ ...c })),
    rows: sec.rows.map((row) => [...row]),
  }));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuotationManager() {
  const supabase = createClient();
  const [activeView, setActiveView] = useState<ActiveView>("generator");
  const [isMounted, setIsMounted] = useState(false);

  // --- Template states ---
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateError, setTemplateError] = useState("");

  // --- Generator states ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [quoteNo, setQuoteNo] = useState("");
  const [date, setDate] = useState("");
  const [customerName, setCustomerName] = useState("Valued Customer");
  const [editableSections, setEditableSections] = useState<TemplateSection[]>([]);

  // --- History states ---
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null);

  // ── Auto-generate Quote ID ──────────────────────────────────────────────
  const generateQuoteNo = () => {
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    setQuoteNo(`BTM/QUOT-Q${yy}${mm}-${random}`);
  };

  // ── Fetch templates ─────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setTemplateError("");
    const { data, error } = await supabase
      .from("quotation_templates")
      .select("id, name, is_default, sections")
      .order("created_at", { ascending: true });

    if (error || !data) {
      setTemplateError("Failed to load templates. Please refresh.");
      setLoadingTemplates(false);
      return;
    }

    setTemplates(data as Template[]);
    const def = (data as Template[]).find((t) => t.is_default) ?? data[0];
    if (def) {
      setSelectedTemplateId(def.id);
      setEditableSections(cloneSections(def.sections));
    }
    setLoadingTemplates(false);
  }, [supabase]);

  // ── Template dropdown change ────────────────────────────────────────────
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) setEditableSections(cloneSections(tpl.sections));
  };

  // ── Edit a cell (DB untouched) ──────────────────────────────────────────
  const handleCellEdit = (sectionIdx: number, rowIdx: number, colIdx: number, value: string) => {
    setEditableSections((prev) =>
      prev.map((sec, si) => {
        if (si !== sectionIdx) return sec;
        return {
          ...sec,
          rows: sec.rows.map((row, ri) => {
            if (ri !== rowIdx) return row;
            const nr = [...row];
            nr[colIdx] = value;
            return nr;
          }),
        };
      })
    );
  };

  // ── Reset section to template original ─────────────────────────────────
  const handleResetSection = (sectionIdx: number) => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    setEditableSections((prev) =>
      prev.map((sec, si) =>
        si !== sectionIdx
          ? sec
          : { ...tpl.sections[sectionIdx], rows: tpl.sections[sectionIdx].rows.map((r) => [...r]) }
      )
    );
  };

  // ── Fetch history ───────────────────────────────────────────────────────
  const fetchQuotations = useCallback(async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("quotations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error && data) setQuotations(data);
    setLoadingHistory(false);
    setHistoryFetched(true);
  }, [supabase]);

  // ── Delete quotation (Cloudinary + Supabase) ──────────────────────────
  const handleDeleteQuotation = async (quote: Quotation) => {
    if (!confirm(`Delete quotation "${quote.quote_no}"? This cannot be undone.`)) return;
    setDeletingQuoteId(quote.id);
    const res = await deleteQuotationRecord({ id: quote.id, pdf_url: quote.pdf_url });
    setDeletingQuoteId(null);
    if (!res.success) {
      alert("Delete failed: " + res.error);
      return;
    }
    setQuotations((prev) => prev.filter((q) => q.id !== quote.id));
  };

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    generateQuoteNo();
    setDate(new Date().toISOString().split("T")[0]);
    fetchTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeView === "history" && !historyFetched) fetchQuotations();
  }, [activeView, historyFetched, fetchQuotations]);

  // When coming back from templates tab, re-fetch in case a new default was set
  useEffect(() => {
    if (activeView === "generator") fetchTemplates();
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered history ────────────────────────────────────────────────────
  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quote_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter ? q.quote_date === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  // ── Save & Download ─────────────────────────────────────────────────────
  const handleSaveAndDownload = async () => {
    if (!customerName.trim()) return alert("Please enter Customer Name.");
    if (editableSections.length === 0) return alert("No template loaded.");
    setIsGenerating(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <QuotationDocument
          quoteNo={quoteNo}
          date={date}
          customerName={customerName}
          sections={editableSections}
        />
      ).toBlob();
      const pdfFile = new File([blob], `${quoteNo}.pdf`, { type: "application/pdf" });

      const { signature, timestamp, apiKey, cloudName } = await getQuotationUploadSignature();
      if (!cloudName) throw new Error("Missing Cloudinary Details in .env.local");

      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("api_key", apiKey!);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", "quotations");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: "POST", body: formData }
      );
      const uploadData = await uploadRes.json();
      if (!uploadData.secure_url)
        throw new Error(uploadData.error?.message || "Cloudinary upload failed!");

      const saveRes = await saveQuotationRecord({
        quote_no: quoteNo,
        company_name: customerName,
        quote_date: date,
        pdf_url: uploadData.secure_url,
        template_id: selectedTemplateId || null,
      });
      if (!saveRes.success) throw new Error(saveRes.error);

      setHistoryFetched(false);

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${quoteNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);

      alert("Quotation saved & downloaded successfully! 🎉");
    } catch (error: any) {
      console.error("Process Error:", error);
      alert("Failed to process quotation: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  useKeyboardShortcuts([
    {
      combo: '1',
      description: 'Switch to Quotation Generator',
      category: 'Navigation',
      handler: () => setActiveView('generator'),
    },
    {
      combo: '2',
      description: 'Switch to Quotation History',
      category: 'Navigation',
      handler: () => setActiveView('history'),
    },
    {
      combo: '3',
      description: 'Switch to Template Manager',
      category: 'Navigation',
      handler: () => setActiveView('templates'),
    },
    {
      combo: 'Ctrl+S',
      description: 'Save & Download Quotation',
      category: 'Actions',
      handler: () => {
        if (activeView === 'generator' && !isGenerating && !loadingTemplates) {
          handleSaveAndDownload();
        }
      },
    },
    {
      combo: 'Alt+R',
      description: 'Refresh Quotation History',
      category: 'Actions',
      handler: () => {
        if (activeView === 'history') {
          fetchQuotations();
        }
      },
    },
  ]);

  if (!isMounted) return null;

  // ── Tab config ──────────────────────────────────────────────────────────
  const tabs: { id: ActiveView; label: string; icon: React.ReactNode; hotkey: string }[] = [
    { id: "generator",  label: "Generate",  icon: <FileText size={16} />, hotkey: "1" },
    { id: "history",    label: "History",   icon: <History size={16} />, hotkey: "2" },
    { id: "templates",  label: "Templates", icon: <LayoutTemplate size={16} />, hotkey: "3" },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen pb-20 bg-[#F4F7FA] dark:bg-[#070b14]">

      {/* ── DARK GRADIENT HEADER — Imperial Amethyst & Celestial Waves (dark) ── */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-32 px-6 md:px-12 shadow-2xl relative z-10 overflow-hidden dark:border-b dark:border-purple-500/20 dark:shadow-[0_12px_40px_rgba(168,85,247,0.15)]">
        {/* Light mode gradient */}
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-[#0A192F] to-black dark:hidden' />

        {/* Dark mode multi-color imperial amethyst gradient */}
        <div className='absolute inset-0 hidden dark:block' style={{ background: 'linear-gradient(135deg, #070512 0%, #150d2e 20%, #221142 42%, #120926 70%, #05030e 100%)' }} />

        {/* Dark mode glowing amethyst orbs */}
        <div className='absolute -top-12 -left-12 w-96 h-96 hidden dark:block bg-purple-600/25 rounded-full blur-[100px] pointer-events-none' />
        <div className='absolute bottom-0 right-10 w-96 h-96 hidden dark:block bg-indigo-600/20 rounded-full blur-[90px] pointer-events-none' />
        <div className='absolute top-1/4 right-1/3 w-72 h-72 hidden dark:block bg-cyan-500/12 rounded-full blur-[80px] pointer-events-none' />

        {/* Dark mode SVG Imperial Amethyst Waves */}
        <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden hidden dark:block'>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="quot-grad-wave1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.32" />
                <stop offset="35%" stopColor="#A855F7" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#4F46E5" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="quot-grad-wave2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" stopOpacity="0.28" />
                <stop offset="40%" stopColor="#EC4899" stopOpacity="0.20" />
                <stop offset="75%" stopColor="#6366F1" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="quot-crest-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C084FC" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#E879F9" stopOpacity="0.95" />
                <stop offset="85%" stopColor="#818CF8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="quot-crest-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F472B6" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.8" />
              </linearGradient>
              <filter id="quot-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M0,110 C320,40 560,180 860,90 C1160,10 1320,150 1440,80 L1440,320 L0,320 Z" fill="url(#quot-grad-wave1)" />
            <path d="M0,110 C320,40 560,180 860,90 C1160,10 1320,150 1440,80" stroke="url(#quot-crest-1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#quot-glow-purple)" />
            <path d="M0,160 C260,200 480,90 780,150 C1080,210 1280,100 1440,140 L1440,320 L0,320 Z" fill="url(#quot-grad-wave2)" />
            <path d="M0,160 C260,200 480,90 780,150 C1080,210 1280,100 1440,140" stroke="url(#quot-crest-2)" strokeWidth="2" strokeLinecap="round" />
            <path d="M0,230 C360,270 680,180 1020,240 C1240,280 1380,210 1440,220" stroke="url(#quot-crest-1)" strokeWidth="1.2" strokeDasharray="6 6" strokeOpacity="0.4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Light mode decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none dark:hidden" />

        <div className="w-full relative z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === "generator" && (
                <>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                    <FileText className="text-blue-400" size={36} /> Generate Quotation
                  </h1>
                  <p className="text-blue-200 font-medium mt-2">Create and download professional quotations for clients.</p>
                </>
              )}
              {activeView === "history" && (
                <>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                    <History className="text-blue-400" size={36} /> Quotation History
                  </h1>
                  <p className="text-blue-200 font-medium mt-2">Browse and download previously generated quotations.</p>
                </>
              )}
              {activeView === "templates" && (
                <>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                    <LayoutTemplate className="text-blue-400" size={36} /> Template Manager
                  </h1>
                  <p className="text-blue-200 font-medium mt-2">Create and manage quotation templates with custom tables.</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Right side action */}
          <AnimatePresence mode="wait">
            {activeView === "generator" && (
              <motion.div
                key="gen-btn"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={handleSaveAndDownload}
                  disabled={isGenerating || loadingTemplates}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black shadow-lg shadow-blue-900/40 transition-all disabled:opacity-70"
                  title="Save & Download (Ctrl+S)"
                >
                  {isGenerating ? <DotsLoader size="xs" variant="white" /> : <Download size={20} />}
                  {isGenerating ? "Processing..." : "Save & Download"}
                  <Kbd variant="glass" size="xs">Ctrl+S</Kbd>
                </button>
              </motion.div>
            )}
            {activeView === "history" && (
              <motion.div
                key="hist-badge"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={fetchQuotations}
                  disabled={loadingHistory}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
                  title="Refresh history (Alt+R)"
                >
                  {loadingHistory ? <DotsLoader size="xs" variant="primary" /> : <RotateCw size={16} />}
                  <Kbd variant="glass" size="xs">Alt+R</Kbd>
                </button>
                <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md border border-white/10 text-blue-100 font-bold rounded-xl text-sm">
                  Total Records: {quotations.length}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── TAB BAR (inside header, bottom) ── */}
        <div className="flex gap-1 mt-8 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-1 w-fit">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeView === tab.id
                  ? "text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {activeView === tab.id && (
                <motion.div
                  layoutId="active-tab-pill"
                  className="absolute inset-0 bg-blue-600 rounded-xl shadow-md"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon} {tab.label}
                <Kbd variant="glass" size="xs">{tab.hotkey}</Kbd>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="w-full mx-auto px-2 md:px-6 -mt-20 relative z-20 pb-4">
        <AnimatePresence mode="wait">

          {/* ======================= GENERATOR VIEW ======================= */}
          {activeView === "generator" && (
            <motion.div
              key="generator"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">

                {/* General Info */}
                <div className="bg-white dark:bg-[#0c0819]/80 dark:backdrop-blur-xl p-6 rounded-3xl shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-purple-500/20">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                    <User size={20} className="text-blue-600 dark:text-blue-400 shrink-0" /> General Info
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-2">Customer / Company Name</label>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-4 bg-blue-50/50 dark:bg-[#090d1a] border border-blue-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 dark:text-white font-extrabold text-lg transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-2">Quote No (Auto)</label>
                        <div className="flex gap-2">
                          <input disabled value={quoteNo} className="flex-1 p-4 bg-gray-100 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-slate-300 font-bold cursor-not-allowed min-w-0" />
                          <button onClick={generateQuoteNo} className="p-4 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 text-gray-500 dark:text-slate-400 rounded-xl transition-all shrink-0">
                            <RefreshCw size={16} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-2">Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-[#090d1a] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 dark:text-white font-extrabold transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-2">Template</label>
                        {loadingTemplates ? (
                          <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-[#090d1a] border border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 dark:text-slate-500">
                            <DotsLoader size="xs" variant="primary" label="Loading templates..." />
                          </div>
                        ) : templateError ? (
                          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-rose-950/30 border border-red-200 dark:border-rose-900/40 rounded-xl text-red-600 dark:text-rose-400 text-sm font-bold">
                            <AlertCircle size={16} /> {templateError}
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={selectedTemplateId}
                              onChange={(e) => handleTemplateChange(e.target.value)}
                              className="w-full p-4 pr-10 bg-gray-50 dark:bg-[#090d1a] border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 dark:text-white font-bold appearance-none cursor-pointer"
                            >
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}{t.is_default ? " (Default)" : ""}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editable sections */}
                {editableSections.length > 0 && (
                  <div className="bg-white dark:bg-[#0c0819]/80 dark:backdrop-blur-xl p-6 rounded-3xl shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-purple-500/20">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
                      <DollarSign size={20} className="text-blue-600 dark:text-blue-400 shrink-0" /> Services &amp; Pricing
                      <span className="ml-auto text-xs font-medium text-gray-400 dark:text-slate-500">Changes apply only to this PDF</span>
                    </h2>
                    <div className="space-y-8">
                      {editableSections.map((section, sectionIdx) => (
                        <div key={section.id} className="bg-gray-50 dark:bg-[#090d1a]/70 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-gray-800 dark:text-slate-200">{section.title}</h3>
                            <button
                              onClick={() => handleResetSection(sectionIdx)}
                              className="flex items-center gap-1 text-xs font-bold text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              <RefreshCw size={12} /> Reset
                            </button>
                          </div>
                          {/* Column headers */}
                          <div className="flex items-center gap-2 mb-2">
                            {section.columns.map((col, ci) => (
                              <div
                                key={ci}
                                className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-3 min-w-0 overflow-hidden"
                                style={{ width: `${col.width}%`, flexShrink: 0, textAlign: col.align }}
                              >
                                {col.label}
                              </div>
                            ))}
                          </div>
                          {/* Rows */}
                          <div className="space-y-2">
                            {section.rows.map((row, rowIdx) => (
                              <div key={rowIdx} className="flex items-center gap-2">
                                {section.columns.map((col, colIdx) => {
                                  if (colIdx === 0 && section.columns.length > 1) {
                                    return (
                                      <div
                                        key={colIdx}
                                        className="text-xs font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-[#070b14] p-3 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm min-w-0 overflow-hidden"
                                        style={{ width: `${col.width}%`, flexShrink: 0, textAlign: col.align }}
                                      >
                                        {row[colIdx] ?? ""}
                                      </div>
                                    );
                                  }
                                  return (
                                    <input
                                      key={colIdx}
                                      type="text"
                                      value={row[colIdx] ?? ""}
                                      onChange={(e) => handleCellEdit(sectionIdx, rowIdx, colIdx, e.target.value)}
                                      className="py-3 px-3 bg-white dark:bg-[#070b14] border border-blue-200 dark:border-slate-700 rounded-lg outline-none font-extrabold text-blue-700 dark:text-blue-400 focus:ring-2 focus:ring-blue-600 shadow-sm text-sm min-w-0"
                                      style={{ width: `${col.width}%`, flexShrink: 0, textAlign: col.align }}
                                    />
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingTemplates && editableSections.length === 0 && !templateError && (
                  <div className="bg-white dark:bg-[#0c0819]/80 dark:backdrop-blur-xl p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-purple-500/20 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                    <FileText size={48} strokeWidth={1} className="mb-3 text-gray-300 dark:text-slate-600" />
                    <p className="font-bold">No template selected.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================= HISTORY VIEW ======================= */}
          {activeView === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="md:col-span-2 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by Company Name or Quote No..." className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#0c0819]/80 dark:backdrop-blur-xl border border-gray-200 dark:border-purple-500/20 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white font-bold shadow-sm transition-all placeholder:font-normal placeholder:text-gray-400 dark:placeholder:text-slate-500" />
                </div>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#0c0819]/80 dark:backdrop-blur-xl border border-gray-200 dark:border-purple-500/20 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white font-bold shadow-sm transition-all" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#0c0819]/80 dark:backdrop-blur-xl rounded-3xl shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-purple-500/20 overflow-hidden min-h-[400px]">
                {loadingHistory ? (
                  <div className="p-6">
                    <TableSkeleton rows={5} />
                  </div>
                ) : filteredQuotations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-gray-400 dark:text-slate-500">
                    <FileText size={64} className="mb-4 text-gray-300 dark:text-slate-600" strokeWidth={1} />
                    <p className="font-bold text-lg text-gray-500 dark:text-slate-400">No quotations found.</p>
                    <p className="text-sm mt-1">Try adjusting your search or date filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#090d1a] border-b border-gray-100 dark:border-slate-800">
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Quote No</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Customer / Company</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Date Issued</th>
                          <th className="p-5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {filteredQuotations.map((quote, idx) => (
                            <motion.tr key={quote.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="border-b border-gray-50 dark:border-slate-800/60 hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                              <td className="p-5">
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-sm rounded-lg border border-blue-100 dark:border-blue-900/50">
                                  <FileText size={14} /> {quote.quote_no}
                                </span>
                              </td>
                              <td className="p-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-gray-500 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-[#090d1a] group-hover:shadow-sm transition-all shrink-0">
                                    <Building2 size={18} />
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-gray-900 dark:text-white">{quote.company_name}</p>
                                    <p className="text-xs font-medium text-gray-400 dark:text-slate-500 mt-0.5">Generated: {format(new Date(quote.created_at), "hh:mm a")}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5">
                                <p className="font-bold text-gray-700 dark:text-slate-300">{format(new Date(quote.quote_date), "dd MMM yyyy")}</p>
                              </td>
                              <td className="p-5 text-right">
                                <div className="flex justify-end gap-2">
                                  <a href={`/api/pdf/${encodeURIComponent(quote.quote_no)}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white dark:bg-[#0c1427] border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2" title="View PDF">
                                    <ExternalLink size={18} /> <span className="hidden sm:inline text-sm">View</span>
                                  </a>
                                  <a href={`/api/pdf/${encodeURIComponent(quote.quote_no)}?dl=1`} download className="p-2.5 bg-gray-900 dark:bg-blue-600 text-white hover:bg-black dark:hover:bg-blue-500 rounded-xl font-bold transition-all shadow-md flex items-center gap-2" title="Download PDF">
                                    <Download size={18} />
                                  </a>
                                  <button onClick={() => handleDeleteQuotation(quote)} disabled={deletingQuoteId === quote.id} className="p-2.5 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/40 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-900/60 rounded-xl font-bold transition-all shadow-sm disabled:opacity-60" title="Delete">
                                    {deletingQuoteId === quote.id ? <DotsLoader size="xs" variant="primary" /> : <Trash2 size={18} />}
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================= TEMPLATES VIEW ======================= */}
          {activeView === "templates" && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white dark:bg-[#0c1427] rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                <TemplateBuilder />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}