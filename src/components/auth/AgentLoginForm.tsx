'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, User as UserIcon, Loader2, ArrowRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AgentLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Check if user has agent role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Profile not found');
      }

      if (profile.role !== 'agent') {
        await supabase.auth.signOut();
        throw new Error('Access denied. Agent privileges required.');
      }

      // Success - redirect to agent dashboard
      router.push('/agent/dashboard');
      router.refresh();

    } catch (err) {
      if (err instanceof Error) {
        console.error("Login Error:", err.message);
        setError(err.message === 'Access denied. Agent privileges required.' ? err.message : 'Invalid ID or Password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      onSubmit={handleLogin}
      className="space-y-6 w-full max-w-sm mx-auto"
    >
      {/* Error Message */}
      {error && (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2"
        >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            {error}
        </motion.div>
      )}

      {/* Username Input */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 ml-1">Agent User ID</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
            <UserIcon size={18} />
          </div>
          <input
            type="text"
            placeholder="e.g. agent1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
            required
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
            <Lock size={18} />
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-gray-700 placeholder:text-gray-400"
            required
          />
        </div>
      </div>

      {/* Login Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={loading}
        type="submit"
        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:shadow-xl hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            Access Agent Panel <ArrowRight size={18} />
          </>
        )}
      </motion.button>
    </motion.form>
  );
}