import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/supabase/actions";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const order = await createOrder(data);
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("API Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
