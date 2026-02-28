"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";
import { 
  UserCircle, Mail, Phone, Camera, Save, 
  Loader2, ShieldCheck, Calendar, AtSign, User
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getAvatarUploadSignature } from "./actions";

export default function SupervisorProfile() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [userId, setUserId] = useState<string>("");
  const [profileData, setProfileData] = useState<any>(null);
  
  // Editable Form States
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    phone: "",
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // 1. OPTIMIZED FETCH: 1 API Call on Load
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        // Fetch Profile from DB
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfileData(data);
          setFormData({
            full_name: data.full_name || "",
            username: data.username || "",
            phone: data.phone || "",
          });
          setAvatarPreview(data.avatar_url || null);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase]);

  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Avatar Selection
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // 2. SAVE PROFILE (Cloudinary + 1 Supabase Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalAvatarUrl = profileData.avatar_url;

      // Upload to Cloudinary if new file selected
      if (avatarFile) {
        const { signature, timestamp, apiKey, cloudName } = await getAvatarUploadSignature();
        if (!cloudName) throw new Error("Missing Cloudinary Config");

        const uploadData = new FormData();
        uploadData.append("file", avatarFile);
        uploadData.append("api_key", apiKey!);
        uploadData.append("timestamp", timestamp.toString());
        uploadData.append("signature", signature);
        uploadData.append("folder", "avatars");

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: uploadData,
        });
        const cloudRes = await uploadRes.json();
        
        if (cloudRes.secure_url) {
          finalAvatarUrl = cloudRes.secure_url;
        } else {
          throw new Error("Failed to upload image to Cloudinary.");
        }
      }

      // Update Database
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          phone: formData.phone,
          avatar_url: finalAvatarUrl
        })
        .eq('id', userId);

      if (error) throw error;

      alert("Profile updated successfully! 🎉");
      // Update local state to clear file selection
      setAvatarFile(null);
      setProfileData({ ...profileData, ...formData, avatar_url: finalAvatarUrl });

    } catch (error: any) {
      alert("Error saving profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen bg-[#F8FAFC]"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen bg-[#F8FAFC] font-sans pb-24">
      
      {/* PREMIUM HEADER */}
      <div className="mb-8 bg-gradient-to-br from-blue-700 to-indigo-800 p-8 rounded-[2rem] shadow-xl text-white flex items-center justify-between relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><UserCircle size={28} /></div>
            My Profile
          </h1>
          <p className="text-blue-100 font-medium mt-2">Manage your personal information and account settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Avatar & Quick Info */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 text-center relative">
            
            {/* Avatar Upload UI */}
            <div className="relative w-36 h-36 mx-auto mb-6 group cursor-pointer">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-blue-50 shadow-lg">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-500">
                    <UserCircle size={64} />
                  </div>
                )}
              </div>
              
              {/* Hover Overlay */}
              <label className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                <Camera size={24} className="mb-1" />
                <span className="text-xs font-bold">Change</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </label>
            </div>

            <h2 className="text-2xl font-black text-gray-900 truncate">{profileData?.full_name || "Setup Profile"}</h2>
            <p className="text-blue-600 font-bold text-sm mb-6 uppercase tracking-widest flex items-center justify-center gap-1">
              <ShieldCheck size={16}/> {profileData?.role}
            </p>

            {/* Read-only Stats */}
            <div className="space-y-3 pt-6 border-t border-gray-100 text-left">
              <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-3 border border-gray-100">
                <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm"><ShieldCheck size={16}/></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Account Status</p>
                  <p className="text-sm font-black text-green-600 capitalize">{profileData?.status || "Active"}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-3 border-gray-100">
                <div className="p-2 bg-white rounded-lg text-gray-400 shadow-sm"><Calendar size={16}/></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Joined Date</p>
                  <p className="text-sm font-black text-gray-800">
                    {profileData?.created_at ? format(parseISO(profileData.created_at), 'dd MMM yyyy') : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Edit Form */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-2">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <User className="text-blue-600"/> Personal Details
            </h3>

            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block pl-1">Full Name</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><UserCircle size={20}/></div>
                  <input 
                    type="text" 
                    name="full_name" 
                    value={formData.full_name} 
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 transition-all hover:bg-gray-100" 
                    placeholder="Enter your full name" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block pl-1">Username (Agent ID)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><AtSign size={20}/></div>
                    <input 
                      type="text" 
                      name="username" 
                      value={formData.username} 
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 transition-all hover:bg-gray-100" 
                      placeholder="e.g. asbn_super" 
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block pl-1">Phone Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Phone size={20}/></div>
                    <input 
                      type="tel" 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 transition-all hover:bg-gray-100" 
                      placeholder="+971 XX XXX XXXX" 
                    />
                  </div>
                </div>
              </div>

              {/* Password Notice */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                 <p className="text-xs font-bold text-blue-800 flex items-center gap-2">
                   <ShieldCheck size={16}/> Note: For security reasons, password changes must be done via the admin panel.
                 </p>
              </div>

              {/* Save Button */}
              <div className="pt-6 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={saving || (formData.full_name === profileData?.full_name && formData.username === profileData?.username && formData.phone === profileData?.phone && !avatarFile)} 
                  className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl text-lg shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <><Loader2 className="animate-spin" size={20}/> Updating Profile...</> : <><Save size={20}/> Save Changes</>}
                </button>
              </div>

            </form>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
