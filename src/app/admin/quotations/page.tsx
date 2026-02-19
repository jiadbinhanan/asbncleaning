"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Plus, Trash2, Download, Settings, 
  List, DollarSign, CheckCircle, FileSignature, Loader2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Initial Data Based on Your PDF ---
const initialAmenities = [
  { id: 1, name: "Bed sheet", studio: "1", oneBed: "1", twoBed: "2", threeBed: "3" },
  { id: 2, name: "Duvet Cover", studio: "1", oneBed: "1", twoBed: "2", threeBed: "3" },
  { id: 3, name: "Pillowcases", studio: "2", oneBed: "4", twoBed: "8", threeBed: "12" },
  { id: 4, name: "Bath Towel", studio: "2", oneBed: "3", twoBed: "5", threeBed: "7" },
  { id: 5, name: "Toilet Rolls", studio: "1", oneBed: "2", twoBed: "3", threeBed: "4" },
  { id: 6, name: "Water Bottles (500ml)", studio: "2", oneBed: "2", twoBed: "4", threeBed: "6" },
  { id: 7, name: "Coffee Capsules", studio: "4", oneBed: "4", twoBed: "6", threeBed: "8" },
];

const initialPricing = [
  {
    id: 1,
    category: "CHECK OUT CLEANING WITH LINEN + LAUNDRY + AMENITIES",
    items: [
      { type: "Studio", price: "155.00" },
      { type: "One Bedroom", price: "180.00" },
      { type: "Two Bedroom(2 bed)", price: "270.00" }
    ]
  },
  {
    id: 2,
    category: "CHECK OUT CLEANING WITH AMENITIES ONLY",
    items: [
      { type: "Studio", price: "120.00" },
      { type: "One Bedroom", price: "150.00" }
    ]
  }
];

