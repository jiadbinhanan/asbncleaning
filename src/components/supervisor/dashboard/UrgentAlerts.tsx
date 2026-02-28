"use client";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function UrgentAlerts({ pendingReviewCount }: { pendingReviewCount: number }) {
  return (
    <AnimatePresence>
      {pendingReviewCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3 text-red-700 font-bold">
            <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertTriangle className="animate-pulse" size={20}/></div>
            <p>Action Needed: <span className="font-black text-red-600 text-lg">{pendingReviewCount}</span> completed works are waiting for your final pricing review!</p>
          </div>
          <Link href="/supervisor/reviews" className="w-full md:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-black rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
            Review Now <ArrowRight size={16}/>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
