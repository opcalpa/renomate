/**
 * SIE4 Export Service
 *
 * Generates SIE4 files (Swedish standard for accounting data exchange).
 * Compatible with Fortnox, Visma, Björn Lundén, Hogia, and all Swedish
 * accounting software.
 *
 * Format spec: https://sie.se/format/
 * Character encoding: CP437 (IBM PC) — we output UTF-8 and let user convert if needed.
 */

import { supabase } from "@/integrations/supabase/client";

// BAS-kontoplan (Swedish standard chart of accounts)
const ACCOUNTS = {
  KUNDFORDRINGAR: "1510",      // Accounts receivable
  BANK: "1930",                // Bank account
  FORSALJNING_TJANSTER: "3010", // Service sales (ex moms)
  FORSALJNING_VAROR: "3020",    // Product sales (ex moms)
  MOMS_UTGAENDE: "2610",       // Output VAT (25%)
  ROT_FORDRAN: "1513",         // ROT deduction receivable (from Skatteverket)
} as const;

interface SieCompanyInfo {
  name: string;
  orgNumber: string;
  address?: string;
  postalCode?: string;
  city?: string;
}

interface SieInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string | null;
  totalAmount: number;
  totalRotDeduction: number;
  status: string;
  paidAmount: number;
  paidAt: string | null;
  items: SieInvoiceItem[];
}

interface SieInvoiceItem {
  description: string;
  totalPrice: number;
  isRotEligible: boolean;
  rotDeduction: number;
}

function formatSieDate(dateStr: string): string {
  return dateStr.replace(/-/g, "").slice(0, 8);
}

function sieString(value: string): string {
  // SIE strings are quoted
  return `"${value.replace(/"/g, '""')}"`;
}

function generateVerification(
  verNum: number,
  date: string,
  description: string,
  rows: { account: string; amount: number }[]
): string {
  const lines: string[] = [];
  lines.push(`#VER "" ${verNum} ${formatSieDate(date)} ${sieString(description)}`);
  lines.push("{");
  for (const row of rows) {
    // #TRANS account {} amount
    lines.push(`  #TRANS ${row.account} {} ${row.amount.toFixed(2)}`);
  }
  lines.push("}");
  return lines.join("\n");
}

