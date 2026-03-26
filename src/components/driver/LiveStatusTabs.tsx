"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, PackageCheck, CheckCheck, Loader2 } from "lucide-react";
import TaskCard from "./TaskCard";
import { BookingRow } from "./types";

interface LiveStatusTabsProps {
  toDrop: BookingRow[];
  inProgress: BookingRow[];
  readyPickup: BookingRow[];
  done: BookingRow[];
  onDeliver: (id: number) => void;
  onCollect: (id: number) => void;
  actionLoading: number | null;
}

type TabKey = "toDrop" | "inProgress" | "readyPickup" | "done";

const TABS: { key: TabKey; label: string; shortLabel: string; activeClass: string; countClass: string }[] = [
  {
    key: "toDrop",
    label: "To Drop",
    shortLabel: "Drop",
    activeClass: "bg-red-500 text-white shadow-sm shadow-red-500/30",
    countClass: "bg-red-600/80 text-white",
  },
  {
    key: "inProgress",
    label: "Working",
    shortLabel: "Work",
    activeClass: "bg-amber-400 text-white shadow-sm shadow-amber-400/30",
    countClass: "bg-amber-500/80 text-white",
  },
  {
    key: "readyPickup",
    label: "Pickup",
    shortLabel: "Pick",
    activeClass: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30",
    countClass: "bg-emerald-600/80 text-white",
  },
  {
    key: "done",
    label: "Done",
    shortLabel: "Done",
    activeClass: "bg-gray-700 text-white shadow-sm",
    countClass: "bg-gray-800/80 text-white",
  },
];

const EMPTY_MESSAGES: Record<TabKey, { icon: React.ReactNode; text: string; sub: string }> = {
  toDrop:      { icon: <Truck size={40} className="text-gray-200"/>,       text: "Nothing to drop",      sub: "All deliveries done" },
  inProgress:  { icon: <Loader2 size={40} className="text-gray-200"/>,     text: "No jobs in progress",  sub: "Awaiting team start" },
  readyPickup: { icon: <PackageCheck size={40} className="text-gray-200"/>,text: "No pickups yet",       sub: "Appears when jobs complete" },
  done:        { icon: <CheckCheck size={40} className="text-gray-200"/>,  text: "Nothing done yet",     sub: "Completed jobs show here" },
};

export default function LiveStatusTabs({
  toDrop, inProgress, readyPickup, done, onDeliver, onCollect, actionLoading,
}: LiveStatusTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("toDrop");

  const counts: Record<TabKey, number> = {
    toDrop: toDrop.length,
    inProgress: inProgress.length,
    readyPickup: readyPickup.length,
    done: done.length,
  };

  const lists: Record<TabKey, BookingRow[]> = { toDrop, inProgress, readyPickup, done };

  return (
    <div>
      {/* Summary grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl py-3 px-1 text-center transition-all border ${
              activeTab === tab.key
                ? tab.activeClass + " border-transparent scale-[1.03]"
                : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
            }`}
          >
            <p className={`text-xl font-black ${activeTab === tab.key ? "text-white" : "text-gray-700"}`}>
              {counts[tab.key]}
            </p>
            <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${activeTab === tab.key ? "text-white/80" : "text-gray-400"}`}>
              {tab.shortLabel}
            </p>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {lists[activeTab].length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl py-14 flex flex-col items-center gap-3 shadow-sm">
              {EMPTY_MESSAGES[activeTab].icon}
              <div className="text-center">
                <p className="text-sm font-black text-gray-400">{EMPTY_MESSAGES[activeTab].text}</p>
                <p className="text-xs font-bold text-gray-300 mt-0.5">{EMPTY_MESSAGES[activeTab].sub}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {lists[activeTab].map(b => (
                  <TaskCard
                    key={b.id}
                    booking={b}
                    section={activeTab}
                    onDeliver={onDeliver}
                    onCollect={onCollect}
                    actionLoading={actionLoading}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}