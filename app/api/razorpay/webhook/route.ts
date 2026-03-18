import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const supabase = createClient();

    if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
      const subscription = event.payload.subscription.entity;
      const tenantId = subscription.notes.tenant_id;

      if (tenantId) {
        // Update tenant plan
        const { error } = await supabase
          .from('tenants')
          .update({ 
            plan: 'PRO',
            plan_status: 'ACTIVE',
            razorpay_sub_id: subscription.id,
            subscription_end_date: new Date(subscription.current_end * 1000).toISOString()
          })
          .eq('id', tenantId);

        if (error) throw error;
      }
    }

    if (event.event === 'subscription.halted' || event.event === 'subscription.cancelled') {
      const subscription = event.payload.subscription.entity;
      const tenantId = subscription.notes.tenant_id;

      if (tenantId) {
        await supabase
          .from('tenants')
          .update({ 
            plan_status: 'INACTIVE',
          })
          .eq('id', tenantId);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: unknown) {
    console.error('Razorpay webhook error:', error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
