// AD ↔ BS (Bikram Sambat) Date Conversion Utility
// Uses the conversion logic and 1970–2090 BS calendar dataset from npdates.org

const EPOCH_AD = '1913-04-13'; // 1970/01/01 BS
const MIN_BS_YEAR = 1970;
const MAX_BS_YEAR = 2090;
const NPT_OFFSET_MS = 5 * 60 * 60 * 1000 + 45 * 60 * 1000; // Asia/Kathmandu (+05:45)

export const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

export const BS_MONTHS_NP = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुस', 'माघ', 'फाल्गुन', 'चैत',
];

const AD_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_NP = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

// Days in each month [Baisakh..Chaitra] for BS years 1970–2090 (from npdates.org)
const bsMonthData = {
  1970: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1971: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  1972: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  1973: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1974: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1975: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1976: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  1977: [31, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  1978: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1979: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1980: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1981: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  1982: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1983: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1984: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1985: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  1986: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1987: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  1988: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1989: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  1990: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1991: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  1992: [31, 32, 31, 32, 32, 30, 30, 30, 29, 30, 29, 30],
  1993: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1994: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1995: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  1996: [31, 32, 31, 32, 32, 30, 30, 30, 29, 30, 29, 30],
  1997: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1998: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1999: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2085: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2086: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
};

function toNepaliDigits(value) {
  return String(value).replace(/\d/g, (d) => NEPALI_DIGITS[Number(d)]);
}

function getEpochDate() {
  const [y, m, d] = EPOCH_AD.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function diffUtcDays(startUtc, endUtc) {
  return Math.round((endUtc.getTime() - startUtc.getTime()) / 86400000);
}

function getDaysInBsMonth(bsYear, bsMonth) {
  const months = bsMonthData[bsYear];
  if (!months) {
    throw new Error(`BS year ${bsYear} is out of supported range (${MIN_BS_YEAR}-${MAX_BS_YEAR})`);
  }
  if (bsMonth < 1 || bsMonth > 12) {
    throw new Error(`BS month must be between 1 and 12 (got ${bsMonth})`);
  }
  return months[bsMonth - 1];
}

function buildConversionResult(bs, ad) {
  const monthName = BS_MONTHS_EN[bs.month - 1];
  const monthNameNepali = BS_MONTHS_NP[bs.month - 1];
  const adIso = `${ad.year}-${String(ad.month).padStart(2, '0')}-${String(ad.day).padStart(2, '0')}`;
  const bsIso = `${bs.year}/${String(bs.month).padStart(2, '0')}/${String(bs.day).padStart(2, '0')}`;

  return {
    bs: {
      year: bs.year,
      month: bs.month,
      day: bs.day,
      monthName,
      monthNameNepali,
      weekday: bs.weekday,
      weekdayName: WEEKDAYS_EN[bs.weekday],
      weekdayNameNepali: WEEKDAYS_NP[bs.weekday],
      iso: bsIso,
      formatted: `${monthName} ${bs.day}, ${bs.year} BS`,
      formattedNepali: `${toNepaliDigits(bs.day)} ${monthNameNepali} ${toNepaliDigits(bs.year)}`,
    },
    ad: {
      year: ad.year,
      month: ad.month,
      day: ad.day,
      monthName: AD_MONTHS_EN[ad.month - 1],
      weekday: ad.weekday,
      weekdayName: WEEKDAYS_EN[ad.weekday],
      iso: adIso,
      formatted: `${AD_MONTHS_EN[ad.month - 1]} ${ad.day}, ${ad.year}`,
    },
  };
}

/**
 * Parse an AD date input (Date or YYYY-MM-DD / YYYY/MM/DD string) into { year, month, day }
 */
function parseAdInput(adDate) {
  let year, month, day;
  if (typeof adDate === 'string') {
    const parts = adDate.trim().split(/[-/]/);
    if (parts.length !== 3) {
      throw new Error(`Invalid AD date format: ${adDate}`);
    }
    [year, month, day] = parts.map((p) => parseInt(p, 10));
  } else {
    const d = new Date(adDate);
    if (Number.isNaN(d.getTime())) {
      throw new Error('Invalid AD date');
    }
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid AD date: ${adDate}`);
  }

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Invalid AD date: ${adDate}`);
  }

  return { year, month, day };
}

/**
 * Convert AD (year, month, day) to detailed { bs, ad } result (npdates.org algorithm)
 */
export function convertAdToBs(year, month, day) {
  const targetUtc = new Date(Date.UTC(year, month - 1, day));
  if (
    targetUtc.getUTCFullYear() !== year ||
    targetUtc.getUTCMonth() !== month - 1 ||
    targetUtc.getUTCDate() !== day
  ) {
    throw new Error(`Invalid AD date: ${year}-${month}-${day}`);
  }

  const epochUtc = getEpochDate();
  let remainingDays = diffUtcDays(epochUtc, targetUtc);
  if (remainingDays < 0) {
    throw new Error(`AD date is before the supported BS epoch (${EPOCH_AD})`);
  }

  const weekday = targetUtc.getUTCDay();
  let bsYear = MIN_BS_YEAR;

  while (bsYear <= MAX_BS_YEAR) {
    const months = bsMonthData[bsYear];
    if (!months) {
      throw new Error(`Missing BS calendar data for year ${bsYear}`);
    }
    const yearDays = months.reduce((sum, d) => sum + d, 0);
    if (remainingDays < yearDays) break;
    remainingDays -= yearDays;
    bsYear++;
  }

  if (bsYear > MAX_BS_YEAR) {
    throw new Error(`AD date is past supported BS range (max BS ${MAX_BS_YEAR})`);
  }

  let bsMonth = 1;
  const yearMonths = bsMonthData[bsYear];
  while (bsMonth <= 12) {
    const monthDays = yearMonths[bsMonth - 1];
    if (remainingDays < monthDays) break;
    remainingDays -= monthDays;
    bsMonth++;
  }

  const bsDay = remainingDays + 1;
  return buildConversionResult(
    { year: bsYear, month: bsMonth, day: bsDay, weekday },
    { year, month, day, weekday }
  );
}

/**
 * Convert BS (year, month, day) to detailed { bs, ad } result (npdates.org algorithm)
 */
export function convertBsToAd(bsYear, bsMonth, bsDay) {
  if (!bsMonthData[bsYear]) {
    throw new Error(`BS year ${bsYear} is out of supported range (${MIN_BS_YEAR}-${MAX_BS_YEAR})`);
  }
  const maxDay = getDaysInBsMonth(bsYear, bsMonth);
  if (bsDay < 1 || bsDay > maxDay) {
    throw new Error(`BS day must be between 1 and ${maxDay} for ${BS_MONTHS_EN[bsMonth - 1]} ${bsYear}`);
  }

  let totalDays = 0;
  for (let y = MIN_BS_YEAR; y < bsYear; y++) {
    for (const d of bsMonthData[y]) totalDays += d;
  }
  for (let m = 1; m < bsMonth; m++) {
    totalDays += getDaysInBsMonth(bsYear, m);
  }
  totalDays += bsDay - 1;

  const adUtc = new Date(getEpochDate().getTime());
  adUtc.setUTCDate(adUtc.getUTCDate() + totalDays);
  const weekday = adUtc.getUTCDay();

  return buildConversionResult(
    { year: bsYear, month: bsMonth, day: bsDay, weekday },
    {
      year: adUtc.getUTCFullYear(),
      month: adUtc.getUTCMonth() + 1,
      day: adUtc.getUTCDate(),
      weekday,
    }
  );
}

/**
 * Convert AD date to BS date string "YYYY/MM/DD"
 * @param {Date|string} adDate - JavaScript Date object or date string (YYYY-MM-DD or YYYY/MM/DD)
 * @returns {string} BS date string in format "YYYY/MM/DD"
 */
export function adToBs(adDate) {
  const { year, month, day } = parseAdInput(adDate);
  return convertAdToBs(year, month, day).bs.iso;
}

/**
 * Convert BS date string ("YYYY/MM/DD" or "YYYY-MM-DD") to AD date string "YYYY-MM-DD"
 */
export function bsToAd(bsDate) {
  const parts = String(bsDate).trim().split(/[-/]/);
  if (parts.length !== 3) {
    throw new Error(`Invalid BS date format: ${bsDate}`);
  }
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    throw new Error(`Invalid BS date: ${bsDate}`);
  }
  return convertBsToAd(y, m, d).ad.iso;
}

/**
 * Get current date/time details in Asia/Kathmandu (+05:45) timezone
 */
export function getTodayNepaliDate() {
  const now = new Date();
  const npt = new Date(now.getTime() + NPT_OFFSET_MS);
  return convertAdToBs(npt.getUTCFullYear(), npt.getUTCMonth() + 1, npt.getUTCDate());
}

/**
 * Get today's date in BS format ("YYYY/MM/DD") in Asia/Kathmandu
 */
export function getTodayBS() {
  return getTodayNepaliDate().bs.iso;
}

/**
 * Get today's date in AD format ("YYYY-MM-DD") in Asia/Kathmandu
 */
export function getTodayAD() {
  return getTodayNepaliDate().ad.iso;
}
