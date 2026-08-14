"use server";

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function updateActionPassword(currentPassword: string, newPassword: string) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current setting
    const { data: setting, error } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "action_password")
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
      return { success: false, message: "Database error" };
    }

    if (setting) {
      // Compare current password
      const isMatch = await bcrypt.compare(currentPassword, setting.value);
      if (!isMatch) {
        return { success: false, message: "Incorrect current password" };
      }
    } else {
      // If no password exists yet, we assume current is "1234"
      const defaultMatch = await bcrypt.compare(currentPassword, await bcrypt.hash("1234", 10));
      if (!defaultMatch && currentPassword !== "1234") {
        return { success: false, message: "Incorrect current password (default is 1234)" };
      }
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Upsert new password
    const { error: upsertError } = await supabaseAdmin
      .from("settings")
      .upsert({ key: "action_password", value: hashed, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (upsertError) {
      return { success: false, message: "Failed to update password" };
    }

    return { success: true, message: "Action password updated successfully" };
  } catch (err: any) {
    return { success: false, message: err.message || "An error occurred" };
  }
}
