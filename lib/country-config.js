/**
 * lib/country-config.js — Country, currency, and phone prefix configuration
 * Used across the EduVantage portal for locale-aware formatting.
 */

export const COUNTRIES = [
  { code: 'KE', name: 'Kenya',          flag: '🇰🇪', phonePrefix: '+254', currency: 'KES', currencySymbol: 'KSh', defaultCurriculum: 'CBC' },
  { code: 'NG', name: 'Nigeria',         flag: '🇳🇬', phonePrefix: '+234', currency: 'NGN', currencySymbol: '₦',   defaultCurriculum: 'BRITISH' },
  { code: 'ZA', name: 'South Africa',    flag: '🇿🇦', phonePrefix: '+27',  currency: 'ZAR', currencySymbol: 'R',   defaultCurriculum: 'BRITISH' },
  { code: 'GH', name: 'Ghana',           flag: '🇬🇭', phonePrefix: '+233', currency: 'GHS', currencySymbol: 'GH₵', defaultCurriculum: 'BRITISH' },
  { code: 'TZ', name: 'Tanzania',        flag: '🇹🇿', phonePrefix: '+255', currency: 'TZS', currencySymbol: 'TSh', defaultCurriculum: 'CBC' },
  { code: 'UG', name: 'Uganda',          flag: '🇺🇬', phonePrefix: '+256', currency: 'UGX', currencySymbol: 'USh', defaultCurriculum: 'BRITISH' },
  { code: 'RW', name: 'Rwanda',          flag: '🇷🇼', phonePrefix: '+250', currency: 'RWF', currencySymbol: 'RF',  defaultCurriculum: 'CBC' },
  { code: 'ET', name: 'Ethiopia',        flag: '🇪🇹', phonePrefix: '+251', currency: 'ETB', currencySymbol: 'Br',  defaultCurriculum: 'BRITISH' },
  { code: 'EG', name: 'Egypt',           flag: '🇪🇬', phonePrefix: '+20',  currency: 'EGP', currencySymbol: 'E£',  defaultCurriculum: 'BRITISH' },
  { code: 'MA', name: 'Morocco',         flag: '🇲🇦', phonePrefix: '+212', currency: 'MAD', currencySymbol: 'MAD', defaultCurriculum: 'BRITISH' },
  { code: 'GB', name: 'United Kingdom',  flag: '🇬🇧', phonePrefix: '+44',  currency: 'GBP', currencySymbol: '£',   defaultCurriculum: 'BRITISH' },
  { code: 'US', name: 'United States',   flag: '🇺🇸', phonePrefix: '+1',   currency: 'USD', currencySymbol: '$',   defaultCurriculum: 'IB' },
  { code: 'IN', name: 'India',           flag: '🇮🇳', phonePrefix: '+91',  currency: 'INR', currencySymbol: '₹',   defaultCurriculum: 'BRITISH' },
  { code: 'AE', name: 'UAE',             flag: '🇦🇪', phonePrefix: '+971', currency: 'AED', currencySymbol: 'AED', defaultCurriculum: 'BRITISH' },
  { code: 'ZW', name: 'Zimbabwe',        flag: '🇿🇼', phonePrefix: '+263', currency: 'ZWL', currencySymbol: 'Z$',  defaultCurriculum: 'BRITISH' },
  { code: 'ZM', name: 'Zambia',          flag: '🇿🇲', phonePrefix: '+260', currency: 'ZMW', currencySymbol: 'ZK',  defaultCurriculum: 'BRITISH' },
  { code: 'MW', name: 'Malawi',          flag: '🇲🇼', phonePrefix: '+265', currency: 'MWK', currencySymbol: 'MK',  defaultCurriculum: 'BRITISH' },
  { code: 'MZ', name: 'Mozambique',      flag: '🇲🇿', phonePrefix: '+258', currency: 'MZN', currencySymbol: 'MT',  defaultCurriculum: 'BRITISH' },
  { code: 'BW', name: 'Botswana',        flag: '🇧🇼', phonePrefix: '+267', currency: 'BWP', currencySymbol: 'P',   defaultCurriculum: 'BRITISH' },
  { code: 'OTHER', name: 'Other',        flag: '🌍',  phonePrefix: '',     currency: 'USD', currencySymbol: '$',   defaultCurriculum: 'BRITISH' },
];

const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

/**
 * Get country config by code
 * @param {string} code - ISO country code
 * @returns {Object} country config
 */
export function getCountry(code) {
  return COUNTRY_MAP[code] || COUNTRY_MAP['KE'];
}

/**
 * Format a monetary amount using the school's currency configuration
 * @param {number} amount
 * @param {string} countryCode - ISO country code from school profile
 * @param {object} options
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, countryCode = 'KE', options = {}) {
  const country = getCountry(countryCode);
  const { symbol = true, compact = false } = options;

  const num = Number(amount) || 0;
  let formatted;

  if (compact && num >= 1_000_000) {
    formatted = (num / 1_000_000).toFixed(1) + 'M';
  } else if (compact && num >= 1_000) {
    formatted = (num / 1_000).toFixed(1) + 'K';
  } else {
    formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  return symbol ? `${country.currencySymbol} ${formatted}` : formatted;
}

/**
 * Format a phone number with the country's prefix
 * @param {string} phone - Raw phone number
 * @param {string} countryCode - ISO country code
 * @returns {string} Phone with prefix
 */
export function formatPhone(phone, countryCode = 'KE') {
  if (!phone) return '';
  const country = getCountry(countryCode);
  const cleaned = String(phone).replace(/\D/g, '');

  // If already has country code, return as-is with + prefix
  if (phone.startsWith('+')) return phone;

  // Strip leading zero, add country prefix
  const local = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
  return `${country.phonePrefix}${local}`;
}

/**
 * Get the currency symbol for a country
 * @param {string} countryCode
 * @returns {string}
 */
export function getCurrencySymbol(countryCode = 'KE') {
  return getCountry(countryCode).currencySymbol;
}

/**
 * Get the phone prefix for a country
 * @param {string} countryCode
 * @returns {string}
 */
export function getPhonePrefix(countryCode = 'KE') {
  return getCountry(countryCode).phonePrefix;
}

/**
 * Derive country code from a profile object
 * Falls back to 'KE' for backwards compatibility
 * @param {object} profile - School profile object
 * @returns {string} ISO country code
 */
export function getProfileCountry(profile) {
  return profile?.country || 'KE';
}
