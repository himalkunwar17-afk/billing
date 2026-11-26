// Number to Words Conversion Utility
// Supports both Nepali and English output for Nepali currency (Rupees / रुपैयाँ)
// Uses South Asian numbering: Lakhs, Thousands, Hundreds

// ─── English Constants ────────────────────────────────────────────

const onesEn = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tensEn = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

// ─── Nepali Constants ─────────────────────────────────────────────

const onesNp = [
  '', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ',
  'दस', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र',
  'सत्र', 'अठार', 'उन्नाइस',
];

const tensNp = [
  '', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठी', 'सत्तरी', 'अस्सी', 'नब्बे',
];

// ─── Helper: Convert a number below 100 to English words ──────────

function belowHundredEn(n) {
  if (n < 20) return onesEn[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return tensEn[ten] + (one ? ' ' + onesEn[one] : '');
}

// ─── Helper: Convert a number below 100 to Nepali words ──────────

function belowHundredNp(n) {
  if (n < 20) return onesNp[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return tensNp[ten] + (one ? ' ' + onesNp[one] : '');
}

// ─── Core: Convert whole integer to English words (South Asian) ───

function intToWordsEn(num) {
  if (num === 0) return 'Zero';

  let result = '';

  // Crores (1,00,00,000)
  const crores = Math.floor(num / 10000000);
  if (crores > 0) {
    result += intToWordsEn(crores) + ' Crore ';
    num %= 10000000;
  }

  // Lakhs (1,00,000)
  const lakhs = Math.floor(num / 100000);
  if (lakhs > 0) {
    result += belowHundredEn(lakhs) + ' Lakh ';
    num %= 100000;
  }

  // Thousands (1,000)
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    result += belowHundredEn(thousands) + ' Thousand ';
    num %= 1000;
  }

  // Hundreds (100)
  const hundreds = Math.floor(num / 100);
  if (hundreds > 0) {
    result += onesEn[hundreds] + ' Hundred ';
    num %= 100;
  }

  // Remaining below 100
  if (num > 0) {
    result += belowHundredEn(num) + ' ';
  }

  return result.trim();
}

// ─── Core: Convert whole integer to Nepali words (South Asian) ────

function intToWordsNp(num) {
  if (num === 0) return 'शून्य';

  let result = '';

  // Crores (1,00,00,000)
  const crores = Math.floor(num / 10000000);
  if (crores > 0) {
    result += intToWordsNp(crores) + ' करोड ';
    num %= 10000000;
  }

  // Lakhs (1,00,000)
  const lakhs = Math.floor(num / 100000);
  if (lakhs > 0) {
    result += belowHundredNp(lakhs) + ' लाख ';
    num %= 100000;
  }

  // Thousands (1,000)
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    result += belowHundredNp(thousands) + ' हजार ';
    num %= 1000;
  }

  // Hundreds (100)
  const hundreds = Math.floor(num / 100);
  if (hundreds > 0) {
    result += onesNp[hundreds] + ' सय ';
    num %= 100;
  }

  // Remaining below 100
  if (num > 0) {
    result += belowHundredNp(num) + ' ';
  }

  return result.trim();
}

/**
 * Convert a number to Nepali currency words (in Nepali script)
 * @param {number} num - The amount in NPR
 * @returns {string} e.g. "रुपैयाँ एक लाख पचास हजार मात्र"
 */
export function numberToWordsNepali(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  if (num === 0) return 'रुपैयाँ शून्य मात्र';

  const absNum = Math.abs(num);
  const intPart = Math.floor(absNum);
  const decPart = Math.round((absNum - intPart) * 100);

  let result = 'रुपैयाँ ' + intToWordsNp(intPart);

  if (decPart > 0) {
    result += ' र ' + intToWordsNp(decPart) + ' पैसा';
  }

  result += ' मात्र';

  return result;
}

/**
 * Convert a number to English currency words (Nepali Rupees)
 * @param {number} num - The amount in NPR
 * @returns {string} e.g. "Rupees One Lakh Fifty Thousand Only"
 */
export function numberToWordsEnglish(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  if (num === 0) return 'Rupees Zero Only';

  const absNum = Math.abs(num);
  const intPart = Math.floor(absNum);
  const decPart = Math.round((absNum - intPart) * 100);

  let result = 'Rupees ' + intToWordsEn(intPart);

  if (decPart > 0) {
    result += ' and ' + intToWordsEn(decPart) + ' Paisa';
  }

  result += ' Only';

  return result;
}
