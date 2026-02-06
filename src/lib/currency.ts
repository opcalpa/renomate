/**
 * Currency utilities for formatting monetary values
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  position: 'before' | 'after';
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  SEK: { code: 'SEK', symbol: 'kr', locale: 'sv-SE', position: 'after' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', position: 'before' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', position: 'before' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', position: 'before' },
  NOK: { code: 'NOK', symbol: 'kr', locale: 'nb-NO', position: 'after' },
  DKK: { code: 'DKK', symbol: 'kr', locale: 'da-DK', position: 'after' },
};

export const DEFAULT_CURRENCY = 'SEK';

/**
 * Get currency configuration for a currency code
 */
export function getCurrencyConfig(currencyCode: string | null | undefined): CurrencyConfig {
  return CURRENCIES[currencyCode || DEFAULT_CURRENCY] || CURRENCIES[DEFAULT_CURRENCY];
}

/**
 * Get the symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string | null | undefined): string {
  return getCurrencyConfig(currencyCode).symbol;
}

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currencyCode - The currency code (e.g., 'SEK', 'EUR', 'USD')
 * @param options - Additional formatting options
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  options: {
    showSymbol?: boolean;
    decimals?: number;
    compact?: boolean;
  } = {}
): string {
  const { showSymbol = true, decimals = 0, compact = false } = options;

  if (amount === null || amount === undefined) {
    return showSymbol ? `${getCurrencySymbol(currencyCode)} -` : '-';
  }

  const config = getCurrencyConfig(currencyCode);

  // Format the number
  let formattedNumber: string;

  if (compact && Math.abs(amount) >= 1000) {
    // Compact format for large numbers (e.g., 1.2k, 1.5M)
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000) {
      formattedNumber = (amount / 1000000).toFixed(1) + 'M';
    } else if (absAmount >= 1000) {
      formattedNumber = (amount / 1000).toFixed(1) + 'k';
    } else {
      formattedNumber = amount.toLocaleString(config.locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
  } else {
    formattedNumber = amount.toLocaleString(config.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  if (!showSymbol) {
    return formattedNumber;
  }

  // Position symbol correctly
  if (config.position === 'after') {
    return `${formattedNumber} ${config.symbol}`;
  } else {
    return `${config.symbol}${formattedNumber}`;
  }
}
