"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, FileText, Search, Calendar, 
  ExternalLink, Loader2, Download, Building2
} from "lucide-react";
import { format } from "date-fns";

// টাইপ ডিফাইন করা
type Quotation = {
  id: string;
  quote_no: string;
  company_name: string;
  quote_date: string;
  pdf_url: string;
  created_at: string;
};

export default function QuotationHistory() {
  const router = useRouter();
  const supabase = createClient();

  // States
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States (এগুলোর জন্য কোনো API কল হবে না, সব লোকালি ফিল্টার হবে)
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // 1. Fetch Data ONLY ONCE on page load
  useEffect(() => {
    const fetchQuotations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200); // একবারে ২০০টি ডেটা নিয়ে আসছি যেন বারবার কল না হয়

      if (error) {
        console.error("Error fetching quotations:", error);
      } else if (data) {
        setQuotations(data);
      }
      setLoading(false);
    };

    fetchQuotations();
  }, [supabase]);

  // 2. Client-Side Filtering (Zero API Cost)
  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch = q.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.quote_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter ? q.quote_date === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="min-h-screen pb-20 p-2 md:p-6 max-w-7xl mx-auto">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin/quotations')}
            className="p-3 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all"
            title="Back to Generator"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
              Quotation History
            </h1>
            <p className="text-gray-500 font-medium text-sm mt-1">View and manage all generated quotations.</p>
          </div>
        </div>
        
        <div className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg text-sm border border-blue-100">
          Total Records: {quotations.length}
        </div>
      </div>

      {/* --- FILTERS (Deep Color UI) --- */}
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

      {/* --- DATA TABLE / LIST --- */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {loading ? (
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
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:shadow-sm transition-all">
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
    </div>
  );
}
