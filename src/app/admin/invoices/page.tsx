'use client';
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, FileText, Search, UploadCloud, 
  History, PlusCircle, Building2, Calendar, Download, Eye, FileDigit 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { pdf } from '@react-pdf/renderer';

// Import our custom components and actions
import { InvoiceDocument } from "./InvoiceDocument";
import { getInvoiceUploadSignature } from "./actions"; 

export default function InvoiceManagement() {
  const supabase = createClient();

  // --- Global States ---
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [companies, setCompanies] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // --- Generate Tab States ---
  const [selectedCompany, setSelectedCompany] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Bank Details State
  const [bankDetails, setBankDetails] = useState({
    bankName: "EMIRATES NBD",
    accountName: "BISHNU BAHADUR THAPA",
    accountNo: "125937795501",
    iban: "AE83 0260 0001 2593 7795 501",
    swiftCode: "EBILAEAD",
    routingNo: "302620122"
  });

  // --- History Tab States ---
  const [historyFilterCompany, setHistoryFilterCompany] = useState("");

  // 1. Fetch Initial Data (1 API Call for both Companies & History)
  const fetchInitialData = async () => {
    setLoadingInitial(true);
    const [compRes, invRes] = await Promise.all([
      supabase.from('companies').select('id, name').order('name', { ascending: true }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false })
    ]);

    if (compRes.data) setCompanies(compRes.data);
    if (invRes.data) setInvoices(invRes.data);
    setLoadingInitial(false);
  };

  useEffect(() => { fetchInitialData(); }, [supabase]);

  // 2. Fetch Unbilled/Finalized Bookings for Generation
  const handleFetchData = async () => {
    if (!selectedCompany || !startDate || !endDate) return alert("Please select all fields");
    setLoadingFetch(true);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, cleaning_date, service_type, price,
        units!inner ( unit_number, building_name, layout, company_id, companies ( name ) )
      `)
      .eq('units.company_id', parseInt(selectedCompany)) // 🚨 FIXED: Convert string to Int for strict relation matching
      .gte('cleaning_date', startDate)
      .lte('cleaning_date', endDate)
      .eq('status', 'finalized')
      .order('cleaning_date', { ascending: true });

    if (error) {
      alert(error.message);
    } else {
      if (!data || data.length === 0) {
        alert("No finalized bookings found for this range.");
      }
      // 🚨 FIXED: TypeScript-কে স্পষ্টভাবে বলে দেওয়া হচ্ছে যে এটি any[] টাইপের ডাটা
      const fetchedBookings: any[] = data ? (data as any[]) : [];
      setBookings(fetchedBookings);
    }
    setLoadingFetch(false);
  };

  // 3. Data Processing & Formatting (FIXED UNIT NAMES)
  const groupedBookings = useMemo(() => {
    const groups: Record<string, any[]> = {};
    let subtotal = 0;

    bookings.forEach(b => {
      // 🚨 Safely handle null/undefined values to prevent weird text
      const buildingName = b.units?.building_name || "Unknown Building";
      const unitNo = b.units?.unit_number || "N/A";
      const layoutText = b.units?.layout ? `(${b.units.layout})` : "";
      
      const unitKey = `${buildingName} | Unit-${unitNo} ${layoutText}`.trim();
      
      if (!groups[unitKey]) groups[unitKey] = [];
      groups[unitKey].push(b);
      subtotal += Number(b.price || 0);
    });
    
    return { groups, subtotal };
  }, [bookings]);

  const companyName = companies.find(c => c.id.toString() === selectedCompany)?.name || "";

  const generateInvoiceNo = () => {
    const compCode = companyName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
    
    // 🚨 ফিক্স: "ddMMM" এর বদলে শুধু "dd" (দিন) নেওয়া হয়েছে
    const startStr = format(parseISO(startDate), "dd"); 
    const endStr = format(parseISO(endDate), "dd"); 
    const random4 = Math.floor(1000 + Math.random() * 9000);
    
    // আউটপুট: BTM/DXB-12-25-COMP-8452
    return `BTM/DXB-${startStr}-${endStr}-${compCode}-${random4}`;
  };

  const invoiceNo = useMemo(() => bookings.length > 0 ? generateInvoiceNo() : "BTM/DXB-XXXX", [bookings, companyName, startDate, endDate]);
  const dateRangeStr = useMemo(() => bookings.length > 0 ? `${format(parseISO(startDate), "do MMM")} - ${format(parseISO(endDate), "do MMM yyyy")}` : "", [bookings, startDate, endDate]);

  // 4. Generate PDF, Upload to Cloudinary & Save to Supabase
  const handleSaveAndGenerate = async () => {
    if (bookings.length === 0) return;
    setGenerating(true);

    try {
      // Step A: Generate PDF Blob
      const doc = <InvoiceDocument 
        invoiceNo={invoiceNo}
        dateRange={dateRangeStr}
        issueDate={format(new Date(), "dd-MMM-yyyy")}
        companyName={companyName}
        groupedBookings={groupedBookings.groups}
        subtotal={groupedBookings.subtotal}
        bankDetails={bankDetails}
      />;
      
      // 🚨 FIXED: null বা [] বাদ দিয়ে সরাসরি doc ভেরিয়েবলটাকে পাস করুন
      const asPdf = pdf(doc);
      const pdfBlob = await asPdf.toBlob();
      
      const file = new File([pdfBlob], `${invoiceNo}.pdf`, { type: 'application/pdf' });

      // Step B: Get Cloudinary Signature & Details
      const { signature, timestamp, apiKey, cloudName, folderPath, publicId } = await getInvoiceUploadSignature(companyName, invoiceNo);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey!);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folderPath);
      formData.append("public_id", publicId); // Forces exactly this filename

      // Step C: Upload to Cloudinary
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.secure_url) throw new Error("Cloudinary upload failed");

      // Step D: Save to Supabase (Only 'invoices' table)
      const bookingIds = bookings.map(b => b.id);
      const { error: invError } = await supabase.from('invoices').insert([{
        invoice_no: invoiceNo,
        company_id: parseInt(selectedCompany),
        company_name: companyName,
        start_date: startDate,
        end_date: endDate,
        total_amount: groupedBookings.subtotal,
        pdf_url: uploadData.secure_url,
        booking_ids: bookingIds 
      }]);

      if (invError) throw invError;

      alert("Invoice Generated and Saved Successfully!");
      
      // Auto-download for the admin
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNo}.pdf`;
      link.click();
      
      // Reset & Refresh
      setBookings([]); 
      fetchInitialData(); 

    } catch (err: any) {
      alert("Error generating invoice: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Filter History
  const filteredHistory = historyFilterCompany 
    ? invoices.filter(inv => inv.company_id.toString() === historyFilterCompany)
    : invoices;

  if (loadingInitial) return <div className="flex justify-center items-center min-h-screen bg-[#F4F7FA]"><Loader2 className="animate-spin text-blue-600" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FA] pb-24 font-sans">
      
      {/* 1. PREMIUM HEADER (Black & Dark Navy Blue) */}
      <div className="bg-gradient-to-br from-gray-900 via-[#0A192F] to-black text-white pt-10 pb-20 px-4 md:px-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div>
              <p className="text-blue-300 font-bold uppercase tracking-widest text-xs mb-1">Financial Operations</p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                 <FileDigit className="text-blue-500" size={32}/> Invoice Management
              </h1>
           </div>
           
           {/* Tab Switcher */}
           <div className="flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
              <button 
                onClick={() => setActiveTab('generate')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'generate' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <PlusCircle size={16}/> Create New
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                <History size={16}/> History
              </button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 relative z-20">
        <AnimatePresence mode="wait">
          
          {/* ==========================================
              TAB 1: GENERATE INVOICE
          ========================================== */}
          {activeTab === 'generate' && (
            <motion.div key="generate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Controls Panel */}
              <div className="space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100">
                  <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4"><Building2 className="text-blue-600"/> Select Parameters</h2>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Select Client / Company</label>
                      <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900">
                        <option value="">Choose a company...</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Start Date</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-900" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">End Date</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-900" />
                      </div>
                    </div>
                    
                    <button onClick={handleFetchData} disabled={loadingFetch} className="w-full py-4 bg-gray-900 text-white font-black rounded-xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95">
                      {loadingFetch ? <Loader2 className="animate-spin"/> : <Search size={20}/>} Fetch Completed Works
                    </button>
                  </div>
                </div>

                {/* Bank Details Editor (Shows only if data is fetched) */}
                {bookings.length > 0 && (
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-5 border-b border-gray-100 pb-2">Edit Bank Details</h3>
                    <div className="space-y-4">
                      <div><label className="text-[10px] font-bold text-gray-400 uppercase">Bank Name</label><input value={bankDetails.bankName} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} className="w-full p-2 border-b-2 border-gray-100 focus:border-blue-500 outline-none font-bold text-gray-900"/></div>
                      <div><label className="text-[10px] font-bold text-gray-400 uppercase">Account Name</label><input value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} className="w-full p-2 border-b-2 border-gray-100 focus:border-blue-500 outline-none font-bold text-gray-900"/></div>
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-[10px] font-bold text-gray-400 uppercase">Account No</label><input value={bankDetails.accountNo} onChange={e => setBankDetails({...bankDetails, accountNo: e.target.value})} className="w-full p-2 border-b-2 border-gray-100 focus:border-blue-500 outline-none font-bold text-gray-900"/></div>
                         <div><label className="text-[10px] font-bold text-gray-400 uppercase">IBAN</label><input value={bankDetails.iban} onChange={e => setBankDetails({...bankDetails, iban: e.target.value})} className="w-full p-2 border-b-2 border-gray-100 focus:border-blue-500 outline-none font-bold text-gray-900"/></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Swift Code</label><input value={bankDetails.swiftCode} onChange={e => setBankDetails({...bankDetails, swiftCode: e.target.value})} className="w-full p-2 border-b-2 border-gray-100 focus:border-blue-500 outline-none font-bold text-gray-900"/></div>
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Routing No</label><input value={bankDetails.routingNo} onChange={e => setBankDetails({...bankDetails, routingNo: e.target.value})} className="w-full p-2 border-b-2 border-gray-100 focus:border-blue-500 outline-none font-bold text-gray-900"/></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview & Action Panel */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col h-full">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                   Data Preview 
                   {bookings.length > 0 && <span className="text-[10px] font-black tracking-widest bg-blue-50 text-blue-700 px-3 py-1 rounded-lg uppercase">ID: {invoiceNo}</span>}
                </h3>
                
                {bookings.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-20">
                     <FileText size={64} className="mb-4 opacity-50"/>
                     <p className="font-bold">Select parameters to preview data</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto max-h-[400px] border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-4 custom-scrollbar">
                       {Object.entries(groupedBookings.groups).map(([unitName, unitBookings]: any, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                             <div className="bg-gray-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 border-b border-gray-200">{unitName}</div>
                             <div className="p-3 space-y-2">
                                {unitBookings.map((b: any) => (
                                   <div key={b.id} className="flex justify-between items-center text-xs text-gray-600 border-b border-gray-50 pb-2">
                                      <span className="flex items-center gap-2"><Calendar size={12}/> {format(parseISO(b.cleaning_date), "dd MMM")} - {b.service_type}</span>
                                      <span className="font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded">{b.price} AED</span>
                                   </div>
                                ))}
                             </div>
                          </div>
                       ))}
                    </div>

                    <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex justify-between items-center shadow-inner">
                       <span className="font-black text-blue-900 uppercase tracking-widest text-sm">Total Amount:</span>
                       <span className="text-3xl font-black text-blue-700">{groupedBookings.subtotal.toFixed(2)} AED</span>
                    </div>

                    <button onClick={handleSaveAndGenerate} disabled={generating} className="w-full mt-6 py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-green-500/30 hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                      {generating ? <Loader2 className="animate-spin size-6"/> : <UploadCloud className="size-6"/>}
                      {generating ? "Generating PDF & Saving..." : "Generate PDF & Save"}
                    </button>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* ==========================================
              TAB 2: INVOICE HISTORY
          ========================================== */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              
              {/* History Filter */}
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-1/3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Filter by Company</label>
                  <select value={historyFilterCompany} onChange={(e) => setHistoryFilterCompany(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900">
                    <option value="">All Companies</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}                  </select>
                </div>
              </div>

              {/* History Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-gray-400 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                    <History size={48} className="mx-auto mb-4 opacity-50"/>
                    <p className="font-bold text-lg">No past invoices found.</p>
                  </div>
                ) : (
                  filteredHistory.map(inv => (
                    <div key={inv.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
                      
                      <div className="flex justify-between items-start mb-4 pl-2">
                         <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-black text-[10px] uppercase tracking-widest rounded-lg flex items-center gap-1">
                            <FileDigit size={12}/> {inv.invoice_no}
                         </span>
                         <span className="text-[10px] text-gray-400 font-bold">{format(new Date(inv.created_at), 'dd MMM yyyy')}</span>
                      </div>
                      
                      <h3 className="font-black text-gray-900 text-lg leading-tight mb-2 pl-2 truncate">{inv.company_name}</h3>
                      
                      <div className="pl-2 space-y-2 mb-6">
                         <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5"><Calendar size={14}/> {format(parseISO(inv.start_date), 'dd MMM')} - {format(parseISO(inv.end_date), 'dd MMM yyyy')}</p>
                         <p className="text-sm font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-lg w-fit mt-2 border border-green-100">AED {inv.total_amount}</p>
                      </div>

                      <div className="pt-4 border-t border-gray-50 flex gap-2 pl-2">
                         <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="flex-1 py-3 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest">
                            <Eye size={14}/> View
                         </a>
                         <a href={inv.pdf_url} download className="flex-1 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 uppercase tracking-widest shadow-lg">
                            <Download size={14}/> Download
                         </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
