import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/supabase/actions";
import { sendWhatsAppMessage, formatStatusMessage } from "@/lib/whatsapp";

export async function GET() {
  const supabase = createClient();
  
  try {
    // 1. Fetch all active Gmail integrations (include tenant phone for WA notifications)
    const { data: integrations, error: fetchError } = await supabase
      .from("tenant_integrations")
      .select("*, tenants(name, id_prefix, phone)")
      .eq("type", "GMAIL")
      .eq("is_active", true);

    if (fetchError) throw fetchError;
    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ message: "No active integrations found" });
    }

    const results = [];

    for (const integration of integrations) {
      try {
        let accessToken = integration.access_token;
        
        // 2. Check if token is expired (or close to expiring)
        const isExpired = new Date(integration.token_expiry) <= new Date(Date.now() + 60000);
        
        if (isExpired && integration.refresh_token) {
          console.log(`Refreshing token for tenant: ${integration.tenant_id}`);
          const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: integration.refresh_token,
              grant_type: "refresh_token",
            }),
          });
          
          const newTokens = await refreshRes.json();
          if (newTokens.access_token) {
            accessToken = newTokens.access_token;
            await supabase
              .from("tenant_integrations")
              .update({
                access_token: accessToken,
                token_expiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", integration.id);
          }
        }

        // 3. Fetch recent messages
        // Query: 'is:unread after:2024/01/01' (adjust as needed)
        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=5`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const listData = await listRes.json();

        if (!listData.messages) {
          results.push({ tenant: integration.tenants.name, ordersCreated: 0 });
          continue;
        }

        let ordersCreated = 0;

        for (const msgSummary of listData.messages) {
          const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const message = await msgRes.json();
          
          // 4. Parse Message (Basic Logic)
          const headers = message.payload.headers;
          const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
          const from = headers.find((h: any) => h.name === "From")?.value || "";
          
          // Get body text
          let body = "";
          if (message.payload.parts) {
            const textPart = message.payload.parts.find((p: any) => p.mimeType === "text/plain");
            if (textPart && textPart.body.data) {
              body = Buffer.from(textPart.body.data, "base64").toString();
            }
          } else if (message.payload.body.data) {
            body = Buffer.from(message.payload.body.data, "base64").toString();
          }

          // Simple Extraction Rules
          const qtyMatch = body.match(/Qty:\s*(\d+)/i) || body.match(/Quantity:\s*(\d+)/i);
          const jobMatch = body.match(/Item:\s*([^\n\r]+)/i) || body.match(/Product:\s*([^\n\r]+)/i);
          const phoneMatch = body.match(/CELL:\s*(\d+)/i) || body.match(/(\d{10})/);
          
          const jobType = jobMatch ? jobMatch[1].trim() : subject || "New Order";
          const customerName = from.split("<")[0].replace(/"/g, "").trim() || "Email Customer";

          // 5. Handle Attachments
          let fileUrl = "";
          if (message.payload.parts) {
            const attachmentParts = message.payload.parts.filter((p: any) => p.filename && p.body.attachmentId);
            
            for (const part of attachmentParts) {
              const attachRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}/attachments/${part.body.attachmentId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              const attachmentData = await attachRes.json();
              
              if (attachmentData.data) {
                const buffer = Buffer.from(attachmentData.data, "base64");
                const fileExt = part.filename.split(".").pop();
                const filePath = `${integration.tenant_id}/orders/gmail-${Date.now()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                  .from("printflow-files")
                  .upload(filePath, buffer, {
                    contentType: part.mimeType,
                    upsert: true
                  });

                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage
                    .from("printflow-files")
                    .getPublicUrl(filePath);
                  fileUrl = publicUrl;
                  break; // Use the first attachment found
                }
              }
            }
          }

          const hasPhone = !!(phoneMatch && phoneMatch[1]);
          const instructions = hasPhone
            ? `Auto-created from Gmail.\nFrom: ${from}\nSubject: ${subject}\n\n${body.substring(0, 400)}`
            : `⚠️ NO PHONE FOUND IN EMAIL.\nFrom: ${from}\nSubject: ${subject}\n\n${body.substring(0, 400)}`;

          if (qtyMatch || jobMatch || subject || body.includes("CELL")) {
            // Create Order
            const newOrder = await createOrder({
              customerName: customerName,
              phone: hasPhone ? phoneMatch![1] : "",
              jobType: jobType,
              quantity: qtyMatch ? qtyMatch[1] : "1",
              instructions,
              totalAmount: 0,
              advancePaid: 0,
              tenantId: integration.tenant_id,
              file_url: fileUrl
            });

            // 7. Send WhatsApp notification to the TENANT (shop owner)
            if (integration.tenants.phone) {
              const orderId = (newOrder as any)?.friendly_id || (newOrder as any)?.id || "New";
              const shopMsg = `📧 *New Gmail Order!*\n\nCustomer: *${customerName}*\nJob: *${jobType}*\nQty: ${qtyMatch ? qtyMatch[1] : "1"}\n${hasPhone ? `Phone: ${phoneMatch![1]}` : "⚠️ No Phone Number"}\nOrder ID: *${orderId}*\n\nCheck your PrintFlow dashboard to view the full order.`;

              sendWhatsAppMessage({
                phone: integration.tenants.phone,
                message: shopMsg,
              }).catch(console.error);
            }

            // 8. Mark as read (Remove UNREAD label)
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}/modify`, {
              method: "POST",
              headers: { 
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
            });

            ordersCreated++;
          }
        }

        results.push({ tenant: integration.tenants.name, ordersCreated });
      } catch (innerError: any) {
        console.error(`Error syncing for ${integration.tenants.name}:`, innerError);
        results.push({ tenant: integration.tenants.name, error: innerError.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Global Sync Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
