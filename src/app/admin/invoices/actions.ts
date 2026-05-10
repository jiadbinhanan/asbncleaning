"use server";

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Supabase Admin Client ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// Cloudinary URL Parser
//
// Live URL examples from this project:
//   invoices:        .../depm89vip/image/upload/v17.../invoices/COMP/BTM-xxx.pdf
//   instant_invoices:.../depm89vip/image/upload/v17.../instant_invoices/NAME/BTM-xxx.pdf
//
// IMPORTANT: Even though these are PDFs, Cloudinary stores them as resource_type
// "image" because they were uploaded via /auto/upload. The resource_type is
// embedded in the URL path at position [2] (after cloud_name).
//
// Returns: { publicId, resourceType } parsed directly from the URL.
// ─────────────────────────────────────────────────────────────────────────────
function parseCloudinaryUrl(pdfUrl: string): {
  publicId: string;
  resourceType: "image" | "raw" | "video";
} | null {
  try {
    const parsed = new URL(pdfUrl);
    // pathname: /<cloud_name>/<resource_type>/upload/v<ver>/<folder>/<file>.pdf
    const segments = parsed.pathname.split("/").filter(Boolean);
    // segments: [cloud_name, resource_type, "upload", "vNNN", ...path_parts]
    const uploadIdx = segments.indexOf("upload");
    if (uploadIdx < 2) return null;

    const resourceType = segments[uploadIdx - 1] as "image" | "raw" | "video";

    // Everything after "upload/" — drop leading version segment vNNNNNN
    const afterUpload = segments
      .slice(uploadIdx + 1)
      .join("/")
      .replace(/^v\d+\//, "");

    // Strip file extension to get clean public_id
    const publicId = afterUpload.replace(/\.[^/.]+$/, "");

    if (!publicId) return null;
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Robust Cloudinary Delete
//
// Strategy:
//   1. Parse resource_type from the URL (most reliable — it's in the URL itself)
//   2. Try destroy with that resource_type first
//   3. If result is not "ok", fall back to the other two types
//      (handles edge cases: legacy uploads, Cloudinary reclassification)
//
// "not found" is treated as success — file is already gone.
// ─────────────────────────────────────────────────────────────────────────────
async function deleteFromCloudinary(pdfUrl: string): Promise<void> {
  const parsed = parseCloudinaryUrl(pdfUrl);
  if (!parsed) return; // Unrecognised URL — skip silently

  const { publicId, resourceType } = parsed;
  const allTypes: Array<"image" | "raw" | "video"> = ["image", "raw", "video"];

  // Try the URL-indicated type first, then the others as fallback
  const orderedTypes = [
    resourceType,
    ...allTypes.filter((t) => t !== resourceType),
  ];

  for (const type of orderedTypes) {
    try {
      const res = await cloudinary.uploader.destroy(publicId, {
        resource_type: type,
      });
      // "ok" = deleted, "not found" = already gone — both are success states
      if (res.result === "ok" || res.result === "not found") return;
    } catch {
      // Network / auth error on this type — try next
    }
  }
  // All types tried — file may be gone already or URL was invalid. Continue.
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Upload Signature — Monthly Invoices
// ─────────────────────────────────────────────────────────────────────────────
export async function getInvoiceUploadSignature(
  companyName: string,
  invoiceNo: string
) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const safeCompanyName = companyName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_");
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
export async function getInstantInvoiceUploadSignature(
  customerName: string,
  invoiceNo: string
) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const safeName = (customerName || "Walk_In")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_");
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
//  a) Safety: paid invoices cannot be deleted
//  b) Delete PDF from Cloudinary (resource_type read from URL → "image")
//  c) Reset bookings.invoice_no → NULL
//  d) Reset instant_invoices.merged_into_monthly → false
//  e) Delete the invoice row
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteMonthlyInvoice(invoiceId: string) {
  const { data: inv, error: fetchErr } = await supabaseAdmin
    .from("invoices")
    .select("id, invoice_no, pdf_url, booking_ids, instant_invoice_ids, is_paid")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !inv) return { success: false, error: "Invoice not found." };
  if (inv.is_paid)
    return { success: false, error: "Paid invoices cannot be deleted." };

  // Delete PDF — resource_type "image" (confirmed from live Cloudinary URLs)
  if (inv.pdf_url) {
    await deleteFromCloudinary(inv.pdf_url);
  }

  // Reset bookings
  const bookingIds: number[] = inv.booking_ids || [];
  if (bookingIds.length > 0) {
    await supabaseAdmin
      .from("bookings")
      .update({ invoice_no: null })
      .in("id", bookingIds);
  }

  // Unmerge instant invoices
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

  if (delErr)
    return { success: false, error: "Failed to delete record: " + delErr.message };

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DELETE — Instant Invoice
//
//  a) Safety: paid invoices cannot be deleted
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
  if (inv.is_paid)
    return { success: false, error: "Paid invoices cannot be deleted." };

  // Delete PDF — resource_type "image" (confirmed from live Cloudinary URLs)
  if (inv.pdf_url) {
    await deleteFromCloudinary(inv.pdf_url);
  }

  const { error: delErr } = await supabaseAdmin
    .from("instant_invoices")
    .delete()
    .eq("id", invoiceId);

  if (delErr)
    return { success: false, error: "Failed to delete: " + delErr.message };

  return { success: true };
}