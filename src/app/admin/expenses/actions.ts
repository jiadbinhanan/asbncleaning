"use server";

import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseCloudinaryUrl(pdfUrl: string): {
  publicId: string;
  resourceType: "image" | "raw" | "video";
} | null {
  try {
    const parsed = new URL(pdfUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const uploadIdx = segments.indexOf("upload");
    if (uploadIdx < 2) return null;

    const resourceType = segments[uploadIdx - 1] as "image" | "raw" | "video";
    const afterUpload = segments
      .slice(uploadIdx + 1)
      .join("/")
      .replace(/^v\d+\//, "");

    const publicId = afterUpload.replace(/\.[^/.]+$/, "");
    if (!publicId) return null;
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

export async function getExpenseSettingsAction() {
  try {
    const { data, error } = await supabaseAdmin
      .from("expense_settings")
      .select("*")
      .eq("id", 1)
      .single();
    
    if (error && error.code !== "PGRST116") throw error; // PGRST116 is not found
    
    // If no settings exist yet, return defaults
    if (!data) {
      return {
        success: true,
        data: { categories: [], payment_methods: ["Bank Transfer", "Cash"] }
      };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateExpenseSettingsAction(categories: any[], paymentMethods: string[]) {
  try {
    const { data, error } = await supabaseAdmin
      .from("expense_settings")
      .upsert({ id: 1, categories, payment_methods: paymentMethods })
      .select()
      .single();
      
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function addExpenseAction(
  amount: number, 
  description: string, 
  expenseDate: string, 
  categoryName: string,
  expenseType: string,
  paymentMethod: string,
  fileDataUrl?: string | null
) {
  try {
    let receipt_url = null;

    if (fileDataUrl) {
      const uploadRes = await cloudinary.uploader.upload(fileDataUrl, {
        folder: "expenses",
        resource_type: "auto",
      });
      receipt_url = uploadRes.secure_url;
    }

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .insert([
        { 
          amount, 
          description, 
          expense_date: expenseDate, 
          category_name: categoryName,
          expense_type: expenseType,
          payment_method: paymentMethod,
          receipt_url 
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function editExpenseAction(
  id: string, 
  amount: number, 
  description: string, 
  expenseDate: string, 
  categoryName: string,
  expenseType: string,
  paymentMethod: string,
  fileDataUrl?: string | null
) {
  try {
    const { data: existing } = await supabaseAdmin.from("expenses").select("receipt_url").eq("id", id).single();
    let receipt_url = existing?.receipt_url;

    if (fileDataUrl) {
      // Upload new file
      const uploadRes = await cloudinary.uploader.upload(fileDataUrl, {
        folder: "expenses",
        resource_type: "auto",
      });
      receipt_url = uploadRes.secure_url;

      // Delete old file if exists
      if (existing?.receipt_url) {
        const parsed = parseCloudinaryUrl(existing.receipt_url);
        if (parsed) {
          await cloudinary.uploader.destroy(parsed.publicId, { resource_type: parsed.resourceType });
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from("expenses")
      .update({ 
        amount, 
        description, 
        expense_date: expenseDate, 
        category_name: categoryName,
        expense_type: expenseType,
        payment_method: paymentMethod,
        receipt_url, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const { data: existing, error: fetchError } = await supabaseAdmin.from("expenses").select("receipt_url").eq("id", id).single();
    if (fetchError) throw fetchError;

    if (existing?.receipt_url) {
      const parsed = parseCloudinaryUrl(existing.receipt_url);
      if (parsed) {
        await cloudinary.uploader.destroy(parsed.publicId, { resource_type: parsed.resourceType });
      }
    }

    const { error: deleteError } = await supabaseAdmin.from("expenses").delete().eq("id", id);
    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
