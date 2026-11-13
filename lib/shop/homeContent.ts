// Homepage sections the admin publishes (Firestore siteContent/home, field "published"). Pure: no Firebase, no React.
// The admin panel writes this document and enforces the same limits. Here the shop only reads it, so every value is
// checked again before it reaches a customer. Anything malformed is dropped, never shown.
//
// Times are epoch milliseconds. A section shows when it is enabled, its start has passed (null = already started), and
// its end has not passed (null = never ends). So a banner set to start at 12:00 goes live at 12:00 by itself.

export const HOME_SECTION_KINDS = ["banner", "offer", "festival"] as const;
export type HomeSectionKind = (typeof HOME_SECTION_KINDS)[number];

export interface HomeSection {
  id: string;
  kind: HomeSectionKind;
  title: string;
  subtitle: string;
  ctaLabel: string;
  link: string;
  image: string;
  background: string;
  textColor: string;
  startsAt: number | null;
  endsAt: number | null;
  enabled: boolean;
  position: number;
}

export const HOME_LIMITS = {
  maxSections: 20,
  titleMax: 80,
  subtitleMax: 160,
  ctaMax: 30,
  linkMax: 200,
  imageMax: 300_000,
} as const;

const ID_PATTERN = /^[a-z0-9-]{8,40}$/;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const IMAGE_PATTERN = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

// An internal path only: no scheme, no protocol-relative "//host", no backslash tricks.
export function isSafeLink(link: string): boolean {
  if (link.length === 0 || link.length > HOME_LIMITS.linkMax) return false;
  if (!link.startsWith("/") || link.startsWith("//")) return false;
  if (link.includes("\\") || /[\u0000-\u001f\s]/.test(link)) return false;
  return true;
}

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);
const time = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

// Reads one stored section. Returns null when anything required is missing or out of range.
export function readSection(raw: unknown): HomeSection | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const id = typeof d.id === "string" && ID_PATTERN.test(d.id) ? d.id : null;
  const kind = HOME_SECTION_KINDS.find((k) => k === d.kind) ?? null;
  const title = str(d.title, HOME_LIMITS.titleMax);
  const subtitle = str(d.subtitle, HOME_LIMITS.subtitleMax);
  const ctaLabel = str(d.ctaLabel, HOME_LIMITS.ctaMax);
  const link = str(d.link, HOME_LIMITS.linkMax);
  const image = typeof d.image === "string" ? d.image : "";
  const background = typeof d.background === "string" && HEX_PATTERN.test(d.background) ? d.background : null;
  const textColor = typeof d.textColor === "string" && HEX_PATTERN.test(d.textColor) ? d.textColor : null;
  const startsAt = d.startsAt === null || d.startsAt === undefined ? null : time(d.startsAt);
  const endsAt = d.endsAt === null || d.endsAt === undefined ? null : time(d.endsAt);
  const position = typeof d.position === "number" && Number.isInteger(d.position) && d.position >= 0 && d.position <= 999 ? d.position : null;
  if (!id || !kind || title === null || title.trim() === "" || subtitle === null || ctaLabel === null || link === null) return null;
  if (!isSafeLink(link) || background === null || textColor === null || position === null) return null;
  if (image !== "" && (image.length > HOME_LIMITS.imageMax || !IMAGE_PATTERN.test(image))) return null;
  if (typeof d.startsAt !== "number" && d.startsAt !== null && d.startsAt !== undefined) return null;
  if (typeof d.endsAt !== "number" && d.endsAt !== null && d.endsAt !== undefined) return null;
  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) return null;
  return {
    id,
    kind,
    title,
    subtitle,
    ctaLabel,
    link,
    image,
    background,
    textColor,
    startsAt,
    endsAt,
    enabled: d.enabled === true,
    position,
  };
}

// The sections a customer may see right now, in order. Invalid stored entries are skipped.
export function activeSections(stored: unknown, now: number): HomeSection[] {
  if (!Array.isArray(stored)) return [];
  const parsed = stored.slice(0, HOME_LIMITS.maxSections).map(readSection).filter((s): s is HomeSection => s !== null);
  return parsed
    .filter((s) => s.enabled && (s.startsAt === null || s.startsAt <= now) && (s.endsAt === null || s.endsAt > now))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}
