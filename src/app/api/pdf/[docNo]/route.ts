import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service role client — only runs server-side, never exposed to browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docNo: string }> }
) {
  // Next.js 15: params is a Promise — must be awaited
  const { docNo: rawDocNo } = await params;
  const docNo = decodeURIComponent(rawDocNo);
  const download = request.nextUrl.searchParams.get("dl") === "1";

  // ── Step 1: Find pdf_url across all three tables ──────────────────────────
  let pdfUrl: string | null = null;

  // 1a. Monthly invoices
  const { data: monthly } = await supabase
    .from("invoices")
    .select("pdf_url")
    .eq("invoice_no", docNo)
    .maybeSingle();

  if (monthly?.pdf_url) pdfUrl = monthly.pdf_url;

  // 1b. Instant invoices
  if (!pdfUrl) {
    const { data: instant } = await supabase
      .from("instant_invoices")
      .select("pdf_url")
      .eq("invoice_no", docNo)
      .maybeSingle();

    if (instant?.pdf_url) pdfUrl = instant.pdf_url;
  }

  // 1c. Quotations
  if (!pdfUrl) {
    const { data: quotation } = await supabase
      .from("quotations")
      .select("pdf_url")
      .eq("quote_no", docNo)
      .maybeSingle();

    if (quotation?.pdf_url) pdfUrl = quotation.pdf_url;
  }

  // ── Step 2: Not found ─────────────────────────────────────────────────────
  if (!pdfUrl) {
    return new NextResponse("PDF not found.", { status: 404 });
  }

  // ── Step 3: Fetch PDF from Cloudinary (server-side only) ──────────────────
  let cloudRes: Response;
  try {
    cloudRes = await fetch(pdfUrl, { cache: "no-store" });
  } catch {
    return new NextResponse("Failed to reach storage.", { status: 502 });
  }

  if (!cloudRes.ok) {
    return new NextResponse("PDF unavailable.", { status: 502 });
  }

  // ── Step 4: Stream to browser — Cloudinary URL never reaches the client ───
  const safeFilename = `${docNo.replace(/\//g, "-")}.pdf`;

  return new NextResponse(cloudRes.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": download
        ? `attachment; filename="${safeFilename}"`
        : `inline; filename="${safeFilename}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}