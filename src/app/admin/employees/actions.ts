"use server";

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ⚠️ সিকিউরিটি ফিক্স: এখানে আমরা গোপন কি ব্যবহার করছি, তাই NEXT_PUBLIC হবে না
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ✅ Corrected

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
}

// Admin Client (Bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// --- 1. Cloudinary Signature ---
export async function getCloudinarySignature() {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // সিগনেচার জেনারেট হচ্ছে সার্ভারে, তাই API Secret সুরক্ষিত থাকছে
  const signature = cloudinary.utils.api_sign_request(
    { timestamp: timestamp, folder: "avatars" },
    process.env.CLOUDINARY_API_SECRET!
  );
  
  return { 
    timestamp, 
    signature, 
    apiKey: process.env.CLOUDINARY_API_KEY, 
    cloudName: process.env.CLOUDINARY_CLOUD_NAME 
  };
}

// --- 2. Create Employee ---
export async function createEmployeeAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const phone = formData.get("phone") as string;
  const role = formData.get("role") as string;

  // ইউজারনেম থেকে ইমেল বানানো (সিস্টেমের জন্য)
  const email = `${username.toLowerCase().trim()}@test.com`;

  // ১. Auth User তৈরি (Admin পাওয়ার দিয়ে)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: fullName, username }
  });

  if (authError) return { error: authError.message };

  if (authData.user) {
    // ২. Profile টেবিলে ডাটা সেভ
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        username: username.toLowerCase().trim(),
        full_name: fullName,
        role: role,
        phone: phone,
        status: "active",
        avatar_url: ""
      });

    if (profileError) {
      // প্রোফাইল ফেইল হলে ইউজার ডিলিট করে দাও (Clean up)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { error: "Profile creation failed: " + profileError.message };
    }
  }

  return { success: true };
}

// --- 3. Update Profile ---
export async function updateEmployeeAction(userId: string, updates: { [key: string]: string }) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}

// --- 4. Delete Employee ---
export async function deleteEmployeeAction(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { success: true };
}
