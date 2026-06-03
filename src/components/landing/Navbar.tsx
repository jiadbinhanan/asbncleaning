"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, UserCircle, Droplets, ShieldCheck, UserCog, User, Clock, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const dropdownRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Services", href: "#services" },
    { name: "Why Us", href: "#why-us" },
    { name: "Reviews", href: "#reviews" },
  ];

  // ৫ টি লগইন অপশন
  const loginRoles = [
    { name: "Admin Portal", href: "/admin/login", icon: ShieldCheck, desc: "Management Access" },
    { name: "Supervisor", href: "/supervisor/login", icon: UserCog, desc: "Task Management" },
    { name: "Agent Profile", href: "/agent/login", icon: User, desc: "View Personal Records" },
    { name: "Team Shift", href: "/team/login", icon: Clock, desc: "Shift & Unit Access" },
    { name: "QC Portal", href: "/team/qc-login", icon: ClipboardCheck, desc: "Quality Control" },
  ];

  // Hover and Click Logic for Desktop Dropdown
  const handleMouseEnter = () => {
    if (dropdownRef.current) clearTimeout(dropdownRef.current);
    setIsLoginDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    dropdownRef.current = setTimeout(() => {
      setIsLoginDropdownOpen(false);
    }, 200); // slight delay to prevent flickering
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoginDropdownOpen(!isLoginDropdownOpen);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] py-3"
          : "bg-transparent py-5 lg:py-6"
      }`}
    >
      {/* w-full max-w-[2560px] দিয়ে আল্ট্রা-ওয়াইড মনিটরের জন্য ফুল ডিসপ্লে কভার করা হয়েছে */}
      <div className="w-full max-w-[2560px] mx-auto px-6 md:px-12 2xl:px-24 flex justify-between items-center">

        {/* লোগো সেকশন (Logo & Name) */}
        <Link href="#home" className="flex items-center gap-3 group">
          <div className="relative w-12 h-12 md:w-14 md:h-14 overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm p-1 border border-white/20 shadow-sm transition-transform duration-500 group-hover:scale-105">
            {/* এখানে আপনার পাবলিক ফোল্ডারের লোগো */}
            <img 
              src="/logo_btm_invoice.png" 
              alt="BTM Cleaning Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className={`text-xl md:text-2xl font-extrabold tracking-tight transition-colors duration-300 ${isScrolled ? "text-slate-900" : "text-white"}`}>
              BTM <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">CLEANING</span>
            </span>
            <span className={`text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase transition-colors duration-300 ${isScrolled ? "text-slate-500" : "text-slate-300"}`}>
              & Technical Services
            </span>
          </div>
        </Link>

        {/* ডেস্কটপ মেনু (Desktop Menu) */}
        <div className="hidden lg:flex items-center space-x-10">
          {navLinks.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className={`text-sm font-bold uppercase tracking-wider hover:text-cyan-400 transition-colors ${
                isScrolled ? "text-slate-700" : "text-slate-100"
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* লগইন ড্রপডাউন - হোভার এবং ক্লিক দুইভাবেই কাজ করবে */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={toggleDropdown}
              className={`flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider hover:text-cyan-400 transition-colors ${
                isScrolled ? "text-slate-700" : "text-slate-100"
              }`}
            >
              <UserCircle size={20} />
              Portal Login
              <ChevronDown size={16} className={`transition-transform duration-500 ${isLoginDropdownOpen ? "rotate-180 text-cyan-500" : ""}`} />
            </button>

            <AnimatePresence>
              {isLoginDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(5px)" }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-[120%] right-0 w-[280px] bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden"
                >
                  <div className="p-3 flex flex-col gap-1">
                    {loginRoles.map((role, idx) => (
                      <Link
                        key={idx}
                        href={role.href}
                        onClick={() => setIsLoginDropdownOpen(false)}
                        className="group flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all duration-300"
                      >
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-gradient-to-br group-hover:from-cyan-100 group-hover:to-blue-100 group-hover:text-cyan-600 transition-colors">
                          <role.icon size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">
                            {role.name}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {role.desc}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* প্রিমিয়াম বুকিং বাটন */}
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href="#booking"
            className="group relative flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold uppercase tracking-wider rounded-full shadow-[0_10px_30px_-10px_rgba(249,115,22,0.5)] hover:shadow-[0_15px_40px_-10px_rgba(249,115,22,0.6)] overflow-hidden transition-all"
          >
            <div className="absolute inset-0 bg-white/20 w-0 group-hover:w-full transition-all duration-500 ease-out z-0"></div>
            <Droplets size={18} className="relative z-10" />
            <span className="relative z-10">Book Now</span>
          </motion.a>
        </div>

        {/* মোবাইল হ্যামবার্গার */}
        <button
          className={`lg:hidden p-2 rounded-xl backdrop-blur-md transition-colors ${isScrolled ? "text-slate-900 hover:bg-slate-100" : "text-white bg-white/10 hover:bg-white/20"}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* মোবাইল মেনু (Mobile Menu Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden absolute top-full left-0 w-full bg-white shadow-2xl border-t border-slate-100 flex flex-col"
          >
            <div className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              {navLinks.map((link, index) => (
                <motion.a
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={index}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-extrabold text-slate-800 border-b border-slate-50 pb-4"
                >
                  {link.name}
                </motion.a>
              ))}

              {/* মোবাইল লগইন অ্যাকর্ডিয়ন */}
              <div className="py-2">
                <button
                  onClick={toggleDropdown}
                  className="flex items-center justify-between w-full text-lg font-extrabold text-slate-800 mb-2"
                >
                  <div className="flex items-center gap-3">
                    <UserCircle size={22} className="text-cyan-500" />
                    Portal Login
                  </div>
                  <ChevronDown
                    className={`transition-transform duration-300 ${isLoginDropdownOpen ? "rotate-180 text-cyan-500" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {isLoginDropdownOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden flex flex-col gap-2 mt-4"
                    >
                      {loginRoles.map((role, idx) => (
                        <Link
                          key={idx}
                          href={role.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl"
                        >
                          <role.icon size={20} className="text-cyan-600" />
                          <span className="font-bold text-slate-700">{role.name}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                href="#booking"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg font-bold uppercase tracking-wider rounded-2xl shadow-xl"
              >
                <Droplets size={22} />
                Book Your Service
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}