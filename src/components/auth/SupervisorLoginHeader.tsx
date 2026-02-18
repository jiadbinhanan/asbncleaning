'use client';
import { motion } from 'framer-motion';
import { UserCog } from 'lucide-react';

export default function SupervisorLoginHeader() {
  return (
    <div className="text-center space-y-4 mb-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 p-0.5 shadow-xl"
      >
        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
          <UserCog size={40} className="text-orange-500" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-3xl font-bold text-gray-800">Supervisor Access</h1>
        <p className="text-gray-500 text-sm mt-1 uppercase tracking-wider font-medium">
          Monitor & Manage Tasks
        </p>
      </motion.div>
    </div>
  );
}