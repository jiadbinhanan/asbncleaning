"use client";
import { useState, useEffect } from "react";
import { Truck, Bell, BellOff, RefreshCcw, LogOut, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface DriverHeaderProps {
  profile: any;
  totalActive: number;
  toDrop: number;
  readyPickup: number;
  refreshing: boolean;
  onRefresh: () => void;
}

type NotifState = "unsupported" | "default" | "granted" | "denied" | "subscribing";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function DriverHeader({
  profile, totalActive, toDrop, readyPickup, refreshing, onRefresh,
}: DriverHeaderProps) {
  const supabase = createClient();
  const router = useRouter();
  const [notifState, setNotifState] = useState<NotifState>("unsupported");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const p = Notification.permission;
    setNotifState(p === "granted" ? "granted" : p === "denied" ? "denied" : "default");
  }, []);

  const handleBellClick = async () => {
    // ── Granted → user wants to turn OFF ──────────────────────────────────
    if (notifState === "granted") {
      // JS cannot revoke permission. Remove DB subscription + guide user.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("profiles")
          .update({ push_subscription: null })
          .eq("id", session.user.id);
      }
      // Try programmatic revoke (Firefox supports this, Chrome does not)
      try {
        if ("permissions" in navigator && typeof (navigator.permissions as any).revoke === "function") {
          await (navigator.permissions as any).revoke({ name: "notifications" });
          setNotifState("default");
          return;
        }
      } catch { /* not supported */ }

      // Fallback: show instruction
      alert(
        "To turn off notifications:\n\n" +
        "Tap the 🔒 lock icon in your browser's address bar\n" +
        "→ Notifications → Block\n" +
        "→ Reload the page\n\n" +
        "(Your push subscription has been removed from our server.)"
      );
      return;
    }

    // ── Denied → guide user to browser settings ────────────────────────────
    if (notifState === "denied") {
      alert(
        "Notifications are blocked by your browser.\n\n" +
        "To allow: tap the 🔒 lock icon in your address bar\n" +
        "→ Notifications → Allow → Reload the page."
      );
      return;
    }

    // ── Default → request permission + subscribe ───────────────────────────
    setNotifState("subscribing");
    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        setNotifState("granted");

        if ("serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
              console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
            } else {
              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey),
              });
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                await supabase.from("profiles")
                  .update({ push_subscription: sub.toJSON() })
                  .eq("id", session.user.id);
              }
            }
          } catch (e) {
            console.error("Push subscription failed:", e);
          }
        }
      } else {
        setNotifState(permission === "denied" ? "denied" : "default");
      }
    } catch (e) {
      console.error("Notification request error:", e);
      setNotifState("default");
    }
  };

  // Bell config per state
  const bellCfg: Record<NotifState, { icon: React.ReactNode; cls: string; title: string }> = {
    unsupported: {
      icon: <BellOff size={16}/>,
      cls: "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed opacity-50",
      title: "Push notifications not supported in this browser",
    },
    default: {
      icon: <BellOff size={16}/>,
      cls: "bg-gray-50 text-gray-400 border-gray-200 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200",
      title: "Click to enable push notifications",
    },
    granted: {
      icon: <Bell size={16}/>,
      cls: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200",
      title: "Notifications ON — click to turn off",
    },
    denied: {
      icon: <BellOff size={16}/>,
      cls: "bg-red-50 text-red-500 border-red-200 hover:bg-red-100",
      title: "Notifications blocked — click for instructions",
    },
    subscribing: {
      icon: <Loader2 size={16} className="animate-spin"/>,
      cls: "bg-blue-50 text-blue-400 border-blue-200",
      title: "Setting up notifications...",
    },
  };
  const bell = bellCfg[notifState];

  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        {/* Left: avatar + name */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Truck size={20} className="text-white"/>
            </div>
            {totalActive > 0 && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
              >
                <span className="text-[9px] font-black text-white">{totalActive}</span>
              </motion.div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">BTM Driver</p>
            <h1 className="text-base font-black text-gray-900 leading-tight">
              {profile?.full_name || "Driver"}
            </h1>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBellClick}
            disabled={notifState === "unsupported" || notifState === "subscribing"}
            title={bell.title}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${bell.cls}`}
          >
            {bell.icon}
          </button>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-all"
          >
            <RefreshCcw size={15} className={refreshing ? "animate-spin text-blue-500" : ""}/>
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/agent/login"); }}
            className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
          >
            <LogOut size={15}/>
          </button>
        </div>
      </div>

      {/* Denied warning */}
      {notifState === "denied" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-2 flex items-center gap-2"
        >
          <BellOff size={12} className="text-red-400 shrink-0"/>
          <p className="text-[11px] font-bold text-red-600">
            Notifications blocked. Tap 🔒 in address bar → allow → reload page.
          </p>
        </motion.div>
      )}

      {/* Date + pills */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400">{format(new Date(), "EEEE, dd MMM yyyy")}</p>
        <div className="flex gap-1.5">
          {toDrop > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="text-[10px] font-black bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded-full">
              {toDrop} drop
            </motion.span>
          )}
          {readyPickup > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {readyPickup} pickup
            </motion.span>
          )}
          {toDrop === 0 && readyPickup === 0 && (
            <span className="text-[10px] font-black bg-gray-100 text-gray-400 border border-gray-200 px-2.5 py-0.5 rounded-full">
              All clear
            </span>
          )}
        </div>
      </div>
    </div>
  );
}