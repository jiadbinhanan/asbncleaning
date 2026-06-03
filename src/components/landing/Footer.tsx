"use client";
import Link from "next/link";
import { Sparkles, Mail, Phone, MapPin, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    // ডার্ক স্লেট ব্যাকগ্রাউন্ড সাথে টপে অরেঞ্জ বর্ডার (Dark Slate BG with Orange Top Border)
    <footer className="bg-slate-950 text-slate-400 py-16 px-6 md:px-12 border-t-[6px] border-orange-500">
      <div className="w-full max-w-[2560px] mx-auto 2xl:px-24">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* কোম্পানি ইনফো (Company Info) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl text-white">
                <Sparkles size={20} />
              </div>
              <span className="text-xl font-bold tracking-wider text-white">
                BTM <span className="text-cyan-500">CLEANING</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-md font-medium text-slate-500">
              Professional Cleaning & Technical Services CO. providing premium maintenance solutions across Dubai. We ensure a healthy, sparkling clean environment for your luxury apartments and villas.
            </p>
            <div className="mt-8 flex items-center gap-2 text-cyan-400 bg-cyan-950/30 w-fit px-4 py-2 rounded-xl border border-cyan-900/50">
              <Sparkles size={16} />
              <span className="font-bold text-xs uppercase tracking-widest">Available 24/7 in Dubai</span>
            </div>
          </div>

          {/* কুইক লিংক (Quick Links) */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6 tracking-wide">Quick Links</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li>
                <Link href="#home" className="hover:text-orange-400 transition-colors flex items-center gap-2 group">
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-orange-400" /> Home
                </Link>
              </li>
              <li>
                <Link href="#why-us" className="hover:text-orange-400 transition-colors flex items-center gap-2 group">
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-orange-400" /> Why Choose Us
                </Link>
              </li>
              <li>
                <Link href="#booking" className="hover:text-orange-400 transition-colors flex items-center gap-2 group">
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-orange-400" /> Book a Service
                </Link>
              </li>
              <li>
                <Link href="#team-login" className="hover:text-orange-400 transition-colors flex items-center gap-2 group">
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-orange-400" /> Staff Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* কন্টাক্ট ইনফো (Contact Info) */}
          <div>
            <h3 className="font-bold text-white text-lg mb-6 tracking-wide">Contact Us</h3>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-start gap-3">
                <Mail size={18} className="text-cyan-500 mt-0.5" />
                <span className="hover:text-white transition-colors cursor-pointer">btm.cleanings@gmail.com</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={18} className="text-cyan-500 mt-0.5" />
                <span className="hover:text-white transition-colors cursor-pointer">+971 54 437 4231</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-cyan-500 mt-0.5" />
                <span>Downtown Dubai, UAE<br/>(Servicing all major areas)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* কপিরাইট (Copyright) */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs font-bold tracking-wider uppercase text-slate-600">
            &copy; {new Date().getFullYear()} BTM Cleaning & Technical Services CO.
          </p>
          <div className="flex gap-4 text-xs font-bold text-slate-600">
            <span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span>
            <span className="cursor-pointer hover:text-white transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}