"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Building2 } from "lucide-react";

export default function BookingForm() {
  const [formData, setFormData] = useState({
    companyName: "", // New Field
    service: "Deep Cleaning",
    type: "Apartment",
    layout: "",
    building: "",
    floor: "",
    unit: "",
    doorCode: "",
    date: "",
    time: "10:00",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBooking = () => {
    const { companyName, service, type, layout, building, floor, unit, doorCode, date, time } = formData;
    const message = `*New Booking Request* 🧹%0A%0A*Company / Client:* ${companyName}%0A*Service:* ${service}%0A*Type:* ${type}%0A*Layout:* ${layout}%0A*Building:* ${building}%0A*Floor:* ${floor}%0A*Unit:* ${unit}%0A*Door Code:* ${doorCode}%0A*Date:* ${date}%0A*Time:* ${time}`;
    
    const adminPhone = "+918597872806"; // Change to your actual WhatsApp Number
    window.open(`https://wa.me/${adminPhone}?text=${message}`, "_blank");
  };

  const inputStyles = "w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500 font-bold outline-none transition-all";

  return (
    <section id="booking" className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 overflow-hidden border border-gray-100"
        >
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h2 className="text-3xl font-black mb-2">Book a Service Instantly</h2>
            <p className="text-blue-100 font-medium">B T M Cleaning And Technical Services CO.</p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* New Company Name Field (Full Width) */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1"><Building2 size={14}/> Company / Client Name</label>
              <input name="companyName" placeholder="Enter company or your full name" onChange={handleChange} className={inputStyles} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Service Needed</label>
              <select name="service" onChange={handleChange} className={inputStyles}>
                <option>Deep Cleaning</option>
                <option>Standard Cleaning</option>
                <option>Move-in/out</option>
                <option>Sofa Bed Setup</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Property Type</label>
              <select name="type" onChange={handleChange} className={inputStyles}>
                <option>Apartment</option>
                <option>Villa</option>
                <option>Office</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Layout</label>
              <input name="layout" placeholder="e.g. 2-BR Apartment" onChange={handleChange} className={inputStyles} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Building Name</label>
              <input name="building" placeholder="Building Name" onChange={handleChange} className={inputStyles} />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Floor</label>
                 <input name="floor" placeholder="Floor" onChange={handleChange} className={inputStyles} />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Unit No</label>
                 <input name="unit" placeholder="Unit No" onChange={handleChange} className={inputStyles} />
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Door Code</label>
               <input name="doorCode" placeholder="****" onChange={handleChange} className={inputStyles} />
            </div>

            <div className="space-y-2">
               <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Preferred Date</label>
               <input type="date" name="date" onChange={handleChange} className={inputStyles} />
            </div>

             <div className="space-y-2">
               <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Time</label>
               <input type="time" name="time" onChange={handleChange} className={inputStyles} />
            </div>
          </div>

          <div className="p-8 pt-0 mt-4">
            <button
                onClick={handleBooking}
                className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-green-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
                <Send size={20} />
                Book via WhatsApp
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
