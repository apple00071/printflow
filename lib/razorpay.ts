import Razorpay from 'razorpay';

// Lazy initialization to avoid build-time errors when ENV vars are missing
let razorpayInstance: Razorpay | null = null;

export function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn("Razorpay environment variables are missing.");
    return null;
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    limit: 50,
  },
  PRO: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: 999,
    limit: Infinity,
    razorpay_plan_id: process.env.NEXT_PUBLIC_RAZORPAY_PLAN_ID_PRO || '',
  }
};
