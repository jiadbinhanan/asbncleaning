"use client";
import { motion } from "framer-motion";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import TeamLoginForm from "@/components/auth/TeamLoginForm";

export default function TeamLoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Abstract Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back to Home Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-semibold mb-8 text-sm bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <ArrowLeft size={16} /> Back to website
        </Link>

        {/* Login Box */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[2rem] shadow-2xl shadow-black/50">
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-teal-400 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 transform -rotate-6">
              <Users size={40} className="text-white transform rotate-6" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">Team Portal</h1>
            <p className="text-gray-400 font-medium">Log in with your Agent ID to access daily tasks and start your shift.</p>
          </div>

          <TeamLoginForm />

        </div>
      </motion.div>
      
    </div>
  );
}
