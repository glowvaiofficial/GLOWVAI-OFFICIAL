// Cosmetic guidance shown under each detected skin concern on the scan report.
// General skincare only: not a diagnosis or treatment advice. Review wording before release.
export interface ConcernGuidance {
  meaning: string;
  helps: string[];
}

export const CONCERN_GUIDANCE: Record<string, ConcernGuidance> = {
  oiliness: {
    meaning: 'Your T-zone (forehead, nose and chin) makes more oil than the rest of your face, so it can look shiny by midday.',
    helps: ['A gentle cleanser twice a day', 'A light, oil-free moisturiser', 'Niacinamide serums are often used to balance oil'],
  },
  dryness: {
    meaning: 'Your skin is short of water right now, which can feel tight and look dull or flaky.',
    helps: ['A hydrating serum with hyaluronic acid on slightly damp skin', 'A moisturiser with ceramides to hold water in', 'Lukewarm water and a mild cleanser'],
  },
  redness: {
    meaning: 'Some areas look flushed or pink, often from irritation, weather or sensitivity.',
    helps: ['Fragrance-free, gentle products', 'Daily sunscreen to limit sun-related redness', 'Soothing ingredients such as panthenol or centella'],
  },
  uneven_tone: {
    meaning: 'Patches of different shades, often from sun exposure or past marks, make the complexion look uneven.',
    helps: ['Daily sunscreen, the most useful single step', 'Vitamin C or niacinamide in the morning', 'Visible change usually takes several weeks of consistent use'],
  },
  visible_blemishes: {
    meaning: 'Spots or breakouts are visible on the surface of the skin right now.',
    helps: ['A salicylic acid cleanser for clogged pores', 'Avoid picking or squeezing', 'If breakouts are painful, deep or keep coming back, see a dermatologist'],
  },
};
