"use server";

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Supabase Admin Setup (For Bypassing RLS on Insert) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase configuration.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * 1. Cloudinary Signature Generator for Quotations
 */
export async function getQuotationUploadSignature() {
  const timestamp = Math.round(new Date().getTime() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    { timestamp: timestamp, folder: "quotations" },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
}

/**
 * 2. Delete Quotation — Cloudinary থেকে PDF মুছবে, তারপর Supabase থেকে record মুছবে।
 * pdf_url থেকে public_id extract করা হয়।
 * Cloudinary-তে PDF গুলো resource_type "raw" হিসেবে upload হয়েছে।
 */
export async function deleteQuotationRecord(data: {
  id: string;
  pdf_url: string;
}) {
  try {
    // pdf_url থেকে public_id বের করা
    // e.g. https://res.cloudinary.com/xxx/image/upload/v123/quotations/abcdef.pdf
    // → public_id = "quotations/abcdef"
    const urlParts = data.pdf_url.split("/upload/");
    if (urlParts.length === 2) {
      const afterUpload = urlParts[1]; // "v123/quotations/abcdef.pdf"
      const withoutVersion = afterUpload.replace(/^v\d+\//, ""); // "quotations/abcdef.pdf"
      const publicId = withoutVersion.replace(/\.[^/.]+$/, ""); // "quotations/abcdef"

      // Cloudinary থেকে delete — resource_type "raw" try করি আগে, না হলে "image"
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      } catch {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      }
    }

    // Supabase থেকে record delete
    const { error } = await supabaseAdmin
      .from("quotations")
      .delete()
      .eq("id", data.id);

    if (error) {
      console.error("Quotation Delete Error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unknown error occurred" };
  }
}

/**
 * 3. Save Quotation Record to Supabase
 * template_id tracks which template was used to generate this quotation.
 */
export async function saveQuotationRecord(data: {
  quote_no: string;
  company_name: string;
  quote_date: string;
  pdf_url: string;
  template_id: string | null;  // ← নতুন field
}) {
  try {
    const { error } = await supabaseAdmin
      .from("quotations")
      .insert([
        {
          quote_no: data.quote_no,
          company_name: data.company_name,
          quote_date: data.quote_date,
          pdf_url: data.pdf_url,
          template_id: data.template_id,  // ← নতুন field
        },
      ]);

    if (error) {
      console.error("Quotation Save Error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: "An unknown error occurred" };
  }
}