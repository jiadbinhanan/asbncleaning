'use server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with your credentials
// IMPORTANT: Store these in environment variables in a real application
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generates a signature for securely uploading an avatar to Cloudinary.
 * This function should be called from a server-side component or action.
 */
export async function getAvatarUploadSignature() {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Create the signature
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: 'avatars', // Optional: saves to a specific folder in Cloudinary
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  };
}
