'use client';
import { motion } from 'framer-motion';
import { Sparkles, UserCircle } from 'lucide-react';

export default function WelcomeHeader({ adminProfile }: { adminProfile: any }) {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
  const firstName = adminProfile?.full_name?.split(' ')[0] || 'Admin';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-8 min-h-[160px] flex items-center"
    >
      {/* --- RIGHT SIDE BLENDED DP --- */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 md:w-1/3 pointer-events-none select-none">
        {/* The Magic Blend Gradient (Fades image into the white background) */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
        
        {adminProfile?.avatar_url ? (
          <img 
            src={adminProfile.avatar_url} 
            alt="Admin" 
            className="w-full h-full object-cover object-top opacity-90"
          />
        ) : (
          <div className="w-full h-full bg-blue-50 flex items-center justify-end pr-8">
            <UserCircle size={120} strokeWidth={1} className="text-blue-200" />
          </div>
        )}
      </div>

      {/* --- LEFT SIDE CONTENT --- */}
      <div className="relative z-20 p-8 md:p-10 w-full md:w-2/3">
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Sparkles size={14}/> Executive Dashboard
        </p>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
          {greeting}, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
            {firstName}
          </span>
        </h1>
        <p className="text-sm font-bold text-gray-500 mt-3 max-w-sm">
          Here is your comprehensive overview and real-time operations data for today.
        </p>
      </div>
    </motion.div>
  );
}
