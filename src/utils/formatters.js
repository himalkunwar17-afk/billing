// Utility functions for formatting currency, dates, and numbers

/**
 * Get local calendar date as YYYY-MM-DD (avoids UTC day shift in Nepal +05:45)
 */
export function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format amount as Nepali currency: Rs. X,XX,XXX.XX
 * Uses Nepali grouping: last 3 digits, then groups of 2
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'Rs. 0.00';
  const num = parseFloat(amount);
  if (isNaN(num)) return 'Rs. 0.00';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const [intPart, decPart] = absNum.toFixed(2).split('.');

  // Nepali grouping: last 3 digits, then groups of 2
  let result = '';
  const len = intPart.length;

  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(len - 3);
    let remaining = intPart.slice(0, len - 3);
    while (remaining.length > 2) {
      result = remaining.slice(remaining.length - 2) + ',' + result;
      remaining = remaining.slice(0, remaining.length - 2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
  }

  return `${isNegative ? '-' : ''}Rs. ${result}.${decPart}`;
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Convert number to English words for Nepali billing
 * Uses Nepali number system: Crore, Lakh, Thousand, Hundred
 */
export function numberToWordsEnglish(num) {
  if (num === 0) return 'Rupees Zero Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanHundred(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  function convertLessThanThousand(n) {
    if (n < 100) return convertLessThanHundred(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanHundred(n % 100) : '');
  }

  const absNum = Math.abs(Math.floor(num));
  const paisa = Math.round((Math.abs(num) - absNum) * 100);

  if (absNum === 0 && paisa > 0) {
    return `Rupees Zero and ${convertLessThanHundred(paisa)} Paisa Only`;
  }

  let words = '';
  let remaining = absNum;

  // Crore (1,00,00,000)
  if (remaining >= 10000000) {
    words += convertLessThanThousand(Math.floor(remaining / 10000000)) + ' Crore ';
    remaining %= 10000000;
  }

  // Lakh (1,00,000)
  if (remaining >= 100000) {
    words += convertLessThanHundred(Math.floor(remaining / 100000)) + ' Lakh ';
    remaining %= 100000;
  }

  // Thousand (1,000)
  if (remaining >= 1000) {
    words += convertLessThanHundred(Math.floor(remaining / 1000)) + ' Thousand ';
    remaining %= 1000;
  }

  // Hundred and below
  if (remaining > 0) {
    words += convertLessThanThousand(remaining);
  }

  let result = 'Rupees ' + words.trim();
  if (paisa > 0) {
    result += ' and ' + convertLessThanHundred(paisa) + ' Paisa';
  }
  result += ' Only';

  return result;
}
