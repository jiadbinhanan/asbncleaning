"use server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function getAvatarUploadSignature() {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  const signature = cloudinary.utils.api_sign_request(
    { timestamp: timestamp, folder: "avatars" }, // ছবিগুলো 'avatars' ফোল্ডারে যাবে
    process.env.CLOUDINARY_API_SECRET!
  );
  
  return { 
    timestamp, 
    signature, 
    apiKey: process.env.CLOUDINARY_API_KEY, 
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 
  };
}