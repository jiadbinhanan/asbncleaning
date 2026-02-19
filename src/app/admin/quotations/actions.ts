"use server";

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // --- Supabase Admin Setup (For Bypassing RLS on Insert) ---
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase configuration.");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
          });

          /**
           * 1. Cloudinary Signature Generator for Quotations
            * এটি ক্লাউডিনারির 'quotations' ফোল্ডারে ফাইল আপলোডের অনুমতি দেবে।
             */
             export async function getQuotationUploadSignature() {
               const timestamp = Math.round(new Date().getTime() / 1000);
                 
                   const signature = cloudinary.utils.api_sign_request(
                       { timestamp: timestamp, folder: "quotations" },
                           process.env.CLOUDINARY_API_SECRET!
                             );
                               
                                 return { 
                                     timestamp, 
                                         signature, 
                                             apiKey: process.env.CLOUDINARY_API_KEY, 
                                                 cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME 
                                                   };
                                                   }

                                                   /**
                                                    * 2. Save Quotation Record to Supabase
                                                     * পিডিএফ আপলোড হওয়ার পর তার লিংক এবং বিস্তারিত তথ্য ডাটাবেসে সেভ করবে।
                                                      */
                                                      export async function saveQuotationRecord(data: { 
                                                        quote_no: string, 
                                                          company_name: string, 
                                                            quote_date: string, 
                                                              pdf_url: string 
                                                              }) {
                                                                try {
                                                                    const { error } = await supabaseAdmin
                                                                          .from("quotations")
                                                                                .insert([{
                                                                                        quote_no: data.quote_no,
                                                                                                company_name: data.company_name,
                                                                                                        quote_date: data.quote_date,
                                                                                                                pdf_url: data.pdf_url
                                                                                                                      }]);

                                                                                                                          if (error) {
                                                                                                                                console.error("Quotation Save Error:", error.message);
                                                                                                                                      return { success: false, error: error.message };
                                                                                                                                          }
                                                                                                                                              
                                                                                                                                                  return { success: true };
                                                                                                                                                    } catch (err: any) {
                                                                                                                                                        return { success: false, error: err.message };
                                                                                                                                                          }
                                                                                                                                                          }