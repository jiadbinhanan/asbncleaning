"use server";

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 1. Cloudinary Signature Generator for MONTHLY Invoices
 * এটি ক্লাউডিনারিতে 'invoices/Company_Name' ফোল্ডারে 'invoice_id' নামে ফাইল সেভ করার অনুমতি দেবে।
 */
export async function getInvoiceUploadSignature(companyName: string, invoiceNo: string) {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Clean company name for folder creation (remove special chars, spaces to underscores)
  const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const folderPath = `invoices/${safeCompanyName}`;

  // Format the invoice number to be safely used as a filename
  const safeInvoiceNo = invoiceNo.replace(/\//g, "-");

  const signature = cloudinary.utils.api_sign_request(
    { 
      timestamp: timestamp, 
      folder: folderPath,
      public_id: safeInvoiceNo // This sets the exact filename in Cloudinary
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return { 
    timestamp, 
    signature, 
    folderPath,
    publicId: safeInvoiceNo,
    apiKey: process.env.CLOUDINARY_API_KEY, 
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 
  };
}

/**
 * 2. Cloudinary Signature Generator for INSTANT Invoices
 * এটি ক্লাউডিনারিতে 'instant_invoices/Customer_Name' ফোল্ডারে ফাইল সেভ করার অনুমতি দেবে।
 */
export async function getInstantInvoiceUploadSignature(customerName: string, invoiceNo: string) {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Clean customer name for folder creation
  const safeName = (customerName || "Walk_In").replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const folderPath = `instant_invoices/${safeName}`;

  const safeInvoiceNo = invoiceNo.replace(/\//g, "-");

  const signature = cloudinary.utils.api_sign_request(
    { 
      timestamp: timestamp, 
      folder: folderPath,
      public_id: safeInvoiceNo
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return { 
    timestamp, 
    signature, 
    folderPath,
    publicId: safeInvoiceNo,
    apiKey: process.env.CLOUDINARY_API_KEY, 
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 
  };
}