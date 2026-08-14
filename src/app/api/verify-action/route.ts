import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ success: false, message: "Password is required" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: setting, error } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "action_password")
      .single();

    if (error || !setting) {
      // If no password is set yet, we default to "1234" in development or reject.
      // Let's assume default is "1234" for the first time setup if missing
      const isMatch = await bcrypt.compare(password, await bcrypt.hash("1234", 10));
      if (isMatch) return NextResponse.json({ success: true, message: "Default password used. Please update." });
      
      return NextResponse.json({ success: false, message: "Action password not configured" }, { status: 500 });
    }

    const isMatch = await bcrypt.compare(password, setting.value);

    if (isMatch) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: "Incorrect password" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
