"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

export default function Testimonials() {
  const reviews = [
    {
      name: "Ahmed",
      location: "Dubai Marina",
      text: "Excellent cleaning service and very professional team. They left my apartment completely spotless.",
      rating: 5,
    },
    {
      name: "Sarah",
      location: "Downtown Dubai",
      text: "My holiday home was perfectly prepared for guests. Fast, reliable, and highly recommended!",
      rating: 5,
    },
    {
      name: "Michael",
      location: "Palm Jumeirah",
      text: "The premium materials they use really make a difference. Best cleaning company I've hired in Dubai.",
      rating: 5,
    }
  ];

  return (
    // স্কাই ব্লু এবং সায়ান এর খুব হালকা ওভারলে (Very light Sky Blue/Cyan gradient)
    <section id="reviews" className="py-24 bg-gradient-to-b from-white to-sky-50/50 relative">
      <div className="w-full max-w-[2560px] mx-auto px-6 md:px-12 2xl:px-24">

        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center items-center gap-2 text-orange-500 font-bold tracking-widest uppercase text-sm mb-4"
          >
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
            <Star size={16} fill="currentColor" />
          </motion.div>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Trusted By Property Owners
          </h2>
          <p className="font-sans text-lg text-slate-600">
            We guarantee you a 5-star cleaning review for your property every single time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              className="relative p-8 rounded-[2rem] bg-white border border-slate-100 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_-15px_rgba(14,165,233,0.15)] transition-all duration-500 group"
            >
              <div className="absolute top-8 right-8 text-sky-100 group-hover:text-cyan-100 transition-colors">
                <Quote size={48} />
              </div>

              <div className="flex gap-1 mb-6">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} size={18} className="text-amber-400" fill="currentColor" />
                ))}
              </div>

              <p className="font-sans text-slate-700 text-lg leading-relaxed mb-8 relative z-10 italic">
                "{review.text}"
              </p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{review.name}</h4>
                  <p className="text-sm text-cyan-600 font-medium">{review.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}