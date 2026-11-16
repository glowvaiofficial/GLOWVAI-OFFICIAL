// An admin hero that is only a picture (no title, subtitle or button) is a finished poster that already carries its own
// text. It is shown alone, full-bleed, with no overlay. Pure.
export function isPosterOnlyHero(hero: { title?: string; subtitle?: string; ctaLabel?: string; image?: string } | null | undefined): boolean {
  return !!hero && !!hero.image && !hero.title && !hero.subtitle && !hero.ctaLabel;
}
