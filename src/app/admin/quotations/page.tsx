'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    setIsMounted(true);
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); 
    
    setQuoteNo(`ASBN/DXB-Q${yy}${mm}-${random}`);
    setDate(today.toISOString().split('T')[0]);
  }, []);

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

      const saveRes = await saveQuotationRecord({
        quote_no: quoteNo,
        company_name: customerName,
        quote_date: date,
        pdf_url: uploadData.secure_url
      });

      if (!saveRes.success) throw new Error(saveRes.error);

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${quoteNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert("Quotation saved & downloaded successfully! 🎉");
      
    } catch (error: unknown) {
      console.error("Process Error:", error);
        if (error instanceof Error) {
            alert("Failed to process quotation: " + error.message);
        } else {
            alert("An unknown error occurred while processing the quotation.");
        }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen pb-20 p-2 md:p-6 max-w-[1600px] mx-auto">
      {/* ... (JSX remains the same) */}
    </div>
  );
}
