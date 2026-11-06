// Display-only text fixes for checkout. The stored address is never changed; only what the customer reads.

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

// Matches a state name in any letter case, with or without the spaces ("andhrapradesh", "ANDHRA PRADESH").
const STATE_PATTERN = new RegExp(
  `(?<![A-Za-z])(${[...STATES]
    .sort((a, b) => b.length - a.length)
    .map((name) => name.split(' ').join('\s*'))
    .join('|')})(?![A-Za-z])`,
  'gi'
);

const canonicalState = (matched: string): string => {
  const key = matched.replace(/\s+/g, '').toLowerCase();
  return STATES.find((name) => name.replace(/\s+/g, '').toLowerCase() === key) ?? matched;
};

// "andhrapradesh, NALLA, Vijayawada" -> "Andhra Pradesh, NALLA, Vijayawada".
export const formatAddressForDisplay = (text: string): string => text.replace(STATE_PATTERN, (matched) => canonicalState(matched));
