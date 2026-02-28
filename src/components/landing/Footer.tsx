"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4 border-t-4 border-blue-600">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* About */}
        <div className="md:col-span-2">
          <h3 className="font-black text-white text-lg mb-3 tracking-wide">B T M Cleaning And Technical Services CO.</h3>
          <p className="text-sm font-medium leading-relaxed">
            Your trusted partner for pristine spaces. We offer premium cleaning services
            across apartments, villas, and offices, ensuring a clean and healthy environment.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-bold text-white text-lg mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm font-medium">
            <li><Link href="/#booking" className="hover:text-white transition-colors">Book a Service</Link></li>
            <li><Link href="/team/login" className="hover:text-white transition-colors">Agent Portal</Link></li>
            <li><Link href="/contact-us" className="hover:text-white transition-colors">Contact Us</Link></li>
          </ul>
        </div>
        
        {/* Contact */}
        <div>
          <h3 className="font-bold text-white text-lg mb-3">Contact Info</h3>
          <ul className="space-y-2 text-sm font-medium">
            <li>Email: contact@btmcleaning.com</li>
            <li>Phone: +971 00 000 0000</li>
            <li className="flex items-center gap-2 mt-4 text-blue-400 bg-blue-500/10 w-fit px-3 py-1.5 rounded-lg border border-blue-500/20">
              <Sparkles size={16} />
              <span className="font-bold text-xs uppercase tracking-widest">Available 24/7</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm font-bold">
        <p>&copy; {new Date().getFullYear()} B T M Cleaning And Technical Services CO. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
