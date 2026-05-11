import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/supabase/actions";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// ─── FILTER LAYER 1: Block known marketing/automated senders ───────────────
const BLOCKED_SENDER_PATTERNS = [
  /noreply/i, /no-reply/i, /newsletter/i, /notifications?@/i,
  /mailer@/i, /marketing@/i, /support@youtube/i, /info@youtube/i,
  /youtube\.com/i, /supabase\.io/i, /pabbly\.com/i, /perplexity/i,
  /google\.com/i, /linkedin\.com/i, /facebook\.com/i, /twitter\.com/i,
  /medium\.com/i, /substack\.com/i, /mailchimp/i, /sendgrid/i,
];

// ─── FILTER LAYER 2: Require at least one print-related keyword ─────────────
const PRINT_KEYWORDS = [
  /\bprint/i, /\bcopies\b/i, /\bpaper\b/i, /\bgsm\b/i, /\blaminate/i,
  /\bartwork\b/i, /\bdesign\b/i, /\bposter\b/i, /\bbanner\b/i,
  /\bvisiting card/i, /\bbusiness card/i, /\bflyer/i, /\bbrochure/i,
  /\boffset\b/i, /\bdigital print/i, /\bflex\b/i, /\bvinyl\b/i,
  /\bsticker/i, /\d+\s*x\s*\d+/i,  // matches "18x12", "18 x 12"
  /\bcell:/i, /\bqty:/i, /\bquantity:/i,
];

function isMarketingEmail(from: string): boolean {
  return BLOCKED_SENDER_PATTERNS.some(pattern => pattern.test(from));
}

function isPrintOrderEmail(subject: string, body: string): boolean {
  const text = `${subject} ${body}`;
  return PRINT_KEYWORDS.some(keyword => keyword.test(text));
}

export async function GET() {
  const supabase = createClient();

  try {
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

        // ─── SYNC LOCK: Skip if synced within the last 50 seconds ───────────
        // Prevents duplicate orders when cron-job.org and in-app sync overlap.
        const lastSynced = integration.updated_at ? new Date(integration.updated_at).getTime() : 0;
        const secondsSinceSync = (Date.now() - lastSynced) / 1000;
        if (secondsSinceSync < 50) {
          results.push({ tenant: integration.tenants.name, skipped: "locked", secondsAgo: Math.round(secondsSinceSync) });
          continue;
        }

        // Mark as "syncing now" to lock other concurrent runs
        await supabase
          .from("tenant_integrations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", integration.id);
        // ─────────────────────────────────────────────────────────────────────

        // Refresh token if expired
        const isExpired = new Date(integration.token_expiry) <= new Date(Date.now() + 60000);
        if (isExpired && integration.refresh_token) {
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

        // ─── FILTER LAYER 1: Only Primary inbox (not Promotions/Social/Updates) ───
        const gmailQuery = encodeURIComponent("is:unread category:primary");
        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${gmailQuery}&maxResults=10`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const listData = await listRes.json();

        if (!listData.messages) {
          results.push({ tenant: integration.tenants.name, ordersCreated: 0, skipped: 0 });
          continue;
        }

        let ordersCreated = 0;
        let skipped = 0;

        for (const msgSummary of listData.messages) {
          const msgRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const message = await msgRes.json();

          const headers = message.payload.headers;
          const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
          const from = headers.find((h: any) => h.name === "From")?.value || "";

          // ─── FILTER LAYER 2: Skip marketing senders (mark as read silently) ──
          if (isMarketingEmail(from)) {
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}/modify`, {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
            });
            skipped++;
            continue;
          }

          // Get email body
          let body = "";
          if (message.payload.parts) {
            const textPart = message.payload.parts.find((p: any) => p.mimeType === "text/plain");
            if (textPart?.body.data) body = Buffer.from(textPart.body.data, "base64").toString();
          } else if (message.payload.body?.data) {
            body = Buffer.from(message.payload.body.data, "base64").toString();
          }

          // ─── FILTER LAYER 3: Must have print-related keywords ────────────────
          if (!isPrintOrderEmail(subject, body)) {
            // Not a print order — don't mark as read, just skip
            skipped++;
            continue;
          }

          // ─── Passed all filters — extract order details ──────────────────────
          const qtyMatch = body.match(/Qty:\s*(\d+)/i) || body.match(/Quantity:\s*(\d+)/i) || body.match(/(\d+)\s*copies/i);
          const jobMatch = body.match(/Item:\s*([^\n\r]+)/i) || body.match(/Product:\s*([^\n\r]+)/i);
          const phoneMatch = body.match(/CELL:\s*(\+?[\d\s-]{10,})/i) || body.match(/Phone:\s*(\+?[\d\s-]{10,})/i) || body.match(/\b(\d{10})\b/);

          const jobType = jobMatch ? jobMatch[1].trim() : subject || "New Order";
          const customerName = from.split("<")[0].replace(/"/g, "").trim() || "Email Customer";
          const hasPhone = !!(phoneMatch?.[1]);

          // Handle Attachments
          let fileUrl = "";
          if (message.payload.parts) {
            const attachmentParts = message.payload.parts.filter((p: any) => p.filename && p.body.attachmentId);
            for (const part of attachmentParts) {
              const attachRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}/attachments/${part.body.attachmentId}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              const attachmentData = await attachRes.json();
              if (attachmentData.data) {
                const buffer = Buffer.from(attachmentData.data, "base64");
                const fileExt = part.filename.split(".").pop();
                const filePath = `${integration.tenant_id}/orders/gmail-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                  .from("printflow-files")
                  .upload(filePath, buffer, { contentType: part.mimeType, upsert: true });
                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage.from("printflow-files").getPublicUrl(filePath);
                  fileUrl = publicUrl;
                  break;
                }
              }
            }
          }

          const instructions = hasPhone
            ? `Auto-created from Gmail.\nFrom: ${from}\nSubject: ${subject}\n\n${body.substring(0, 400)}`
            : `⚠️ NO PHONE FOUND IN EMAIL.\nFrom: ${from}\nSubject: ${subject}\n\n${body.substring(0, 400)}`;

          const newOrder = await createOrder({
            customerName,
            phone: hasPhone ? phoneMatch![1].replace(/\D/g, "") : "",
            jobType,
            quantity: qtyMatch ? qtyMatch[1] : "1",
            instructions,
            totalAmount: 0,
            advancePaid: 0,
            tenantId: integration.tenant_id,
            file_url: fileUrl,
          });

          // WhatsApp notification to tenant
          if (integration.tenants.phone) {
            const orderId = (newOrder as any)?.friendly_id || (newOrder as any)?.id || "New";
            const shopMsg = `📧 *New Gmail Order!*\n\nCustomer: *${customerName}*\nJob: *${jobType}*\nQty: ${qtyMatch ? qtyMatch[1] : "1"}\n${hasPhone ? `Phone: ${phoneMatch![1]}` : "⚠️ No Phone Number"}\nOrder ID: *${orderId}*\n\nCheck your PrintFlow dashboard.`;
            sendWhatsAppMessage({ phone: integration.tenants.phone, message: shopMsg }).catch(console.error);
          }

          // Mark as read
          await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}/modify`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
          });

          ordersCreated++;
        }

        results.push({ tenant: integration.tenants.name, ordersCreated, skipped });
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
