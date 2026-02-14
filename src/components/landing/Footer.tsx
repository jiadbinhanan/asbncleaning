"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* About */}
        <div className="md:col-span-2">
          <h3 className="font-bold text-white text-lg mb-3">ASBN Cleaning Services</h3>
          <p className="text-sm">
            Your trusted partner for pristine spaces. We offer premium cleaning services
            across apartments, villas, and offices, ensuring a clean and healthy environment.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-bold text-white text-lg mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/#booking" className="hover:text-white">Book a Service</Link></li>
            <li><Link href="/login?role=agent" className="hover:text-white">Team Login</Link></li>
            <li><Link href="/contact-us" className="hover:text-white">Contact Us</Link></li>
          </ul>
        </div>
        
        {/* Contact */}
        <div>
          <h3 className="font-bold text-white text-lg mb-3">Contact Info</h3>
          <ul className="space-y-2 text-sm">
            <li>Email: asbn.cleaning@gmail.com</li>
            <li>Phone: +971 00 000 0000</li>
            <li className="flex items-center gap-2">
              <Sparkles size={16} className="text-teal-400" />
              <span>Available 24/7</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} ASBN Cleaning Services. All Rights Reserved.</p>
      </div>
    </footer>
  );
}