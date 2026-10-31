/**
 * Country Dial Codes Dataset with ISO codes and flag emojis
 */

export interface CountryCodeItem {
  name: string;
  dialCode: string;
  isoCode: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { name: 'India', dialCode: '+91', isoCode: 'IN', flag: '🇮🇳' },
  { name: 'United States', dialCode: '+1', isoCode: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', dialCode: '+44', isoCode: 'GB', flag: '🇬🇧' },
  { name: 'United Arab Emirates', dialCode: '+971', isoCode: 'AE', flag: '🇦🇪' },
  { name: 'Canada', dialCode: '+1', isoCode: 'CA', flag: '🇨🇦' },
  { name: 'Australia', dialCode: '+61', isoCode: 'AU', flag: '🇦🇺' },
  { name: 'Singapore', dialCode: '+65', isoCode: 'SG', flag: '🇸🇬' },
  { name: 'Germany', dialCode: '+49', isoCode: 'DE', flag: '🇩🇪' },
  { name: 'France', dialCode: '+33', isoCode: 'FR', flag: '🇫🇷' },
  { name: 'Saudi Arabia', dialCode: '+966', isoCode: 'SA', flag: '🇸🇦' },
  { name: 'Malaysia', dialCode: '+60', isoCode: 'MY', flag: '🇲🇾' },
  { name: 'New Zealand', dialCode: '+64', isoCode: 'NZ', flag: '🇳🇿' },
];

export const getCountryByIso = (isoCode: string): CountryCodeItem => {
  const found = COUNTRY_CODES.find(c => c.isoCode.toUpperCase() === isoCode.toUpperCase());
  return found || COUNTRY_CODES[0]!; // Default to India (+91)
};
