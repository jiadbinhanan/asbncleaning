"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Building2 } from "lucide-react";

export default function BookingForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    service: "Checkout Cleaning", // 🚨 2. Default set to Checkout Cleaning
    type: "Apartment",
    layout: "",
    building: "",
    floor: "",
    unit: "",
    doorCode: "",
    date: "",
    time: "10:00",
    hasCheckIn: false, // 🚨 1. Check-in state
    checkInTime: "",
  });

  // Custom Dropdown States
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBooking = () => {
    const { companyName, service, type, layout, building, floor, unit, doorCode, date, time, hasCheckIn, checkInTime } = formData;
    
    let message = `*New Booking Request* 🧹%0A%0A*Company / Client:* ${companyName}%0A*Service:* ${service}%0A*Type:* ${type}%0A*Layout:* ${layout}%0A*Building:* ${building}%0A*Floor:* ${floor}%0A*Unit:* ${unit}%0A*Door Code:* ${doorCode}%0A*Date:* ${date}%0A*Time:* ${time}`;
    
    // 🚨 1. Add check-in info to WhatsApp message if applicable
    if (hasCheckIn) {
      message += `%0A*Check-in:* Yes%0A*Check-in Time:* ${checkInTime || "Not specified"}`;
    }

    const adminPhone = "+971544374231"; // Change to your actual WhatsApp Number
    window.open(`https://wa.me/${adminPhone}?text=${message}`, "_blank");
  };

  const inputStyles = "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-700 transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/20";

  return (
    <div id="booking" className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100"
        >
          {/* 🚨 ORIGINAL HEADER (No changes made here) */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h2 className="text-3xl font-black mb-2">Book a Service Instantly</h2>
            <p className="text-blue-100 font-medium">B T M Cleaning And Technical Services CO.</p>
          </div>

          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <div className="space-y-2 sm:col-span-2">
               <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Company / Client Name</label>
               <input name="companyName" placeholder="Enter Company Name" onChange={handleChange} className={inputStyles} />
            </div>

            {/* 🚨 4. Property Type (Custom Input + Dropdown) */}
            <div className="space-y-2 relative">
               <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Property Type</label>
               <div className="relative">
                 <input 
                   name="type" 
                   value={formData.type}
                   onChange={handleChange}
                   onFocus={() => setShowTypeDropdown(true)}
                   onBlur={() => setShowTypeDropdown(false)}
                   placeholder="Type or select..." 
                   className={inputStyles} 
                   autoComplete="off"
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
               </div>
               
               {showTypeDropdown && (
                 <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                   {["Apartment", "Villa", "Townhouse", "Penthouse", "Office", "Commercial Space"].map(opt => (
                     <div 
                       key={opt} 
                       className="p-3 text-sm font-bold text-gray-700 hover:bg-green-50 cursor-pointer border-b border-gray-50 last:border-0"
                       onMouseDown={(e) => { 
                         e.preventDefault(); 
                         handleChange({ target: { name: 'type', value: opt } } as any); 
                         setShowTypeDropdown(false); 
                       }}
                     >
                       {opt}
                     </div>
                   ))}
                 </div>
               )}
            </div>

            {/* 🚨 3. Layout (Custom Input + Dropdown) */}
            <div className="space-y-2 relative">
               <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Layout</label>
               <div className="relative">
                 <input 
                   name="layout" 
                   value={formData.layout}
                   onChange={handleChange}
                   onFocus={() => setShowLayoutDropdown(true)}
                   onBlur={() => setShowLayoutDropdown(false)}
                   placeholder="Type or select..." 
                   className={inputStyles} 
                   autoComplete="off"
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
               </div>
               
               {showLayoutDropdown && (
                 <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                   {["Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "4 Bedroom", "5 Bedroom", "Duplex", "Penthouse"].map(opt => (
                     <div 
                       key={opt} 
                       className="p-3 text-sm font-bold text-gray-700 hover:bg-green-50 cursor-pointer border-b border-gray-50 last:border-0"
                       onMouseDown={(e) => { 
                         e.preventDefault(); 
                         handleChange({ target: { name: 'layout', value: opt } } as any); 
                         setShowLayoutDropdown(false); 
                       }}
                     >
                       {opt}
                     </div>
                   ))}
                 </div>
               )}
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
                 <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Unit</label>
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
               <input type="time" name="time" defaultValue="10:00" onChange={handleChange} className={inputStyles} />
            </div>

            {/* 🚨 1. Check-in Checkbox Section */}
            <div className="space-y-3 sm:col-span-2 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
               <label className="flex items-center gap-3 text-sm font-bold text-gray-800 cursor-pointer">
                  <input
                     type="checkbox"
                     checked={formData.hasCheckIn}
                     onChange={(e) => setFormData({ ...formData, hasCheckIn: e.target.checked })}
                     className="w-5 h-5 text-green-600 rounded-md border-gray-300 focus:ring-green-500 transition-all cursor-pointer"
                  />
                  Is there a Guest Check-in today?
               </label>
               
               {formData.hasCheckIn && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                     <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">Check-in Time</label>
                     <input type="time" name="checkInTime" value={formData.checkInTime} onChange={handleChange} className={inputStyles} />
                  </motion.div>
               )}
            </div>

          </div>

          {/* 🚨 ORIGINAL SUBMIT BUTTON (No changes made here) */}
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
  );
}