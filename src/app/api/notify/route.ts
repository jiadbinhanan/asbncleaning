// src/app/api/notify/route.ts
// Called by the agent duty page on shift start and shift complete
// Finds driver's push subscription and sends a Web Push notification

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// ── Init web-push ──────────────────────────────────────────────────────────
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,          // e.g. "mailto:admin@btmcleaning.com"
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// ── Init Supabase (service role — no RLS) ─────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, unitNumber, message, type = "shift_complete" } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    // 1. Find all driver profiles with a push_subscription saved
    const { data: drivers, error } = await supabase
      .from("profiles")
      .select("id, full_name, push_subscription")
      .eq("role", "driver")
      .not("push_subscription", "is", null);

    if (error) throw error;
    if (!drivers || drivers.length === 0) {
      return NextResponse.json({ sent: 0, message: "No drivers with push subscriptions" });
    }

    // 2. Build notification payload based on type
    let notifTitle: string;
    let notifBody: string;
    let notifTag: string;

    if (type === "shift_start") {
      notifTitle = `🧹 Cleaning Started`;
      notifBody  = message || `Unit ${unitNumber} cleaning has started.`;
      notifTag   = `shift-start-${bookingId}`;
    } else {
      notifTitle = `📦 Ready for Pickup`;
      notifBody  = message || `Unit ${unitNumber} cleaning complete. Bags ready for pickup.`;
      notifTag   = `pickup-${bookingId}`;
    }

    const payload = JSON.stringify({
      title:  notifTitle,
      body:   notifBody,
      icon:   "/logo_btm-192.png",
      badge:  "/badge-96.png",
      url:    `/driver/dashboard`,
      tag:    notifTag,
    });

    // 3. Send to all drivers
    const results = await Promise.allSettled(
      drivers.map(async (driver) => {
        const sub = driver.push_subscription as webpush.PushSubscription;
        try {
          await webpush.sendNotification(sub, payload);
          return { driverId: driver.id, status: "sent" };
        } catch (err: any) {
          // 410 Gone / 404 = subscription expired/revoked → clean up DB
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("profiles")
              .update({ push_subscription: null })
              .eq("id", driver.id);
            return { driverId: driver.id, status: "removed_stale" };
          }
          throw err;
        }
      })
    );

    const sent   = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    return NextResponse.json({ sent, failed, total: drivers.length });
  } catch (err: any) {
    console.error("[/api/notify] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
