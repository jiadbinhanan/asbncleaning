"use server";

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Supabase Admin Client (service role for secure server-side operations) ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Helper: Extracts Cloudinary public_id from a secure PDF URL.
 * e.g. "https://res.cloudinary.com/demo/raw/upload/v123/invoices/COMP/BTM-2604.pdf"
 *   =>  "invoices/COMP/BTM-2604"
 */
function extractPublicId(pdfUrl: string): string | null {
  try {
    const url = new URL(pdfUrl);
    const parts = url.pathname.split("/upload/");
    if (parts.length < 2) return null;
    const afterUpload = parts[1].replace(/^v\d+\//, "");
    return afterUpload.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Upload Signature — Monthly Invoices
// ─────────────────────────────────────────────────────────────────────────────
export async function getInvoiceUploadSignature(companyName: string, invoiceNo: string) {
  const timestamp = Math.round(new Date().getTime() / 1000);

  const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const folderPath = `invoices/${safeCompanyName}`;
  const safeInvoiceNo = invoiceNo.replace(/\//g, "-");

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: folderPath, public_id: safeInvoiceNo },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    folderPath,
    publicId: safeInvoiceNo,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Upload Signature — Instant Invoices
// ─────────────────────────────────────────────────────────────────────────────
export async function getInstantInvoiceUploadSignature(customerName: string, invoiceNo: string) {
  const timestamp = Math.round(new Date().getTime() / 1000);

  const safeName = (customerName || "Walk_In").replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const folderPath = `instant_invoices/${safeName}`;
  const safeInvoiceNo = invoiceNo.replace(/\//g, "-");

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: folderPath, public_id: safeInvoiceNo },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    folderPath,
    publicId: safeInvoiceNo,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DELETE — Monthly Invoice
//
//  a) Safety check — paid invoices cannot be deleted
//  b) Delete PDF from Cloudinary (resource_type: "raw")
//  c) Reset bookings.invoice_no => NULL
//  d) Reset instant_invoices.merged_into_monthly => false
//     using instant_invoice_ids[] stored on the invoice row
//  e) Delete the invoice row
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteMonthlyInvoice(invoiceId: string) {
  const { data: inv, error: fetchErr } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_no, pdf_url, booking_ids, instant_invoice_ids, is_paid")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !inv) return { success: false, error: "Invoice not found." };
  if (inv.is_paid) return { success: false, error: "Paid invoices cannot be deleted." };

  // Delete PDF from Cloudinary
  if (inv.pdf_url) {
    const publicId = extractPublicId(inv.pdf_url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      } catch {
        // Continue even if Cloudinary delete fails
      }
    }
  }

  // Reset bookings — clear invoice_no so they become re-invoiceable
  const bookingIds: number[] = inv.booking_ids || [];
  if (bookingIds.length > 0) {
    await supabaseAdmin
      .from("bookings")
      .update({ invoice_no: null })
      .in("id", bookingIds);
  }

  // Unmerge instant invoices using the tracked IDs
  const instantInvoiceIds: string[] = inv.instant_invoice_ids || [];
  if (instantInvoiceIds.length > 0) {
    await supabaseAdmin
      .from("instant_invoices")
      .update({ merged_into_monthly: false })
      .in("id", instantInvoiceIds);
  }

  // Delete invoice row
  const { error: delErr } = await supabaseAdmin
    .from("invoices")
    .delete()
    .eq("id", invoiceId);

  if (delErr) return { success: false, error: "Failed to delete record: " + delErr.message };

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DELETE — Instant Invoice
//
//  a) Safety check — paid invoices cannot be deleted
//  b) Delete PDF from Cloudinary
//  c) Delete the instant_invoices row
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteInstantInvoice(invoiceId: string) {
  const { data: inv, error: fetchErr } = await supabaseAdmin
    .from("instant_invoices")
    .select("id, invoice_no, pdf_url, is_paid")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !inv) return { success: false, error: "Invoice not found." };
  if (inv.is_paid) return { success: false, error: "Paid invoices cannot be deleted." };

  if (inv.pdf_url) {
    const publicId = extractPublicId(inv.pdf_url);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      } catch {
        // Continue regardless
      }
    }
  }

  const { error: delErr } = await supabaseAdmin
    .from("instant_invoices")
    .delete()
    .eq("id", invoiceId);

  if (delErr) return { success: false, error: "Failed to delete: " + delErr.message };

  return { success: true };
}