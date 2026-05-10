import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Service role client — only runs server-side, never exposed to browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { docNo: string } }
) {
  const docNo = decodeURIComponent(params.docNo);
  const download = request.nextUrl.searchParams.get("dl") === "1";

  // ── Step 1: Find pdf_url by looking up docNo across all three tables ──────
  let pdfUrl: string | null = null;

  // 1a. Monthly invoices
  const { data: monthly } = await supabase
    .from("invoices")
    .select("pdf_url")
    .eq("invoice_no", docNo)
    .maybeSingle();

  if (monthly?.pdf_url) {
    pdfUrl = monthly.pdf_url;
  }

  // 1b. Instant invoices
  if (!pdfUrl) {
    const { data: instant } = await supabase
      .from("instant_invoices")
      .select("pdf_url")
      .eq("invoice_no", docNo)
      .maybeSingle();

    if (instant?.pdf_url) {
      pdfUrl = instant.pdf_url;
    }
  }

  // 1c. Quotations
  if (!pdfUrl) {
    const { data: quotation } = await supabase
      .from("quotations")
      .select("pdf_url")
      .eq("quote_no", docNo)
      .maybeSingle();

    if (quotation?.pdf_url) {
      pdfUrl = quotation.pdf_url;
    }
  }

  // ── Step 2: Not found ─────────────────────────────────────────────────────
  if (!pdfUrl) {
    return new NextResponse(
      JSON.stringify({ error: "PDF not found for: " + docNo }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Step 3: Fetch PDF from Cloudinary (server-side only) ──────────────────
  let cloudRes: Response;
  try {
    cloudRes = await fetch(pdfUrl, { cache: "no-store" });
  } catch {
    return new NextResponse(
      JSON.stringify({ error: "Failed to reach storage." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!cloudRes.ok) {
    return new NextResponse(
      JSON.stringify({ error: "PDF unavailable." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Step 4: Stream PDF to browser with clean headers ─────────────────────
  // Cloudinary URL never appears in the browser — only /api/pdf/[docNo] is visible
  const safeFilename = `${docNo.replace(/\//g, "-")}.pdf`;

  return new NextResponse(cloudRes.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": download
        ? `attachment; filename="${safeFilename}"`
        : `inline; filename="${safeFilename}"`,
      // Cache for 1 hour on the browser, but do not store on shared/CDN caches
      "Cache-Control": "private, max-age=3600",
      // Prevent search engines from indexing the PDF URL
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}