export async function generateSie4Export(
  profileId: string,
  year: number
): Promise<{ content: string; filename: string }> {
  // 1. Fetch company info
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, company_name, org_number, company_address, company_postal_code, company_city")
    .eq("id", profileId)
    .single();

  const company: SieCompanyInfo = {
    name: (profile as Record<string, unknown>)?.company_name as string || profile?.name || "Företag",
    orgNumber: (profile as Record<string, unknown>)?.org_number as string || "",
    address: (profile as Record<string, unknown>)?.company_address as string || "",
    postalCode: (profile as Record<string, unknown>)?.company_postal_code as string || "",
    city: (profile as Record<string, unknown>)?.company_city as string || "",
  };

  // 2. Fetch invoices for the year (sent or paid)
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, created_at, due_date, total_amount, total_rot_deduction, status, paid_amount, paid_at")
    .eq("creator_id", profileId)
    .in("status", ["sent", "paid", "partially_paid"])
    .gte("created_at", startDate)
    .lte("created_at", endDate + "T23:59:59")
    .order("created_at");

  if (!invoices || invoices.length === 0) {
    return {
      content: "",
      filename: `SIE4_${company.name.replace(/\s/g, "_")}_${year}.se`,
    };
  }

  // 3. Fetch items for all invoices
  const invoiceIds = invoices.map((inv) => inv.id);
  const { data: allItems } = await supabase
    .from("invoice_items")
    .select("invoice_id, description, total_price, is_rot_eligible, rot_deduction")
    .in("invoice_id", invoiceIds);

  const itemsByInvoice = new Map<string, SieInvoiceItem[]>();
  for (const item of allItems || []) {
    const arr = itemsByInvoice.get(item.invoice_id) || [];
    arr.push({
      description: item.description || "",
      totalPrice: item.total_price || 0,
      isRotEligible: item.is_rot_eligible || false,
      rotDeduction: item.rot_deduction || 0,
    });
    itemsByInvoice.set(item.invoice_id, arr);
  }

  const sieInvoices: SieInvoice[] = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number || "–",
    date: inv.created_at.split("T")[0],
    dueDate: inv.due_date,
    totalAmount: inv.total_amount || 0,
    totalRotDeduction: inv.total_rot_deduction || 0,
    status: inv.status || "sent",
    paidAmount: inv.paid_amount || 0,
    paidAt: inv.paid_at?.split("T")[0] || null,
    items: itemsByInvoice.get(inv.id) || [],
  }));

  // 4. Build SIE4 file
  const lines: string[] = [];

  // Header
  lines.push("#FLAGGA 0");
  lines.push(`#FORMAT PC8`);
  lines.push(`#SIETYP 4`);
  lines.push(`#PROGRAM "Renofine" "1.0"`);
  lines.push(`#GEN ${formatSieDate(new Date().toISOString().split("T")[0])}`);
  lines.push(`#FNAMN ${sieString(company.name)}`);
  if (company.orgNumber) {
    lines.push(`#ORGNR ${sieString(company.orgNumber)}`);
  }
  if (company.address) {
    lines.push(`#ADRESS ${sieString(company.address)} ${sieString(company.postalCode || "")} ${sieString(company.city || "")}`);
  }

  // Fiscal year
  lines.push(`#RAR 0 ${year}0101 ${year}1231`);

  // Chart of accounts (only accounts we use)
  lines.push(`#KONTO ${ACCOUNTS.KUNDFORDRINGAR} ${sieString("Kundfordringar")}`);
  lines.push(`#KONTO ${ACCOUNTS.BANK} ${sieString("Företagskonto / checkkonto")}`);
  lines.push(`#KONTO ${ACCOUNTS.FORSALJNING_TJANSTER} ${sieString("Försäljning tjänster")}`);
  lines.push(`#KONTO ${ACCOUNTS.FORSALJNING_VAROR} ${sieString("Försäljning varor")}`);
  lines.push(`#KONTO ${ACCOUNTS.MOMS_UTGAENDE} ${sieString("Utgående moms 25%")}`);
  lines.push(`#KONTO ${ACCOUNTS.ROT_FORDRAN} ${sieString("ROT-avdrag fordran Skatteverket")}`);

  // Verifications (one per invoice)
  let verNum = 1;

  for (const inv of sieInvoices) {
    const netAmount = inv.totalAmount; // ex moms
    const vat = Math.round(netAmount * 0.25 * 100) / 100;
    const grossAmount = netAmount + vat;
    const rotDeduction = inv.totalRotDeduction || 0;
    const customerOwes = grossAmount - rotDeduction;

    // Verification: Invoice created
    const invoiceRows: { account: string; amount: number }[] = [
      { account: ACCOUNTS.KUNDFORDRINGAR, amount: customerOwes },
    ];

    if (rotDeduction > 0) {
      invoiceRows.push({ account: ACCOUNTS.ROT_FORDRAN, amount: rotDeduction });
    }

    invoiceRows.push(
      { account: ACCOUNTS.FORSALJNING_TJANSTER, amount: -netAmount },
      { account: ACCOUNTS.MOMS_UTGAENDE, amount: -vat }
    );

    lines.push("");
    lines.push(generateVerification(
      verNum++,
      inv.date,
      `Faktura ${inv.invoiceNumber}`,
      invoiceRows
    ));

    // Verification: Payment received (if paid)
    if (inv.status === "paid" && inv.paidAt) {
      lines.push("");
      lines.push(generateVerification(
        verNum++,
        inv.paidAt,
        `Betalning ${inv.invoiceNumber}`,
        [
          { account: ACCOUNTS.BANK, amount: customerOwes },
          { account: ACCOUNTS.KUNDFORDRINGAR, amount: -customerOwes },
        ]
      ));
    }

    // ROT payment from Skatteverket (if paid and has ROT)
    if (inv.status === "paid" && inv.paidAt && rotDeduction > 0) {
      lines.push("");
      lines.push(generateVerification(
        verNum++,
        inv.paidAt,
        `ROT-utbetalning Skatteverket ${inv.invoiceNumber}`,
        [
          { account: ACCOUNTS.BANK, amount: rotDeduction },
          { account: ACCOUNTS.ROT_FORDRAN, amount: -rotDeduction },
        ]
      ));
    }
  }

  const content = lines.join("\n") + "\n";
  const filename = `SIE4_${company.name.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, "_")}_${year}.se`;

  return { content, filename };
}

export function downloadSieFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
