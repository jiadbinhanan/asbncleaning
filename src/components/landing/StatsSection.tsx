"use client";

import { motion } from "framer-motion";
import { Users, Clock, ThumbsUp, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useInView } from "framer-motion";
import { useRef } from "react";

// কাউন্টার অ্যানিমেশন হুক (Custom Hook for Number Counter Animation)
const useCounter = (end: number, duration: number = 2) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const increment = end / (duration * 60);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.ceil(start));
        }
      }, 1000 / 60);
      return () => clearInterval(timer);
    }
  }, [isInView, end, duration]);

  return { count, ref };
};

export default function StatsSection() {
  const stats = [
    { icon: Users, value: 500, suffix: "+", label: "Happy Clients", color: "text-blue-600" },
    { icon: Clock, value: 24, suffix: "/7", label: "Dedicated Support", color: "text-cyan-600" },
    { icon: ThumbsUp, value: 99, suffix: "%", label: "Satisfaction", color: "text-green-600" },
    { icon: Star, value: 5, suffix: "★", label: "Service Quality", color: "text-orange-500" },
  ];

  return (
    // লাক্সারি ক্রিম/বেইজ ব্যাকগ্রাউন্ড (Luxury Cream/Beige Background)
    <section className="relative py-20 bg-[#FDFBF7] overflow-hidden border-b border-orange-50/50">
      {/* ব্যাকগ্রাউন্ড ডেকোরেশন (Background Decoration) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-100/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-100/40 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-[2560px] mx-auto px-6 md:px-12 2xl:px-24 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => {
            const { count, ref } = useCounter(stat.value);
            return (
              <motion.div
                key={index}
                ref={ref}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: index * 0.15, ease: "easeOut" }}
                className="flex flex-col items-center text-center group"
              >
                <div className={`p-4 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-4 group-hover:-translate-y-2 transition-transform duration-300 ${stat.color}`}>
                  <stat.icon size={32} strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-5xl md:text-6xl font-bold text-slate-800 tracking-tight flex items-center">
                  {count}
                  <span className={stat.color}>{stat.suffix}</span>
                </h3>
                <p className="font-sans text-sm md:text-base font-bold text-slate-500 uppercase tracking-widest mt-2">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}