export default function QuotationManager() {
  const [activeTab, setActiveTab] = useState<'info' | 'amenities' | 'pricing' | 'terms'>('info');

  // Form States
  const [quoteNo, setQuoteNo] = useState("ASBN/DXB-Q2601");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState("Valued Customer");
  const [introText, setIntroText] = useState("ASBN Cleaning Service Est. is committed to providing high-quality cleaning services delivered by trained and professional staff. Our primary goal is to achieve complete customer satisfaction by consistently maintaining the highest standards of cleanliness and service.\n\nWe are pleased to share our service pricing with you. For your reference, please find below the rates for our services. We look forward to the opportunity to serve you.");
  
  const [amenities, setAmenities] = useState(initialAmenities);
  const [pricingBoxes, setPricingBoxes] = useState(initialPricing);
  
  const [termsText, setTermsText] = useState("1. Prices quoted are valid for 30 days from the issue date.\n2. Payment terms: 50% advance, 50% upon delivery.\n3. Delivery timeline: Within 10 working days after confirmation.\n4. Transportation and installation fees are excluded unless specified.");

  const [isGenerating, setIsGenerating] = useState(false);

  // --- Amenities Actions ---
  const handleAddAmenity = () => {
    setAmenities([...amenities, { id: Date.now(), name: "New Item", studio: "0", oneBed: "0", twoBed: "0", threeBed: "0" }]);
  };
  const handleRemoveAmenity = (id: number) => setAmenities(amenities.filter(a => a.id !== id));
  const handleAmenityChange = (id: number, field: string, value: string) => {
    setAmenities(amenities.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // --- Pricing Actions ---
  const handleAddPricingBox = () => {
    setPricingBoxes([...pricingBoxes, { id: Date.now(), category: "NEW CATEGORY", items: [{ type: "Type", price: "0.00" }] }]);
  };
  const handleRemovePricingBox = (id: number) => setPricingBoxes(pricingBoxes.filter(b => b.id !== id));
  
  const handleAddPricingItem = (boxId: number) => {
    setPricingBoxes(pricingBoxes.map(b => b.id === boxId ? { ...b, items: [...b.items, { type: "New Type", price: "0.00" }] } : b));
  };
  const handleRemovePricingItem = (boxId: number, itemIdx: number) => {
    setPricingBoxes(pricingBoxes.map(b => b.id === boxId ? { ...b, items: b.items.filter((_, i) => i !== itemIdx) } : b));
  };
  const handlePricingChange = (boxId: number, itemIdx: number, field: 'type' | 'price', value: string) => {
    setPricingBoxes(pricingBoxes.map(b => {
      if (b.id !== boxId) return b;
      const newItems = [...b.items];
      newItems[itemIdx][field] = value;
      return { ...b, items: newItems };
    }));
  };
  const handleCategoryChange = (boxId: number, value: string) => {
    setPricingBoxes(pricingBoxes.map(b => b.id === boxId ? { ...b, category: value } : b));
  };

  // --- Image to Base64 Helper ---
  const getBase64Image = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- PDF GENERATION LOGIC ---
  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Load Logo
      let logoBase64 = "";
      try {
         logoBase64 = await getBase64Image("/Logo_asbn.jpg");
      } catch (e) {
         console.warn("Logo not found in public folder. Add Logo_asbn.jpg to public directory.");
      }

      // --- HEADER ---
      if (logoBase64) {
        doc.addImage(logoBase64, "JPEG", 14, 15, 35, 18);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138); // Deep Blue
        doc.text("ASBN", 14, 25);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138); // Deep Blue
      doc.text("QUOTATION", pageWidth - 14, 25, { align: "right" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("ASBN Cleaning Service Est.", pageWidth - 14, 32, { align: "right" });
      doc.text("Phone: +971-544-374231", pageWidth - 14, 37, { align: "right" });
      doc.text("Email: sales@asbncleaning.com", pageWidth - 14, 42, { align: "right" });
      doc.text("Web: www.asbn-cleaning.com", pageWidth - 14, 47, { align: "right" });

      // --- QUOTE INFO ---
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 55, pageWidth - 14, 55);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text("Quotation For:", 14, 65);
      doc.text("Quote Details:", pageWidth - 70, 65);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Dear ${customerName},`, 14, 72);
      
      doc.text(`Quote No: ${quoteNo}`, pageWidth - 70, 72);
      doc.text(`Date: ${date}`, pageWidth - 70, 77);

      // --- INTRO TEXT ---
      doc.setFontSize(10);
      const splitIntro = doc.splitTextToSize(introText, pageWidth - 28);
      doc.text(splitIntro, 14, 90);

      let currentY = 90 + (splitIntro.length * 5) + 10;

      // --- AMENITIES TABLE ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 58, 138);
      doc.text("LIST OF AMENITIES WE PROVIDE:", 14, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        headStyles: { fillColor: [30, 58, 138], textColor: 255, halign: 'center' },
        bodyStyles: { halign: 'center' },
        columnStyles: { 0: { halign: 'left' } },
        head: [['Amenities', 'Studio', '01 Bedroom', '02 Bedroom', '03 Bedroom']],
        body: amenities.map(a => [a.name, a.studio, a.oneBed, a.twoBed, a.threeBed]),
        theme: 'grid',
        styles: { fontSize: 9 }
      });

      // --- PRICING TABLES ---
      // @ts-ignore (jspdf-autotable typing workaround)
      currentY = doc.lastAutoTable.finalY + 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text("PRICING DETAILS", 14, currentY);
      currentY += 5;

      pricingBoxes.forEach((box) => {
        // @ts-ignore
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        
        autoTable(doc, {
          startY: currentY,
          headStyles: { fillColor: [71, 85, 105], textColor: 255 }, // Gray Blue
          head: [[box.category, 'PRICE (AED)']],
          body: box.items.map(item => [item.type, item.price]),
          theme: 'grid',
          styles: { fontSize: 10 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
        });
        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 10;
      });

      // --- TERMS & SIGNATURE ---
      // @ts-ignore
      if (currentY > 220) { doc.addPage(); currentY = 20; }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text("TERMS & CONDITIONS:", 14, currentY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const splitTerms = doc.splitTextToSize(termsText, pageWidth - 28);
      doc.text(splitTerms, 14, currentY + 6);

      currentY += (splitTerms.length * 5) + 30;

      doc.setDrawColor(0, 0, 0);
      doc.line(14, currentY, 70, currentY);
      doc.setFont("helvetica", "bold");
      doc.text("ASBN Cleaning Service Est.", 14, currentY + 5);
      doc.text("Authority Stamp / Signature", 14, currentY + 10);

      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text("THANK YOU FOR YOUR BUSINESS!", pageWidth / 2, currentY + 30, { align: "center" });

      // SAVE
      doc.save(`Quotation_${quoteNo}.pdf`);
      
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Make sure Logo_asbn.jpg exists in public folder.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 p-2 md:p-6 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="text-blue-600" /> Quotation Generator
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create and download premium PDF quotations.</p>
        </div>
        
        <button 
          onClick={generatePDF} disabled={isGenerating}
          className="w-full md:w-auto px-8 py-3.5 bg-gray-900 text-white rounded-xl font-bold shadow-xl shadow-gray-200 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Download size={20} />} 
          {isGenerating ? "Generating..." : "Generate PDF"}
        </button>
      </div>

      {/* TABS */}
      <div className="flex bg-white p-1.5 rounded-2xl mb-6 shadow-sm border border-gray-100 w-full overflow-x-auto">
        {[
          { id: 'info', label: 'General Info', icon: <Settings size={16}/> },
          { id: 'amenities', label: 'Amenities', icon: <List size={16}/> },
          { id: 'pricing', label: 'Pricing', icon: <DollarSign size={16}/> },
          { id: 'terms', label: 'Terms', icon: <FileSignature size={16}/> }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[500px]">
        <AnimatePresence mode="wait">
          
          {/* 1. GENERAL INFO */}
          {activeTab === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4 mb-4">Customer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer / Company Name</label>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Quote No</label>
                    <input value={quoteNo} onChange={e => setQuoteNo(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-bold" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Introduction Text</label>
                <textarea rows={5} value={introText} onChange={e => setIntroText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-medium leading-relaxed" />
              </div>
            </motion.div>
          )}

          {/* 2. AMENITIES */}
          {activeTab === 'amenities' && (
            <motion.div key="amenities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Amenities Provided</h2>
                <button onClick={handleAddAmenity} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-100">
                  <Plus size={16} /> Add Row
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-3 rounded-tl-xl">Item Name</th>
                      <th className="p-3">Studio</th>
                      <th className="p-3">1 Bed</th>
                      <th className="p-3">2 Bed</th>
                      <th className="p-3">3 Bed</th>
                      <th className="p-3 rounded-tr-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amenities.map(a => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-2"><input value={a.name} onChange={e => handleAmenityChange(a.id, 'name', e.target.value)} className="w-full p-2 bg-transparent border-b border-transparent focus:border-blue-500 outline-none font-bold text-gray-800" /></td>
                        <td className="p-2"><input value={a.studio} onChange={e => handleAmenityChange(a.id, 'studio', e.target.value)} className="w-16 p-2 bg-transparent border border-gray-200 rounded text-center outline-none focus:border-blue-500 text-sm font-medium" /></td>
                        <td className="p-2"><input value={a.oneBed} onChange={e => handleAmenityChange(a.id, 'oneBed', e.target.value)} className="w-16 p-2 bg-transparent border border-gray-200 rounded text-center outline-none focus:border-blue-500 text-sm font-medium" /></td>
                        <td className="p-2"><input value={a.twoBed} onChange={e => handleAmenityChange(a.id, 'twoBed', e.target.value)} className="w-16 p-2 bg-transparent border border-gray-200 rounded text-center outline-none focus:border-blue-500 text-sm font-medium" /></td>
                        <td className="p-2"><input value={a.threeBed} onChange={e => handleAmenityChange(a.id, 'threeBed', e.target.value)} className="w-16 p-2 bg-transparent border border-gray-200 rounded text-center outline-none focus:border-blue-500 text-sm font-medium" /></td>
                        <td className="p-2"><button onClick={() => handleRemoveAmenity(a.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* 3. PRICING */}
          {activeTab === 'pricing' && (
            <motion.div key="pricing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">Pricing Packages</h2>
                <button onClick={handleAddPricingBox} className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-black shadow-md">
                  <Plus size={16} /> New Category
                </button>
              </div>

              <div className="space-y-8">
                {pricingBoxes.map(box => (
                  <div key={box.id} className="p-5 border border-blue-100 bg-blue-50/30 rounded-2xl relative group">
                    <button onClick={() => handleRemovePricingBox(box.id)} className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                    
                    <input 
                      value={box.category} onChange={e => handleCategoryChange(box.id, e.target.value)}
                      className="w-full md:w-3/4 p-2 text-lg font-bold text-blue-900 bg-transparent outline-none border-b border-transparent focus:border-blue-300 mb-4"
                      placeholder="Category Name"
                    />

                    <div className="space-y-2 mb-4">
                      {box.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                          <input 
                            value={item.type} onChange={e => handlePricingChange(box.id, idx, 'type', e.target.value)}
                            className="flex-1 p-2 outline-none font-medium text-gray-700" placeholder="e.g. Studio"
                          />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">AED</span>
                            <input 
                              type="number" value={item.price} onChange={e => handlePricingChange(box.id, idx, 'price', e.target.value)}
                              className="w-32 pl-12 pr-4 py-2 bg-gray-50 rounded-lg outline-none font-bold text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button onClick={() => handleRemovePricingItem(box.id, idx)} className="p-2 text-gray-300 hover:text-red-500"><X size={18}/></button>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => handleAddPricingItem(box.id)} className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800">
                      <Plus size={16} /> Add Price Row
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 4. TERMS */}
          {activeTab === 'terms' && (
            <motion.div key="terms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4 mb-6">Terms & Conditions</h2>
              <textarea 
                rows={10} 
                value={termsText} 
                onChange={e => setTermsText(e.target.value)} 
                className="w-full p-6 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-medium leading-relaxed" 
                placeholder="Enter your terms and conditions here..."
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// X Icon for quick delete
function X({ size }: { size: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}