// Every public claim lives here. Components render a claim ONLY if verified is true.
// VERIFY BEFORE LAUNCH: flip a flag to true only when you hold the proof.
export type Claim = { id: string; text: string; verified: boolean; proof?: string };

export const photoWording = {
  short: "Photos stored privately. Delete anytime.",
  full: "Your photo is sent to us only when you submit your report, and it is stored privately. Delete your data anytime at contact@glowvai.in.",
  faq: "Your photo is sent to us only when you submit your report, and it is stored privately. Delete your data anytime at contact@glowvai.in.",
};

export const claims: Record<string, Claim> = {
  freeScan:             { id: 'freeScan', text: 'Free face scan', verified: true },
  imageStoredPrivately: { id: 'imageStoredPrivately', text: photoWording.short, verified: true, proof: 'Drive folder is private; delete_user removes file' },
  photoNeverStored:     { id: 'photoNeverStored', text: photoWording.short, verified: false, proof: 'REPLACED with accurate optional storage claim' },
  madeInIndia:          { id: 'madeInIndia', text: 'Made in India', verified: false, proof: 'Requires manufacturer address and licence verification' },
  dermatologistTested:  { id: 'dermatologistTested', text: 'Dermatologist tested', verified: false, proof: 'Requires lab test report per product' },
  crueltyFree:          { id: 'crueltyFree', text: 'Cruelty free', verified: false, proof: 'Requires certificate or supplier declarations' },
  fastDelivery:         { id: 'fastDelivery', text: 'Doorstep express delivery', verified: false, proof: 'Unverified until live dark store metrics exist' },
  coldChain:            { id: 'coldChain', text: 'Cold-chain dark store', verified: false },
  awardWinner:          { id: 'awardWinner', text: 'Award Winner', verified: false },
  bestsellerBadges:     { id: 'bestsellerBadges', text: 'Bestseller', verified: false },
  coldPressed:          { id: 'coldPressed', text: 'Cold-pressed actives', verified: false },
  smallBatch:           { id: 'smallBatch', text: 'Small-batch', verified: false },
  zeroFillerWater:      { id: 'zeroFillerWater', text: 'Zero filler water', verified: false },
  ethicalSourcing:      { id: 'ethicalSourcing', text: 'Ethically sourced', verified: false },
  verifiedReviews:      { id: 'verifiedReviews', text: 'Verified purchase reviews', verified: false },
  ratingValue:          { id: 'ratingValue', text: '', verified: false },
  customerCount:        { id: 'customerCount', text: '', verified: false },
  madeForIndianSkin:    { id: 'madeForIndianSkin', text: 'Formulated for Indian climate', verified: true },
};

export const isVerified = (id: keyof typeof claims) => claims[id]?.verified === true;

export const fastDeliveryClaim = claims.fastDelivery;
export const photoNeverStoredClaim = claims.photoNeverStored;
export const imageStoredPrivatelyClaim = claims.imageStoredPrivately;

export const proofClaims = Object.values(claims);
export const trustStripClaimsList = Object.values(claims).map((c) => ({
  id: c.id,
  label: c.text,
  verified: c.verified,
}));

export const brandValuesClaims = {
  honestClaims: {
    title: "Honest Picks",
    text: "We only stock brands we would use ourselves, and we show the label ingredients plainly.",
    verified: true,
  },
  privacyFirst: {
    title: "Privacy First",
    text: "Your photo is analysed on your phone. Storing it is optional.",
    verified: true,
  },
  pricedForRealLife: {
    title: "Priced for Real Life",
    text: "Prices match the brand MRP or lower.",
    verified: true,
  },
  madeForIndianSkin: {
    title: "Clear Labels",
    text: "Every product page lists ingredients, size and price.",
    verified: true,
  },
};

export const neverList = [
  "Parabens",
  "Sulphates (SLS/SLES)",
  "Phthalates",
  "Mineral Oil",
  "Synthetic Dyes",
  "Formaldehyde Release Agents",
];

export const neverListVerified = true;

export const deliveryStatsClaims = [
  { id: 'ds1', label: 'Average ETA', value: '~15 min', verified: false },
  { id: 'ds2', label: 'Pincodes', value: '50+ Active', verified: false },
  { id: 'ds3', label: 'Temperature Control', value: 'Chilled Bags', verified: false },
];

export const cityCoverageClaims = [
  { id: "hyd", label: "Hyderabad", verified: false },
  { id: "blr", label: "Bengaluru", verified: false },
  { id: "bom", label: "Mumbai", verified: false },
  { id: "del", label: "Delhi NCR", verified: false },
  { id: "maa", label: "Chennai", verified: false },
];

