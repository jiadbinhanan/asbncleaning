"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

export default function BookingForm() {
  const [formData, setFormData] = useState({
    service: "Cleaning",
    type: "Apartment",
    layout: "2-BR Apartment",
    building: "",
    floor: "",
    unit: "",
    doorCode: "",
    date: "",
    time: "10:00 AM",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBooking = () => {
    const { service, type, layout, building, floor, unit, doorCode, date, time } = formData;
    
    // Formatting the message
    const message = `*New Booking Request* 🧹%0A%0A*Service:* ${service}%0A*Type:* ${type}%0A*Layout:* ${layout}%0A*Building:* ${building}%0A*Floor:* ${floor}%0A*Unit:* ${unit}%0A*Door Code:* ${doorCode}%0A*Date:* ${date}%0A*Time:* ${time}`;
    
    // Replace with Admin's WhatsApp Number
    const adminPhone = "+918597872806"; // ডেমো নম্বর
    window.open(`https://wa.me/${adminPhone}?text=${message}`, "_blank");
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-2xl shadow-blue-900/10 overflow-hidden border border-gray-100"
        >
          <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-6 text-white text-center">
            <h2 className="text-2xl font-bold">Book a Service Instantly</h2>
            <p className="text-blue-100 opacity-90">Fill details & send via WhatsApp</p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Fields */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Service Needed</label>
              <select name="service" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500">
                <option>Deep Cleaning</option>
                <option>Standard Cleaning</option>
                <option>Move-in/out</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Property Type</label>
              <select name="type" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500">
                <option>Apartment</option>
                <option>Villa</option>
                <option>Office</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Layout</label>
              <input name="layout" placeholder="e.g. 2-BR Apartment" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Building Name</label>
              <input name="building" placeholder="Building Name" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <input name="floor" placeholder="Floor" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500" />
               <input name="unit" placeholder="Unit No" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Door Code</label>
               <input name="doorCode" placeholder="****" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Preferred Date</label>
               <input type="date" name="date" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500" />
            </div>

             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Time</label>
               <input type="time" name="time" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="p-8 pt-0">
            <button
                onClick={handleBooking}
                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
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