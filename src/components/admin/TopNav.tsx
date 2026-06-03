'use client';
import { useState, useEffect } from 'react';
import { Menu, Users, ClipboardList } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';
import { useModalStore } from '@/store/modalStore';

interface TopNavProps {
  onMenuClick: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  const { openTeamsModal, openBookingsModal } = useModalStore();

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    fetchAdminProfile();
  }, [supabase]);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <header className="h-16 md:h-[68px] bg-white border-b border-gray-100 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">

      {/* ── LEFT: Hamburger + Modal buttons ───────────────────────── */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-1.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
        >
          <Menu size={22} />
        </button>

        {/* Teams button */}
        <motion.button
          onClick={openTeamsModal}
          whileHover={{ scale: 1.05, boxShadow: '0 6px 20px rgba(10,25,47,0.40)' }}
          whileTap={{ scale: 0.86, boxShadow: '0 0 0 5px rgba(59,130,246,0.28)' }}
          transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          className="group relative flex items-center gap-2 rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0A192F 0%, #1e3a5c 100%)',
            padding: '8px 14px',
          }}
        >
          <motion.span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
            style={{ background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.10) 50%, transparent 75%)' }}
            animate={{ x: ['-120%', '220%'] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
          />
          <span className="relative w-5 h-5 rounded-md bg-blue-500/25 border border-blue-400/40 flex items-center justify-center shrink-0">
            <Users size={11} className="text-blue-300" />
          </span>
          <span className="relative hidden md:block text-[11px] font-black text-white tracking-wide">Teams</span>
          <span className="relative w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
        </motion.button>

        {/* Bookings button */}
        <motion.button
          onClick={openBookingsModal}
          whileHover={{ scale: 1.05, boxShadow: '0 6px 20px rgba(6,78,59,0.45)' }}
          whileTap={{ scale: 0.86, boxShadow: '0 0 0 5px rgba(16,185,129,0.28)' }}
          transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          className="group relative flex items-center gap-2 rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
            padding: '8px 14px',
          }}
        >
          <motion.span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
            style={{ background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.10) 50%, transparent 75%)' }}
            animate={{ x: ['-120%', '220%'] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
          />
          <span className="relative w-5 h-5 rounded-md bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <ClipboardList size={11} className="text-emerald-300" />
          </span>
          <span className="relative hidden md:block text-[11px] font-black text-white tracking-wide">Bookings</span>
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </motion.button>
      </div>

      {/* ── RIGHT: Profile ────────────────────────────────────────── */}
      <motion.div
        className="flex items-center gap-2.5 cursor-pointer select-none pl-2 pr-1 py-1 rounded-2xl"
        whileHover={{
          backgroundColor: 'rgba(239,246,255,1)',
          boxShadow: '0 0 0 1.5px rgba(59,130,246,0.25)',
          y: -1,
        }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        {/* Name — always visible */}
        <div className="text-right hidden md:block">
          <p className="text-xs font-black text-gray-800 leading-none whitespace-nowrap">
            {profile?.full_name || 'Admin'}
          </p>
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5 leading-none">
            Online
          </p>
        </div>

        {/* Avatar */}
        <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-gray-200 shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-black text-xs">{initials}</span>
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
        </div>
      </motion.div>

    </header>
  );
}