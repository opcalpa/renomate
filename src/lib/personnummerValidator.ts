/**
 * Validates a Swedish personnummer using the Luhn algorithm (mod-10 check digit).
 * Accepts formats: YYYYMMDD-XXXX, YYYYMMDDXXXX, YYMMDD-XXXX, YYMMDDXXXX
 * Returns { valid, normalized } where normalized is in YYYYMMDD-XXXX format.
 */
export function validatePersonnummer(input: string): {
  valid: boolean;
  normalized: string;
} {
  const cleaned = input.replace(/\s/g, "");

  // Match YYYYMMDD-XXXX or YYMMDD-XXXX (with optional dash)
  const longMatch = cleaned.match(/^(\d{8})-?(\d{4})$/);
  const shortMatch = cleaned.match(/^(\d{6})-?(\d{4})$/);

  let datePart: string;
  let lastFour: string;

  if (longMatch) {
    datePart = longMatch[1]; // YYYYMMDD
    lastFour = longMatch[2];
  } else if (shortMatch) {
    // Convert YYMMDD to YYYYMMDD
    const yy = parseInt(shortMatch[1].substring(0, 2), 10);
    const century = yy >= 0 && yy <= 30 ? "20" : "19";
    datePart = century + shortMatch[1];
    lastFour = shortMatch[2];
  } else {
    return { valid: false, normalized: input };
  }

  // Basic date validation
  const year = parseInt(datePart.substring(0, 4), 10);
  const month = parseInt(datePart.substring(4, 6), 10);
  const day = parseInt(datePart.substring(6, 8), 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, normalized: input };
  }
  if (year < 1900 || year > 2100) {
    return { valid: false, normalized: input };
  }

  // Luhn check on the last 10 digits (YYMMDDXXXX)
  const luhnDigits = datePart.substring(2) + lastFour; // 10 digits: YYMMDDXXXX
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(luhnDigits[i], 10);
    // Multiply every other digit by 2, starting from the first
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  const valid = sum % 10 === 0;
  const normalized = `${datePart}-${lastFour}`;

  return { valid, normalized };
}
