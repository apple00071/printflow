/**
 * WhatsApp Utility for PrintFlow
 * Integrates with WASender API to send automated notifications.
 */

const WASENDER_API_URL = "https://wasenderapi.com/api/send-message";

interface WhatsAppParams {
  phone: string;
  message: string;
}

/**
 * Sends a WhatsApp message using the WASender API.
 * This is designed to be called from Server Actions.
 */
export async function sendWhatsAppMessage({ phone, message }: WhatsAppParams) {
  const apiKey = process.env.WASENDER_API_KEY;
  if (!apiKey) {
    console.warn("WASENDER_API_KEY is not defined. WhatsApp notification skipped.");
    return { success: false, error: "Missing API Key" };
  }

  // Clean the phone number (remove +, spaces, dashes)
  const cleanPhone = phone.replace(/\D/g, "");

  try {
    const response = await fetch(WASENDER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        to: cleanPhone,
        text: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WASender API Error:", data);
      return { success: false, error: data.message || "Failed to send message" };
    }

    return { success: true, response: data };
  } catch (error) {
    console.error("WhatsApp Integration Error:", error);
    return { success: false, error: "Network or Server error" };
  }
}

/**
 * Formats a message based on the order status and tenant branding.
 */
export function formatStatusMessage(
  status: string,
  customerName: string,
  jobType: string,
  orderId: string,
  tenantName: string,
  balance: number,
  proofingToken?: string,
  totalBalance?: number
): string {
  const safeCustomer = customerName || "Customer";
  const safeJob = jobType || "Order";
  const safeID = orderId || "N/A";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  switch (status.toUpperCase()) {
    case "RECEIVED":
      return `Hi ${safeCustomer}, your order for ${safeJob} has been received by *${tenantName}*. We'll notify you when design starts! Order ID: ${safeID}.`;
    
    case "DESIGNING":
      return `Hi ${safeCustomer}, *${tenantName}* has started designing your order for ${safeJob}. Order ID: ${safeID}.`;
    
    case "PRINTING":
      return `Update: Your order for ${safeJob} is now being *Printed* at *${tenantName}*. Order ID: ${safeID}.`;
    
    case "READY":
      return `Exciting! Your order for ${safeJob} is *READY* for pickup at *${tenantName}*. Balance to pay: ₹${balance.toFixed(2)}. Order ID: ${safeID}.`;

    case "PROOF_READY":
      return `Hi ${safeCustomer}, please approve your design proof from ${tenantName} here: ${baseUrl}/proof/${orderId}?token=${proofingToken}`;
    
    case "SHOP_NOTIFY_PROOF":
      const action = balance === 1 ? "*APPROVED*" : "*REVISION REQUESTED*";
      return `Design Update: Order ${safeID} (${safeJob}) has been ${action} by ${safeCustomer}.${proofingToken ? ` Feedback: "${proofingToken}"` : ""}`;

    case "SHOP_NOTIFY_NEW_ORDER":
      return `🔔 New Storefront Order! ${safeCustomer} has placed an order for *${safeJob}*. View it in your dashboard. Order ID: ${safeID}.`;

    case "DELIVERED":
      let msg = `Hi *${customerName}*, thank you for choosing *${tenantName}*! Your order for ${safeJob} has been delivered.`;
      
      if (balance > 0) {
        msg += `\n\n*Pending Balance for this order:* ₹${balance.toFixed(2)}`;
      }

      if (totalBalance !== undefined && totalBalance > 0) {
        msg += `\n*Total Outstanding Balance:* ₹${totalBalance.toFixed(2)}`;
        msg += `\n\n*Please settle the outstanding balance at your earliest convenience.*`;
      } else {
        msg += `\n\nWe hope to see you again soon!`;
      }
      return msg;



    
    default:
      return "";
  }
}
