// src/app/api/notify/route.ts
// Called by the agent duty page after booking is marked completed
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
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // service role key, NOT anon key
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, unitNumber, buildingName, companyName, message } = body;

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

    // 2. Build notification payload
    const notifTitle = `📦 Ready for Pickup`;
    const notifBody  = message || `Unit ${unitNumber} — ${companyName} cleaning complete. Bags ready.`;
    const notifUrl   = `/driver/dashboard`;

    const payload = JSON.stringify({
      title:  notifTitle,
      body:   notifBody,
      icon:   "/icon-192.png",
      badge:  "/badge-96.png",
      url:    notifUrl,
      tag:    `pickup-${bookingId}`,      // replaces any previous notification for same booking
    });

    // 3. Send to all drivers
    const results = await Promise.allSettled(
      drivers.map(async (driver) => {
        const sub = driver.push_subscription as webpush.PushSubscription;
        try {
          await webpush.sendNotification(sub, payload);
          return { driverId: driver.id, status: "sent" };
        } catch (err: any) {
          // 410 Gone = subscription expired/revoked → clean up DB
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

    const sent    = results.filter(r => r.status === "fulfilled").length;
    const failed  = results.filter(r => r.status === "rejected").length;

    return NextResponse.json({ sent, failed, total: drivers.length });
  } catch (err: any) {
    console.error("[/api/notify] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}