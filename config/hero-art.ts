/**
 * Hero artwork. Three dark blue images cross fade in the home hero (HeroSlides). Files live in public/images/hero/.
 * `position` is the CSS object-position that keeps the subject in view: `desktop` for the wide hero, `mobile` for the tall band on phones.
 * Leave HERO_SLIDES empty to fall back to the code made scene (botanical linework and 3D products).
 */
export interface HeroSlide {
  src: string;
  alt: string;
  desktop: string;
  mobile: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    src: "/images/hero/hero-night-portrait.webp",
    alt: "A woman with closed eyes and glowing skin beside a glass serum bottle and white lotus flowers, in deep blue night light.",
    desktop: "62% 40%",
    mobile: "64% 30%",
  },
  {
    src: "/images/hero/hero-lotus-serum.webp",
    alt: "A glass serum bottle on a stone ledge among white lotus and jasmine flowers over a calm blue pond.",
    desktop: "72% 50%",
    mobile: "76% 50%",
  },
  {
    src: "/images/hero/hero-dewy-portrait.webp",
    alt: "A woman with dewy skin and closed eyes beside a glass dropper bottle and jasmine flowers on a blue background.",
    desktop: "66% 38%",
    mobile: "66% 28%",
  },
];

/** The cream engraving behind the tagline section further down the home page. */
export const TAGLINE_ART = {
  src: "/images/hero/tagline-engraving.webp",
  alt: "A blue engraving of a glass serum bottle on a rock among lotus and jasmine flowers, with a temple tower beside a calm river.",
};
