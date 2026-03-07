"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Download, History, Loader2, User, DollarSign,
  ArrowLeft, Search, Calendar, ExternalLink, Building2
} from "lucide-react";
import { format } from "date-fns";
import { QuotationDocument, defaultPricingCategories } from "@/components/admin/quotations/QuotationDocument";
import { getQuotationUploadSignature, saveQuotationRecord } from "./actions";

// টাইপ ডিফাইন করা
type Quotation = {
  id: string;
  quote_no: string;
  company_name: string;
  quote_date: string;
  pdf_url: string;
  created_at: string;
};

export default function QuotationManager() {
  const supabase = createClient();
  const [activeView, setActiveView] = useState<'generator' | 'history'>('generator');
  const [isMounted, setIsMounted] = useState(false);

  // --- Generator States ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [quoteNo, setQuoteNo] = useState("");
  const [date, setDate] = useState("");
  const [customerName, setCustomerName] = useState("Valued Customer");
  const [pricingData, setPricingData] = useState(defaultPricingCategories);

  // --- History States ---
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Auto Generate Quote ID
  useEffect(() => {
    setIsMounted(true);
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); 
    
    setQuoteNo(`BTM/QUOT-Q${yy}${mm}-${random}`);
    setDate(today.toISOString().split('T')[0]);
  }, []);

  // Fetch History Function
  const fetchQuotations = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error fetching quotations:", error);
    } else if (data) {
      setQuotations(data);
    }
    setLoadingHistory(false);
    setHistoryFetched(true);
  };

  // Fetch only when switching to History
  useEffect(() => {
    if (activeView === 'history' && !historyFetched) {
      fetchQuotations();
    }
  }, [activeView, historyFetched, supabase]);

  // Client-Side Filtering
  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch = q.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.quote_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter ? q.quote_date === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  // --- Handlers ---
  const handlePriceChange = (categoryId: string, itemIdx: number, newPrice: string) => {
    setPricingData(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      const newItems = [...cat.items];
      newItems[itemIdx].price = newPrice;
      return { ...cat, items: newItems };
    }));
  };

  const handleSaveAndDownload = async () => {
    if (!customerName.trim()) return alert("Please enter Customer Name.");
    setIsGenerating(true);

    try {
      // 1. Generate Vector PDF Blob
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(
        <QuotationDocument 
          quoteNo={quoteNo} 
          date={date} 
          customerName={customerName} 
          pricingData={pricingData} 
        />
      ).toBlob();
      const pdfFile = new File([blob], `${quoteNo}.pdf`, { type: "application/pdf" });

      // 2. Upload to Cloudinary
      const { signature, timestamp, apiKey, cloudName } = await getQuotationUploadSignature();
      if (!cloudName) throw new Error("Missing Cloudinary Details in .env.local");

      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("api_key", apiKey!);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", "quotations");

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.secure_url) {
         throw new Error(uploadData.error?.message || "Cloudinary upload failed!");
      }

      // 3. Save to Supabase
      const saveRes = await saveQuotationRecord({
        quote_no: quoteNo,
        company_name: customerName,
        quote_date: date,
        pdf_url: uploadData.secure_url
      });
      if (!saveRes.success) throw new Error(saveRes.error);

      // Force refresh history next time
      setHistoryFetched(false);

      // 4. Trigger Browser Download
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${quoteNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert("Quotation saved & downloaded successfully! 🎉");
    } catch (error: any) {
      console.error("Process Error:", error);
      alert("Failed to process quotation: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isMounted) return null;

  // Split Pricing Categories logic
  const splitIndex = pricingData.findIndex(cat => cat.title.toUpperCase().includes("CHECK OUT CLEANING WITH AMENITIES ONLY"));
  const leftCategories = splitIndex > -1 ? pricingData.slice(0, splitIndex) : pricingData;
  const rightCategories = splitIndex > -1 ? pricingData.slice(splitIndex) : [];

  return (
    <div className="min-h-screen pb-20 p-2 md:p-6 max-w-7xl mx-auto overflow-hidden">
      <AnimatePresence mode="wait">
        
        {/* ======================= GENERATOR VIEW ======================= */}
        {activeView === 'generator' && (
          <motion.div 
            key="generator"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div>
                <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                  <FileText className="text-blue-600 shrink-0" /> Generate Quotation
                </h1>
              </div>
              
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setActiveView('history')}
                  className="flex-1 md:flex-none px-4 py-3 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <History size={18} className="shrink-0" /> View History
                </button>
                <button 
                  onClick={handleSaveAndDownload} disabled={isGenerating}
                  className="flex-1 md:flex-none px-5 py-3 bg-blue-700 text-white rounded-xl font-black shadow-xl shadow-blue-200 hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 whitespace-nowrap"
                >
                  {isGenerating ? <Loader2 className="animate-spin shrink-0" size={20}/> : <Download size={20} className="shrink-0" />} 
                  {isGenerating ? "Processing..." : "Save & Download"}
                </button>
              </div>
            </div>

            {/* SPLIT LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* --- LEFT COLUMN --- */}
              <div className="space-y-6">
                {/* Customer Info Box */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b pb-4">
                    <User size={20} className="text-blue-600 shrink-0"/> General Info
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Customer / Company Name</label>
                      <input 
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)} 
                        className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 font-extrabold text-lg transition-all" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Quote No (Auto)</label>
                        <input disabled value={quoteNo} className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-bold cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 font-extrabold transition-all" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left Pricing Data */}
                {leftCategories.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6 border-b pb-4">
                      <DollarSign size={20} className="text-blue-600 shrink-0"/> Services & Pricing
                    </h2>
                    <div className="space-y-8">
                      {leftCategories.map((cat) => (
                        <div key={cat.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <h3 className="text-sm font-black text-gray-800 mb-4">{cat.title}</h3>
                          <div className="space-y-3">
                            {cat.items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <div className="flex-1 text-xs font-bold text-gray-600 whitespace-pre-line bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                  {item.type}
                                </div>
                                <div className="relative w-32 shrink-0">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">AED</span>
                                  <input 
                                    type="text" 
                                    value={item.price} 
                                    onChange={e => handlePriceChange(cat.id, idx, e.target.value)} 
                                    className="w-full pl-10 pr-3 py-3 bg-white border border-blue-200 rounded-lg outline-none font-extrabold text-blue-700 focus:ring-2 focus:ring-blue-600 shadow-sm" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* --- RIGHT COLUMN --- */}
              {rightCategories.length > 0 && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit">
                  {leftCategories.length === 0 && (
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6 border-b pb-4">
                      <DollarSign size={20} className="text-blue-600 shrink-0"/> More Services
                    </h2>
                  )}
                  <div className="space-y-8">
                    {rightCategories.map((cat) => (
                      <div key={cat.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <h3 className="text-sm font-black text-gray-800 mb-4">{cat.title}</h3>
                        <div className="space-y-3">
                          {cat.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="flex-1 text-xs font-bold text-gray-600 whitespace-pre-line bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                {item.type}
                              </div>
                              <div className="relative w-32 shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">AED</span>
                                <input 
                                  type="text" 
                                  value={item.price} 
                                  onChange={e => handlePriceChange(cat.id, idx, e.target.value)} 
                                  className="w-full pl-10 pr-3 py-3 bg-white border border-blue-200 rounded-lg outline-none font-extrabold text-blue-700 focus:ring-2 focus:ring-blue-600 shadow-sm" 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}


        {/* ======================= HISTORY VIEW ======================= */}
        {activeView === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveView('generator')}
                  className="p-3 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all"
                  title="Back to Generator"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                    Quotation History
                  </h1>
                </div>
              </div>
              
              <div className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg text-sm border border-blue-100">
                Total Records: {quotations.length}
              </div>
            </div>

            {/* FILTERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="md:col-span-2 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Company Name or Quote No..." 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 font-bold shadow-sm transition-all placeholder:font-normal"
                />
              </div>
              
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  type="date" 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 font-bold shadow-sm transition-all"
                />
              </div>
            </div>

            {/* DATA TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                  <Loader2 className="animate-spin mb-4 text-blue-600" size={40} />
                  <p className="font-medium animate-pulse">Loading records...</p>
                </div>
              ) : filteredQuotations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                  <FileText size={64} className="mb-4 text-gray-300" strokeWidth={1} />
                  <p className="font-bold text-lg text-gray-500">No quotations found.</p>
                  <p className="text-sm mt-1">Try adjusting your search or date filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Quote No</th>
                        <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Customer / Company</th>
                        <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Date Issued</th>
                        <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredQuotations.map((quote, idx) => (
                          <motion.tr 
                            key={quote.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                          >
                            <td className="p-5">
                              <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-100">
                                <FileText size={14} /> {quote.quote_no}
                              </span>
                            </td>
                            
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                                  <Building2 size={18} />
                                </div>
                                <div>
                                  <p className="font-extrabold text-gray-900">{quote.company_name}</p>
                                  <p className="text-xs font-medium text-gray-400 mt-0.5">
                                    Generated: {format(new Date(quote.created_at), "hh:mm a")}
                                  </p>
                                </div>
                              </div>
                            </td>
                            
                            <td className="p-5">
                              <p className="font-bold text-gray-700">
                                {format(new Date(quote.quote_date), "dd MMM yyyy")}
                              </p>
                            </td>
                            
                            <td className="p-5 text-right">
                              <div className="flex justify-end gap-2">
                                <a 
                                  href={quote.pdf_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-2.5 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
                                  title="View PDF"
                                >
                                  <ExternalLink size={18} /> <span className="hidden sm:inline text-sm">View</span>
                                </a>
                                
                                <a 
                                  href={quote.pdf_url} 
                                  download={`${quote.quote_no}.pdf`}
                                  className="p-2.5 bg-gray-900 text-white hover:bg-black rounded-xl font-bold transition-all shadow-md flex items-center gap-2"
                                  title="Download PDF"
                                >
                                  <Download size={18} />
                                </a>
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

      </AnimatePresence>
    </div>
  );
}
