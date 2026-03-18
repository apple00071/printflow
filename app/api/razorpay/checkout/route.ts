import { NextResponse } from 'next/server';
import { getRazorpay, PLANS } from '@/lib/razorpay';
import { createClient } from '@/lib/supabase/server';
import { getCurrentTenant } from '@/lib/tenant';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const tenant = await getCurrentTenant(supabase);

    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await req.json();

    if (planId === 'pro_monthly') {
      const razorpay = getRazorpay();
      if (!razorpay) {
        return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
      }
      
      // Create Razorpay Subscription
      const subscription = await razorpay.subscriptions.create({
        plan_id: PLANS.PRO.razorpay_plan_id,
        customer_notify: 1,
        total_count: 12, // 1 year
        addons: [],
        notes: {
          tenant_id: tenant.id,
        },
      });

      return NextResponse.json({ 
        subscription_id: subscription.id,
        key_id: process.env.RAZORPAY_KEY_ID 
      });
    }

    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Razorpay checkout error:', error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
