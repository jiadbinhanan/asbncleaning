"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, CheckCircle, Shield, Droplets, Clock, Home, Award } from "lucide-react";

export default function AboutAndFeatures() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Before-After স্লাইডার কন্ট্রোল করার ফাংশন (Function to control Before-After slider)
  const handleMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = "touches" in event ? event.touches[0].clientX - rect.left : (event as React.MouseEvent).clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const features = [
    { icon: Award, title: "Trained Professional Team", desc: "Expertly vetted and highly trained staff for flawless results." },
    { icon: Clock, title: "Fast & Reliable Service", desc: "Punctual arrivals and efficient cleaning without compromising quality." },
    { icon: Shield, title: "Affordable Pricing", desc: "Premium service at competitive and transparent rates." },
    { icon: Droplets, title: "Premium Cleaning Materials", desc: "Eco-friendly, high-end products safe for your family and pets." },
    { icon: Clock, title: "Flexible Booking Schedule", desc: "Book a time that perfectly fits your busy lifestyle." },
    { icon: Home, title: "Guest-Ready Holiday Home", desc: "Turnkey preparation for Airbnb and holiday rentals." },
  ];

  return (
    <section id="why-us" className="py-24 bg-white relative overflow-hidden" ref={sectionRef}>
      <div className="w-full max-w-[2560px] mx-auto px-6 md:px-12 2xl:px-24">

        {/* টপ সেকশন: About (Top Section: About) */}
        <div className="flex flex-col lg:flex-row gap-16 items-center mb-24">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1 }}
            className="lg:w-1/2 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 text-cyan-600 text-sm font-bold tracking-widest uppercase">
              <Sparkles size={16} /> The BTM Difference
            </div>
            {/* ফন্ট-সেরিফ ব্যবহার করে লাক্সারি হেডলাইন (Luxury Headline using font-serif) */}
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
              Why Clients Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-500">BTM Cleaning</span>
            </h2>
            <p className="font-sans text-lg text-slate-600 leading-relaxed">
              BTM Cleaning And Technical Services CO. provides professional cleaning solutions with high hygiene standards, trained staff, and reliable service across Dubai.
            </p>
            <p className="font-sans text-lg text-slate-600 leading-relaxed">
              We specialize in apartment cleaning, holiday home preparation, deep cleaning, and maintenance support for residential and commercial properties.
            </p>
          </motion.div>

          {/* বিফোর-আফটার ইন্টারেক্টিভ স্লাইডার (Before-After Interactive Slider) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 1, delay: 0.2 }}
            className="lg:w-1/2 w-full"
          >
            <div 
              ref={sliderRef}
              onMouseMove={handleMove}
              onTouchMove={handleMove}
              className="relative w-full aspect-[4/3] md:aspect-[16/9] rounded-3xl overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] cursor-ew-resize group"
            >
              {/* আফটার ইমেজ (After Image - Clean) */}
              <div className="absolute inset-0 bg-[url('/landing/after-clean.jpg')] bg-cover bg-center">
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold text-green-600 shadow-lg">After</div>
              </div>

              {/* বিফোর ইমেজ (Before Image - Dirty) - ক্লিপিং মাস্ক দিয়ে স্লাইড হবে */}
              <div 
                className="absolute inset-0 bg-[url('/landing/before-clean.jpg')] bg-cover bg-center transition-all duration-75"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold text-orange-600 shadow-lg">Before</div>
              </div>

              {/* স্লাইডার হ্যান্ডেল (Slider Handle) */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] pointer-events-none transition-all duration-75"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                  <div className="flex gap-1">
                    <div className="w-0.5 h-4 bg-slate-300 rounded-full" />
                    <div className="w-0.5 h-4 bg-slate-300 rounded-full" />
                    <div className="w-0.5 h-4 bg-slate-300 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* বটম সেকশন: ফিচারস গ্রিড (Bottom Section: Features Grid) */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-slate-900 mb-4">Why We Are Different</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-orange-400 to-amber-400 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="p-8 rounded-3xl bg-slate-50 hover:bg-[#FDFBF7] border border-slate-100 hover:border-orange-100 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.1)] group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-cyan-600 group-hover:bg-gradient-to-br group-hover:from-orange-400 group-hover:to-amber-500 group-hover:text-white transition-all duration-500">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-sans text-xl font-extrabold text-slate-800 mb-2 group-hover:text-orange-600 transition-colors">{feature.title}</h3>
                    <p className="font-sans text-slate-500 leading-relaxed text-sm">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}