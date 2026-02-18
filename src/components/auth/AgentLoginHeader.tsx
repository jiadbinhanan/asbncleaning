'use client';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

export default function AgentLoginHeader() {
  return (
    <div className="text-center space-y-4 mb-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-600 p-0.5 shadow-xl"
      >
        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
          <User size={40} className="text-green-500" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-3xl font-bold text-gray-800">Agent Profile</h1>
        <p className="text-gray-500 text-sm mt-1 uppercase tracking-wider font-medium">
          Personal Work History
        </p>
      </motion.div>
    </div>
  );
}