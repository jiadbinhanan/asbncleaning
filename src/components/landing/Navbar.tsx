'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShieldCheck, UserCog, User } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 w-full z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                B
              </div>
              <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-500">
                B T M Cleaning
              </span>
            </Link>
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
            >
              <Menu size={28} />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
              className="fixed top-0 left-0 right-0 w-full bg-white shadow-2xl z-50 p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-gray-800">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row justify-center items-center gap-4">
                <Link
                  href="/admin/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-all border border-purple-100 group w-full md:w-auto"
                >
                  <div className="p-3 bg-white rounded-full shadow-sm text-purple-600 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Admin Login</h3>
                    <p className="text-xs text-gray-500">Management Access</p>
                  </div>
                </Link>

                <Link
                  href="/supervisor/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-all border border-orange-100 group w-full md:w-auto"
                >
                  <div className="p-3 bg-white rounded-full shadow-sm text-orange-600 group-hover:scale-110 transition-transform">
                    <UserCog size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Supervisor</h3>
                    <p className="text-xs text-gray-500">Task Management</p>
                  </div>
                </Link>

                <Link
                  href="/agent/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all border border-green-100 group w-full md:w-auto"
                >
                  <div className="p-3 bg-white rounded-full shadow-sm text-green-600 group-hover:scale-110 transition-transform">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Agent Profile</h3>
                    <p className="text-xs text-gray-500">View Personal Records</p>
                  </div>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
