"use client";
import { motion } from "framer-motion";
import { Users, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function TeamLogin() {
  return (
    <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
      {/* Abstract Shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500 rounded-full blur-[100px] opacity-20"></div>

      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-10">
        
        <div className="md:w-1/2 space-y-6">
          <h2 className="text-4xl font-bold">For Cleaning Agents & Teams</h2>
          <p className="text-gray-400 text-lg">
            Access your daily schedule, checklists, and upload work evidence directly from here.
            Stay organized and efficient.
          </p>
        </div>

        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="md:w-1/3 w-full bg-white/10 backdrop-blur-lg border border-white/10 p-8 rounded-3xl"
        >
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                    <Users size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold">Team Portal</h3>
                    <p className="text-gray-400 text-sm">Secure Access</p>
                </div>
            </div>

            <Link href="/login?role=agent">
                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    Team Login
                    <ArrowRight size={18} />
                </button>
            </Link>
        </motion.div>
      </div>
    </section>
  );
}