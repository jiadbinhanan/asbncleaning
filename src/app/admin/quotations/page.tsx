'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  FileText, Download, History, Loader2, User, DollarSign
} from "lucide-react";
import { QuotationDocument, defaultPricingCategories } from "@/components/admin/quotations/QuotationDocument";
import { getQuotationUploadSignature, saveQuotationRecord } from "./actions";

export default function QuotationManager() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Form States ---
  const [quoteNo, setQuoteNo] = useState("");
  const [date, setDate] = useState("");
  const [customerName, setCustomerName] = useState("Valued Customer");
  const [pricingData, setPricingData] = useState(defaultPricingCategories);

  // Auto Generate Quote ID
  useEffect(() => {
    setIsMounted(true);
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); 
    
    setQuoteNo(`ASBN/DXB-Q${yy}${mm}-${random}`);
    setDate(today.toISOString().split('T')[0]);
  }, []);

  // --- Handlers ---
  const handlePriceChange = (categoryId: string, itemIdx: number, newPrice: string) => {
    setPricingData(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      const newItems = [...cat.items];
      newItems[itemIdx].price = newPrice;
      return { ...cat, items: newItems };
    }));
  };

  // --- SAVE & DOWNLOAD LOGIC ---
  const handleSaveAndDownload = async () => {
    if (!customerName.trim()) return alert("Please enter Customer Name.");
    setIsGenerating(true);

    try {
      // 1. Generate Vector PDF Blob using @react-pdf/renderer
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

      // 2. Upload to Cloudinary (using 'auto/upload' instead of image)
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

  return (
    <div className="min-h-screen pb-20 p-2 md:p-6 max-w-[1600px] mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <FileText className="text-blue-600" /> Premium Quotation Generator
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-1">Vector PDF • 100% Original Design • Auto Save</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => router.push('/admin/quotations/history')}
            className="flex-1 md:flex-none px-6 py-3.5 bg-gray-100 text-gray-800 hover:bg-gray-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <History size={18} /> View History
          </button>
          <button 
            onClick={handleSaveAndDownload} disabled={isGenerating}
            className="flex-1 md:flex-none px-8 py-3.5 bg-blue-700 text-white rounded-xl font-black shadow-xl shadow-blue-200 hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Download size={20} />} 
            {isGenerating ? "Processing..." : "Save & Download PDF"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
        
        {/* LEFT: EDITOR FORM */}
        <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Customer Info Box */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 border-b pb-4">
              <User size={20} className="text-blue-600"/> General Info
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

          {/* Pricing Editors */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6 border-b pb-4">
              <DollarSign size={20} className="text-blue-600"/> Pricing Editor
            </h2>

            <div className="space-y-8">
              {pricingData.map((cat) => (
                <div key={cat.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <h3 className="text-sm font-black text-gray-800 mb-4">{cat.title}</h3>
                  <div className="space-y-3">
                    {cat.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-1 text-xs font-bold text-gray-600 whitespace-pre-line bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                          {item.type}
                        </div>
                        <div className="relative w-32">
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

        </div>

      </div>
    </div>
  );
}
