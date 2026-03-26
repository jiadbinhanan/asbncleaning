"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Boxes, Truck, Warehouse, Loader2 } from "lucide-react";
import { format } from "date-fns";

import DriverHeader     from "@/components/driver/DriverHeader";
import MorningLoadSheet from "@/components/driver/MorningLoadSheet";
import LiveStatusTabs   from "@/components/driver/LiveStatusTabs";
import UnloadSummary    from "@/components/driver/UnloadSummary";
import { BookingRow, LoadItem, ReturnItem } from "@/components/driver/types";

// ─── Tab config ───────────────────────────────────────────────────────────────
type TabKey = "dispatch" | "status" | "returns";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "dispatch", label: "Load",    icon: <Boxes size={14}/>   },
  { key: "status",   label: "Live",    icon: <Truck size={14}/>   },
  { key: "returns",  label: "Returns", icon: <Warehouse size={14}/> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DriverDashboardPage() {
  const supabase = createClient();
  const router   = useRouter();
  const today    = format(new Date(), "yyyy-MM-dd");

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [profile,           setProfile]           = useState<any>(null);
  const [bookings,          setBookings]          = useState<BookingRow[]>([]);
  const [loadItems,         setLoadItems]         = useState<LoadItem[]>([]);
  const [todayLoad,         setTodayLoad]         = useState<any>(null);
  const [returnSummary,     setReturnSummary]     = useState<ReturnItem[]>([]);
  const [activeTab,         setActiveTab]         = useState<TabKey>("dispatch");
  const [actionLoading,     setActionLoading]     = useState<number | null>(null);
  const [loadConfirming,    setLoadConfirming]    = useState(false);
  const [unloadConfirming,  setUnloadConfirming]  = useState(false);

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/agent/login"); return; }
    const driverId = session.user.id;

    // 1. Parallel top-level fetches
    const [profileRes, bookingsRes, loadRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", driverId).single(),

      // Bookings joined with logistics logs in a single query
      supabase
        .from("bookings")
        .select(`
          id, booking_ref, cleaning_time, status, work_status,
          units ( id, unit_number, building_name, companies ( name ) ),
          teams:assigned_team_id ( team_name ),
          driver_logistics_logs ( log_type )
        `)
        .eq("cleaning_date", today)
        .in("status", ["active", "completed"])
        .order("cleaning_time"),

      supabase
        .from("driver_daily_loads")
        .select("*")
        .eq("load_date", today)
        .eq("driver_id", driverId)
        .maybeSingle(),
    ]);

    // Profile
    if (profileRes.data) setProfile(profileRes.data);

    // Today's load
    if (loadRes.data) setTodayLoad(loadRes.data);

    // Bookings → map to BookingRow
    let rows: BookingRow[] = [];
    if (bookingsRes.data) {
      rows = (bookingsRes.data as any[]).map(b => {
        const logTypes: string[] = (b.driver_logistics_logs || []).map((l: any) => l.log_type);
        return {
          id:           b.id,
          booking_ref:  b.booking_ref,
          cleaning_time: b.cleaning_time,
          status:       b.status,
          work_status:  b.work_status,
          unit_number:  b.units?.unit_number || "—",
          building_name: b.units?.building_name || "—",
          company_name: b.units?.companies?.name?.trim() || "Unknown",
          team_name:    b.teams?.team_name || null,
          is_delivered: logTypes.includes("drop_off"),
          is_collected: logTypes.includes("bags_collected"),
        };
      });
      setBookings(rows);
    }

    // 2. Suggested load (only if no confirmed load today)
    if (!loadRes.data) {
      const activeUnitIds = (bookingsRes.data as any[] || [])
        .filter(b => b.status === "active")
        .map(b => b.units?.id)
        .filter(Boolean);

      if (activeUnitIds.length > 0) {
        const { data: cfgData } = await supabase
          .from("unit_equipment_config")
          .select("standard_qty, equipment_id, unit_id, equipment_master(id, item_name, item_type)")
          .in("unit_id", activeUnitIds);

        const agg: Record<number, LoadItem> = {};
        (cfgData || []).forEach((cfg: any) => {
          const em = cfg.equipment_master;
          if (!em) return;
          if (!agg[em.id]) agg[em.id] = {
            equipment_id: em.id, item_name: em.item_name,
            item_type: em.item_type, suggested_qty: 0, extra_qty: 0,
          };
          agg[em.id].suggested_qty += cfg.standard_qty || 0;
        });
        setLoadItems(Object.values(agg).sort((a, b) => a.item_type.localeCompare(b.item_type)));
      }
    }

    // 3. Return summary from completed bookings
    const completedIds = rows.filter(b => b.status === "completed").map(b => b.id);
    if (completedIds.length > 0) {
      const { data: returnData } = await supabase
        .from("booking_inventory_logs")
        .select("collected_qty, qc_good_qty, qc_bad_qty, equipment_master(item_name, item_type)")
        .in("booking_id", completedIds)
        .gt("collected_qty", 0);

      const agg: Record<string, ReturnItem> = {};
      (returnData || []).forEach((row: any) => {
        const name = row.equipment_master?.item_name;
        if (!name) return;
        if (!agg[name]) agg[name] = {
          item_name: name, item_type: row.equipment_master?.item_type,
          collected: 0, qc_good: 0, qc_bad: 0,
        };
        agg[name].collected += row.collected_qty || 0;
        agg[name].qc_good   += row.qc_good_qty   || 0;
        agg[name].qc_bad    += row.qc_bad_qty     || 0;
      });
      setReturnSummary(Object.values(agg));
    } else {
      setReturnSummary([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [today, supabase, router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-navigate to Live tab after load confirm
  useEffect(() => {
    if (todayLoad && activeTab === "dispatch") {
      // small delay so user sees the confirmed state briefly
      const t = setTimeout(() => setActiveTab("status"), 1200);
      return () => clearTimeout(t);
    }
  }, [todayLoad]);

  // ── Derived sections ───────────────────────────────────────────────────────
  const toDrop      = bookings.filter(b => b.status === "active"    && !b.is_delivered);
  const inProgress  = bookings.filter(b => b.status === "active"    &&  b.is_delivered);
  const readyPickup = bookings.filter(b => b.status === "completed" && !b.is_collected);
  const done        = bookings.filter(b => b.status === "completed" &&  b.is_collected);
  const totalActive = toDrop.length + inProgress.length + readyPickup.length;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDeliver = async (bookingId: number) => {
    setActionLoading(bookingId);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("driver_logistics_logs").insert({
      booking_id: bookingId, driver_id: session?.user.id, log_type: "drop_off",
    });
    // Optimistic update
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, is_delivered: true } : b
    ));
    setActionLoading(null);
  };

  const handleCollect = async (bookingId: number) => {
    setActionLoading(bookingId);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("driver_logistics_logs").insert({
      booking_id: bookingId, driver_id: session?.user.id, log_type: "bags_collected",
    });
    // Optimistic update + refresh returns
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, is_collected: true } : b
    ));
    setActionLoading(null);
    fetchAll(true); // silent refresh to update return summary
  };

  const handleConfirmLoad = async () => {
    setLoadConfirming(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase.from("driver_daily_loads").upsert({
      load_date:     today,
      driver_id:     session?.user.id,
      standard_load: loadItems.map(i => ({
        equipment_id: i.equipment_id, item_name: i.item_name,
        item_type: i.item_type, suggested_qty: i.suggested_qty,
      })),
      extra_taken: loadItems
        .filter(i => i.extra_qty > 0)
        .map(i => ({ equipment_id: i.equipment_id, item_name: i.item_name, extra_qty: i.extra_qty })),
    }, { onConflict: "load_date,driver_id" }).select().single();
    if (data) setTodayLoad(data);
    setLoadConfirming(false);
  };

  const handleConfirmUnload = async () => {
    if (!todayLoad) return;
    setUnloadConfirming(true);
    await supabase.from("driver_daily_loads")
      .update({ unload_confirmed_at: new Date().toISOString() })
      .eq("id", todayLoad.id);
    setTodayLoad((p: any) => ({ ...p, unload_confirmed_at: new Date().toISOString() }));
    setUnloadConfirming(false);
  };

  const handleUpdateExtra = (id: number, delta: number) =>
    setLoadItems(prev => prev.map(i =>
      i.equipment_id === id ? { ...i, extra_qty: Math.max(0, i.extra_qty + delta) } : i
    ));

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25"
      >
        <Truck size={24} className="text-white"/>
      </motion.div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Driver Panel</p>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-32 overflow-x-hidden">

      {/* Header */}
      <DriverHeader
        profile={profile}
        totalActive={totalActive}
        toDrop={toDrop.length}
        readyPickup={readyPickup.length}
        refreshing={refreshing}
        onRefresh={() => fetchAll(true)}
      />

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-4 py-2.5">
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {TABS.map(tab => {
            // red dot indicators
            const hasDot =
              (tab.key === "dispatch" && !todayLoad) ||
              (tab.key === "status"   && readyPickup.length > 0) ||
              (tab.key === "returns"  && returnSummary.length > 0 && !todayLoad?.unload_confirmed_at);

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.icon} {tab.label}
                {hasDot && (
                  <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"/>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="px-4 pt-5 pb-10">
        <AnimatePresence mode="wait">

          {activeTab === "dispatch" && (
            <motion.div key="dispatch"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <MorningLoadSheet
                loadItems={loadItems}
                todayLoad={todayLoad}
                activeBookingCount={toDrop.length + inProgress.length}
                onUpdateExtra={handleUpdateExtra}
                onConfirmLoad={handleConfirmLoad}
                onConfirmUnload={handleConfirmUnload}
                loadConfirming={loadConfirming}
                unloadConfirming={unloadConfirming}
              />
            </motion.div>
          )}

          {activeTab === "status" && (
            <motion.div key="status"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {bookings.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl py-16 flex flex-col items-center gap-3 shadow-sm">
                  <Truck size={48} className="text-gray-200"/>
                  <p className="text-sm font-black text-gray-400">No active bookings today</p>
                  <p className="text-xs font-bold text-gray-300">Check back after supervisor activates jobs</p>
                </div>
              ) : (
                <LiveStatusTabs
                  toDrop={toDrop}
                  inProgress={inProgress}
                  readyPickup={readyPickup}
                  done={done}
                  onDeliver={handleDeliver}
                  onCollect={handleCollect}
                  actionLoading={actionLoading}
                />
              )}
            </motion.div>
          )}

          {activeTab === "returns" && (
            <motion.div key="returns"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <UnloadSummary
                returnSummary={returnSummary}
                todayLoad={todayLoad}
                onConfirmUnload={handleConfirmUnload}
                unloadConfirming={unloadConfirming}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}