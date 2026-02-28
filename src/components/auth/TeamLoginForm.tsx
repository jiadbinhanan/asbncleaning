"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, User as UserIcon, Loader2, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function TeamLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const email = `${username.trim().toLowerCase()}@test.com`;

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (authError) throw authError;

      const user = data.user;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profile.role !== 'agent') {
        await supabase.auth.signOut();
        throw new Error("Access Denied! Only registered agents can access the Team Portal.");
      }

      await supabase.auth.updateUser({ data: { role: profile.role } });
      router.push('/team/dashboard');
      
    } catch (err: any) {
        setError(err.message || 'Invalid credentials. Please try again.');
        setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6 w-full">
      {error && (
        <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50/80 border border-red-200 text-red-600 text-sm rounded-2xl font-bold flex items-center gap-2"
        >
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {error}
        </motion.div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-300 ml-1 uppercase tracking-widest">Agent ID</label>
        <div className="relative group">
          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-400 transition-colors" size={20} />
          <input
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-white font-bold placeholder:text-gray-500 transition-all backdrop-blur-sm"
            placeholder="e.g. agent1" 
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-300 ml-1 uppercase tracking-widest">Password</label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-400 transition-colors" size={20} />
          <input
            type={showPassword ? 'text' : 'password'} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-white font-bold placeholder:text-gray-500 transition-all backdrop-blur-sm"
            placeholder="••••••••" 
            required
          />
          <AnimatePresence mode="wait">
            <motion.button
              key={showPassword ? 'eye-off' : 'eye'}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.1 }}
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white cursor-pointer"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </motion.button>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium py-2">
        <ShieldCheck size={16} className="text-teal-500" />
        Secure 256-bit encrypted connection
      </div>

      <motion.button 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        disabled={loading} 
        type="submit" 
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-2xl font-black text-lg hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" size={24} /> : <>Start Shift <ArrowRight size={20} /></>}
      </motion.button>
    </form>
  );
}
