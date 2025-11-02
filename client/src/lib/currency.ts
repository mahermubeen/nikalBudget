// Currency data for ISO 4217 currencies
// For Budget Nikal, we support major world currencies with proper formatting

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const currencies: CurrencyInfo[] = [
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 },
];

export function getCurrencyInfo(code: string): CurrencyInfo {
  return currencies.find(c => c.code === code) || currencies[0];
}

export function formatCurrency(amount: number | string, currencyCode: string): string {
  const currency = getCurrencyInfo(currencyCode);
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) return `${currency.symbol}0`;

  // Helper to remove trailing zeros
  const removeTrailingZeros = (str: string): string => {
    return str.replace(/\.00$/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  };

  const absAmount = Math.abs(numAmount);
  const sign = numAmount < 0 ? '-' : '';

  // Format with K, M, B suffixes
  if (absAmount >= 1_000_000_000) {
    const value = (absAmount / 1_000_000_000).toFixed(2);
    return `${sign}${currency.symbol}${removeTrailingZeros(value)}B`;
  } else if (absAmount >= 1_000_000) {
    const value = (absAmount / 1_000_000).toFixed(2);
    return `${sign}${currency.symbol}${removeTrailingZeros(value)}M`;
  } else if (absAmount >= 1_000) {
    const value = (absAmount / 1_000).toFixed(2);
    return `${sign}${currency.symbol}${removeTrailingZeros(value)}K`;
  } else {
    // For amounts < 1000, use standard formatting with commas
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: currency.decimals,
    });
    const formatted = formatter.format(absAmount);
    return `${sign}${currency.symbol}${removeTrailingZeros(formatted)}`;
  }
}

export function parseAmount(value: string): string {
  // Remove all non-numeric characters except decimal point
  const cleaned = value.replace(/[^0-9.]/g, '');
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}
