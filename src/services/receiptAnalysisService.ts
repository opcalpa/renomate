import { supabase } from "@/integrations/supabase/client";

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ReceiptAnalysisResult {
  vendor_name: string;
  total_amount: number;
  vat_amount: number | null;
  purchase_date: string | null;
  line_items: ReceiptLineItem[];
  confidence: number;
}

/**
 * Analyzes a receipt image using AI vision to extract structured data.
 * @param imageBase64 Base64-encoded image data (without the data:image prefix)
 * @returns Extracted receipt data
 */
export async function analyzeReceipt(imageBase64: string): Promise<ReceiptAnalysisResult> {
  const { data, error } = await supabase.functions.invoke<ReceiptAnalysisResult>(
    "process-receipt",
    {
      body: { image: imageBase64 },
    }
  );

  if (error) {
    console.error("Receipt analysis error:", error);
    throw new Error(error.message || "Failed to analyze receipt");
  }

  if (!data) {
    throw new Error("No data returned from receipt analysis");
  }

  return data;
}

/**
 * Generates a smart filename for a receipt based on extracted data.
 * Format: "Kvitto_{vendor}_{datum}_{belopp}kr.jpg"
 * Sanitized for Supabase Storage (no spaces, ASCII-safe)
 */
export function generateReceiptFilename(
  vendorName: string,
  purchaseDate: string | null,
  totalAmount: number
): string {
  const vendor = vendorName.trim() || "Okand";
  const date = purchaseDate || new Date().toISOString().split("T")[0];
  const amount = Math.round(totalAmount);

  // Sanitize vendor name for storage:
  // 1. Replace Swedish characters
  // 2. Replace spaces and invalid chars with underscores
  // 3. Remove consecutive underscores
  const sanitizedVendor = vendor
    .replace(/å/gi, "a")
    .replace(/ä/gi, "a")
    .replace(/ö/gi, "o")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 30);

  return `Kvitto_${sanitizedVendor}_${date}_${amount}kr.jpg`;
}
