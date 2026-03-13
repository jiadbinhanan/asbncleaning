'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, ClipboardCheck, ArrowLeft, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function QCLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // 🚨 FIXED: State updated for username and password visibility
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 🚨 FIXED: Auto append domain to username
    const email = `${username.trim().toLowerCase()}@btm.com`;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push("/team/qc-portal");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>

      <div className="max-w-md w-full relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-indigo-300 hover:text-white mb-6 font-bold text-sm transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
              <ClipboardCheck size={32} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">QC Portal Access</h1>
            <p className="text-indigo-200/60 text-sm font-bold mt-2">Sign in to manage Quality Control</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-sm font-bold flex items-center gap-2 mb-6">
              <AlertCircle size={16} className="shrink-0"/> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1.5 block">User ID</label>
              <input 
                type="text" required
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 bg-black/20 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white font-medium"
                placeholder="e.g. agent01"
              />
            </div>
            
            <div>
              <label className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1.5 block">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 pr-12 bg-black/20 border border-white/10 rounded-xl outline-none focus:border-indigo-500 text-white font-medium"
                  placeholder="••••••••"
                />
                
                {/* 🚨 FIXED: Eye Toggle Button */}
                <AnimatePresence mode="wait">
                  <motion.button
                    key={showPassword ? 'eye-off' : 'eye'}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.2 }}
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-indigo-300 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </motion.button>
                </AnimatePresence>
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-lg shadow-xl shadow-indigo-900/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : <ShieldCheck size={20}/>}
              {loading ? "Authenticating..." : "Secure Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
