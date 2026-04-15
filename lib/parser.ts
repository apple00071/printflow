export interface ParsedJobDetails {
  quantity?: string;
  paperType?: string;
  size?: string;
  printingSide?: string;
  lamination?: string;
  jobType?: string;
}

/**
 * Intelligent parser that extracts structured printing job metadata from a free-form string.
 * @param text The input job description
 */
export function parseOrderText(text: string): ParsedJobDetails {
  const result: ParsedJobDetails = {};
  if (!text) return result;

  const lower = text.toLowerCase();

  // 1. Quantity Detection
  // Matches "100 pcs", "Qty: 500", "500 cards", "10,000"
  // Priority: "Digits at start" or "Digits after Qty"
  const qtyMatch = text.match(/(?:qty|quantity|count|pcs)[:\s]*(\d+(?:[,\s]*\d+)*)/i) ||
                  text.match(/^(\d+(?:[,\s]*\d+)*)/i);
  if (qtyMatch) {
    result.quantity = qtyMatch[1].replace(/,/g, '').trim();
  }

  // 2. Size Detection
  const standardSizes = ["a4", "a3", "a5", "a6", "12x18", "13x19", "2x3.5", "10x15", "4x6", "3x2", "6x4", "8x10"];
  for (const s of standardSizes) {
    const regex = new RegExp(`\\b${s}\\b`, 'i');
    if (regex.test(lower)) {
      result.size = s.toUpperCase();
      break;
    }
  }
  
  // Generic size pattern like "10x12 ft" or "8 x 10 inches"
  const dimMatch = text.match(/(\d+(?:\.\d+)?\s*[x*]\s*\d+(?:\.\d+)?(?:\s*(?:in|inches|ft|feet|cm|mm|mtr|meters))?)/i);
  if (dimMatch && !result.size) {
    result.size = dimMatch[1].trim();
  }

  // 3. Paper Type Detection
  if (text.match(/\b(\d+\s*gsm)\b/i)) {
    const gsmMatch = text.match(/\b(\d+\s*gsm)\b/i);
    result.paperType = gsmMatch ? gsmMatch[1].toUpperCase() : undefined;
    
    // Add context if available (e.g., "300gsm Matte")
    if (lower.includes("matte")) result.paperType += " Matte";
    else if (lower.includes("gloss")) result.paperType += " Glossy";
  } else {
    const paperKeywords = ["star flex", "blackout", "vinly", "sticker", "bond", "ivory", "art paper", "canvas"];
    for (const p of paperKeywords) {
      if (lower.includes(p)) {
        result.paperType = p.charAt(0).toUpperCase() + p.slice(1);
        break;
      }
    }
  }

  // 4. Printing Side Detection
  if (lower.includes("double") || lower.includes("both side") || lower.includes("2 side") || lower.includes("back to back")) {
    result.printingSide = "Double Side";
  } else if (lower.includes("single") || lower.includes("front") || lower.includes("1 side")) {
    result.printingSide = "Single Side";
  }

  // 5. Lamination Detection
  if (lower.includes("no lamination") || lower.includes("none")) {
    result.lamination = "None";
  } else if (lower.includes("gloss lam") || (lower.includes("gloss") && !result.paperType?.toLowerCase().includes("gloss"))) {
    result.lamination = "Gloss";
  } else if (lower.includes("matte lam") || (lower.includes("matte") && !result.paperType?.toLowerCase().includes("matte"))) {
    result.lamination = "Matte";
  } else if (lower.includes("velvet") || lower.includes("soft touch")) {
    result.lamination = "Velvet";
  }

  // 6. Job Type Detection
  const jobMapping: Record<string, string> = {
    "card": "Business Cards",
    "visiting": "Business Cards",
    "banner": "Banners",
    "flex": "Flex Prints",
    "letterhead": "Letterheads",
    "wedding": "Wedding Cards",
    "invitation": "Wedding Cards",
    "pamphlet": "Pamphlets",
    "flyer": "Pamphlets",
    "sticker": "Stickers"
  };
  for (const [key, val] of Object.entries(jobMapping)) {
    if (lower.includes(key)) {
      result.jobType = val;
      break;
    }
  }

  return result;
}
