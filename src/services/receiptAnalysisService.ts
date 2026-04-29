import { supabase } from "@/integrations/supabase/client";

export interface DocumentLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface DocumentAnalysisResult {
  document_type: "receipt" | "invoice";
  vendor_name: string;
  total_amount: number;
  vat_amount: number | null;
  purchase_date: string | null;
  due_date: string | null;
  invoice_number: string | null;
  ocr_number: string | null;
  line_items: DocumentLineItem[];
  rot_amount: number | null;
  rot_personnummer: string | null;
  confidence: number;
}

// Legacy alias for backwards compatibility
export type ReceiptLineItem = DocumentLineItem;
export type ReceiptAnalysisResult = DocumentAnalysisResult;

/**
 * Analyzes a document (receipt or invoice) using AI vision to extract structured data.
 * @param imageBase64 Base64-encoded image data (without the data:image prefix)
 * @returns Extracted document data including document type
 */
export async function analyzeDocument(imageBase64: string): Promise<DocumentAnalysisResult> {
  const { data, error } = await supabase.functions.invoke<DocumentAnalysisResult>(
    "process-receipt",
    {
      body: { image: imageBase64 },
    }
  );

  if (error) {
    console.error("Document analysis error:", error);
    throw new Error(error.message || "Failed to analyze document");
  }

  if (!data) {
    throw new Error("No data returned from document analysis");
  }

  return data;
}

/**
 * Legacy function for backwards compatibility.
 * @deprecated Use analyzeDocument instead
 */
export const analyzeReceipt = analyzeDocument;

/**
 * Sanitizes a vendor name for use in filenames.
 * Replaces Swedish characters and invalid chars with underscores.
 */
function sanitizeForFilename(name: string, maxLength = 30): string {
  return name
    .trim()
    .replace(/å/gi, "a")
    .replace(/ä/gi, "a")
    .replace(/ö/gi, "o")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, maxLength) || "Okand";
}

/**
 * Generates a smart filename for a document based on extracted data.
 * Format for receipts: "Kvitto_{vendor}_{datum}_{belopp}kr.jpg"
 * Format for invoices: "Faktura_{vendor}_{fakturanr}_{belopp}kr.jpg"
 * Sanitized for Supabase Storage (no spaces, ASCII-safe)
 */
export function generateDocumentFilename(
  documentType: "receipt" | "invoice",
  vendorName: string,
  purchaseDate: string | null,
  totalAmount: number,
  invoiceNumber?: string | null
): string {
  const sanitizedVendor = sanitizeForFilename(vendorName);
  const date = purchaseDate || new Date().toISOString().split("T")[0];
  const amount = Math.round(totalAmount);

  if (documentType === "invoice") {
    const invoiceNum = invoiceNumber ? sanitizeForFilename(invoiceNumber, 20) : date;
    return `Faktura_${sanitizedVendor}_${invoiceNum}_${amount}kr.jpg`;
  }

  return `Kvitto_${sanitizedVendor}_${date}_${amount}kr.jpg`;
}

/**
 * Legacy function for backwards compatibility.
 * @deprecated Use generateDocumentFilename instead
 */
export function generateReceiptFilename(
  vendorName: string,
  purchaseDate: string | null,
  totalAmount: number
): string {
  return generateDocumentFilename("receipt", vendorName, purchaseDate, totalAmount);
}
