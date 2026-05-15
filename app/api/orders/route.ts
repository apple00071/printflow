import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/supabase/actions";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Duplicate check for Gmail imports
    if (data.gmail_message_id) {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("gmail_message_id", data.gmail_message_id)
        .maybeSingle();
      
      if (existing) {
        return NextResponse.json({ success: true, order: existing, message: "Order already exists" });
      }
    }

    const order = await createOrder(data);
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("API Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
