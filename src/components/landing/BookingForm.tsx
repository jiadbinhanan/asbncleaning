"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Droplets, Calendar, Clock, MapPin, Building2, User } from "lucide-react";

export default function BookingForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    service: "Checkout Cleaning",
    type: "Apartment",
    layout: "",
    building: "",
    floor: "",
    unit: "",
    doorCode: "",
    date: "",
    time: "10:00",
    hasCheckIn: false,
    checkInTime: "",
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBooking = () => {
    const { companyName, service, type, layout, building, floor, unit, doorCode, date, time, hasCheckIn, checkInTime } = formData;

    let message = `*New Premium Booking Request* 🧹%0A%0A*Client / Company:* ${companyName}%0A*Service:* ${service}%0A*Property Type:* ${type}%0A*Layout:* ${layout}%0A*Building:* ${building}%0A*Floor:* ${floor}%0A*Unit:* ${unit}%0A*Door Code:* ${doorCode}%0A*Date:* ${date}%0A*Time:* ${time}`;

    if (hasCheckIn) {
      message += `%0A%0A*Guest Check-in:* Yes%0A*Check-in Time:* ${checkInTime || "Not specified"}`;
    }

    const adminPhone = "+971544374231";
    window.open(`https://wa.me/${adminPhone}?text=${message}`, "_blank");
  };

  // লাক্সারি ইনপুট স্টাইল (Luxury Input Styles)
  const inputStyles = "w-full p-4 bg-[#FDFBF7] border-2 border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-800 transition-all focus:border-cyan-400 focus:bg-white focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] placeholder:text-slate-400";
  const labelStyles = "flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2";

  return (
    // বেইজ ব্যাকগ্রাউন্ড এবং ডেকোরেশন (Beige Background and Decoration)
    <section id="booking" className="relative py-24 bg-[#FDFBF7] overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/50 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-100/50 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10 flex flex-col lg:flex-row gap-16 items-center">

        {/* ফর্মের বাম দিকের টেক্সট (Left Side Text of Form) */}
        <div className="lg:w-5/12 space-y-8 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-600 text-sm font-bold tracking-widest uppercase"
          >
            <Droplets size={16} /> Instant Booking
          </motion.div>
          <h2 className="font-serif text-5xl md:text-6xl font-bold text-slate-900 leading-[1.1]">
            Schedule Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Premium Cleaning</span>
          </h2>
          <p className="font-sans text-lg text-slate-600 leading-relaxed">
            Fill out the details below to request a service. Our team will instantly receive your request and confirm your booking via WhatsApp.
          </p>
          <div className="hidden lg:flex flex-col gap-4 mt-8">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-100">
              <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl"><Clock size={24} /></div>
              <div>
                <h4 className="font-bold text-slate-800">Fast Response</h4>
                <p className="text-sm text-slate-500">Get confirmation within minutes.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-100">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl"><User size={24} /></div>
              <div>
                <h4 className="font-bold text-slate-800">Verified Agents</h4>
                <p className="text-sm text-slate-500">Only top-rated staff will be assigned.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ফর্ম কন্টেইনার (Form Container) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:w-7/12 w-full bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-100 overflow-visible relative"
        >
          {/* লাক্সারি হেডার (Luxury Header) */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-t-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              Service Details
            </h3>
            <p className="text-slate-400 font-medium text-sm">Secure your spot with BTM Technical Services</p>
          </div>

          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">

            {/* Client Name */}
            <div className="sm:col-span-2">
               <label className={labelStyles}><User size={14} /> Company / Client Name</label>
               <input name="companyName" placeholder="E.g., John Doe or BTM Homes" onChange={handleChange} className={inputStyles} />
            </div>

            {/* Property Type Dropdown */}
            <div className="relative">
               <label className={labelStyles}><Building2 size={14} /> Property Type</label>
               <div className="relative">
                 <input 
                   name="type" 
                   value={formData.type}
                   onChange={handleChange}
                   onFocus={() => setShowTypeDropdown(true)}
                   onBlur={() => setTimeout(() => setShowTypeDropdown(false), 200)}
                   placeholder="Type or select..." 
                   className={inputStyles} 
                   autoComplete="off"
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
               </div>
               {showTypeDropdown && (
                 <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                   {["Apartment", "Villa", "Townhouse", "Penthouse", "Office", "Commercial Space"].map(opt => (
                     <div 
                       key={opt} 
                       className="p-3 text-sm font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-600 cursor-pointer transition-colors"
                       onClick={() => { handleChange({ target: { name: 'type', value: opt } } as any); setShowTypeDropdown(false); }}
                     >
                       {opt}
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {/* Layout Dropdown */}
            <div className="relative">
               <label className={labelStyles}><MapPin size={14} /> Layout</label>
               <div className="relative">
                 <input 
                   name="layout" 
                   value={formData.layout}
                   onChange={handleChange}
                   onFocus={() => setShowLayoutDropdown(true)}
                   onBlur={() => setTimeout(() => setShowLayoutDropdown(false), 200)}
                   placeholder="Type or select..." 
                   className={inputStyles} 
                   autoComplete="off"
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
               </div>
               {showLayoutDropdown && (
                 <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                   {["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "4 Bedroom", "Duplex", "Penthouse"].map(opt => (
                     <div 
                       key={opt} 
                       className="p-3 text-sm font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-600 cursor-pointer transition-colors"
                       onClick={() => { handleChange({ target: { name: 'layout', value: opt } } as any); setShowLayoutDropdown(false); }}
                     >
                       {opt}
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {/* Building */}
            <div className="sm:col-span-2">
               <label className={labelStyles}>Building Name / Address</label>
               <input name="building" placeholder="E.g., Burj Khalifa, Downtown" onChange={handleChange} className={inputStyles} />
            </div>

            {/* Floor & Unit */}
            <div>
              <label className={labelStyles}>Floor</label>
              <input name="floor" placeholder="E.g., 45" onChange={handleChange} className={inputStyles} />
            </div>
            <div>
              <label className={labelStyles}>Unit No.</label>
              <input name="unit" placeholder="E.g., 4502" onChange={handleChange} className={inputStyles} />
            </div>

            {/* Door Code */}
            <div className="sm:col-span-2">
               <label className={labelStyles}>Door Access Code</label>
               <input name="doorCode" placeholder="**** (If applicable)" onChange={handleChange} className={inputStyles} />
            </div>

            {/* Date & Time */}
            <div>
               <label className={labelStyles}><Calendar size={14} /> Preferred Date</label>
               <input type="date" name="date" onChange={handleChange} className={inputStyles} />
            </div>
            <div>
               <label className={labelStyles}><Clock size={14} /> Time</label>
               <input type="time" name="time" defaultValue="10:00" onChange={handleChange} className={inputStyles} />
            </div>

            {/* Check-in Toggle */}
            <div className="sm:col-span-2 bg-orange-50/50 p-5 rounded-2xl border border-orange-100 mt-2">
               <label className="flex items-center gap-3 text-sm font-bold text-slate-800 cursor-pointer">
                  <input
                     type="checkbox"
                     checked={formData.hasCheckIn}
                     onChange={(e) => setFormData({ ...formData, hasCheckIn: e.target.checked })}
                     className="w-5 h-5 accent-orange-500 rounded-md cursor-pointer"
                  />
                  Is there a Guest Check-in today?
               </label>

               <motion.div 
                 initial={false} 
                 animate={{ height: formData.hasCheckIn ? 'auto' : 0, opacity: formData.hasCheckIn ? 1 : 0 }} 
                 className="overflow-hidden"
               >
                 <div className="pt-4">
                   <label className={labelStyles}>Check-in Time</label>
                   <input type="time" name="checkInTime" value={formData.checkInTime} onChange={handleChange} className={inputStyles} />
                 </div>
               </motion.div>
            </div>

          </div>

          {/* Submit Button */}
          <div className="p-8 pt-0">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBooking}
                className="w-full py-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-extrabold text-lg uppercase tracking-widest shadow-[0_15px_30px_-10px_rgba(249,115,22,0.5)] transition-all flex items-center justify-center gap-3"
            >
                <Send size={22} />
                Send Request via WhatsApp
            </motion.button>
          </div>
        </motion.div>

      </div>
    </section>
  );
}