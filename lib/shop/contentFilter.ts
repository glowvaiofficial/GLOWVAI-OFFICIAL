// Filters for text customers write on the shop (review titles and bodies, product questions). Pure functions, no server
// imports, so the tests run them directly.
//
// A text is refused when it contains an email address, a long phone-like number, a link, profanity, or the same text
// repeated over and over. The lists are a starter set: the admin team owns the wording and can extend the lists here.

export type ContentProblem = "LINK" | "CONTACT" | "PROFANITY" | "REPEATED";

export const CONTENT_PROBLEM_MESSAGE: Record<ContentProblem, string> = {
  LINK: "Links and web addresses cannot be posted here.",
  CONTACT: "Email addresses and phone numbers cannot be posted here.",
  PROFANITY: "Please keep it respectful. Remove the rude words and try again.",
  REPEATED: "Please write in your own words. Repeated text cannot be posted.",
};

// Top-level domains that make "word.tld" a web address even without http or www.
const TLDS = [
  "com", "in", "net", "org", "io", "co", "me", "ly", "info", "biz", "xyz", "app", "shop", "site", "online", "store",
  "link", "click", "top", "tk", "ru", "cn", "uk", "us", "ai", "dev", "gl", "be", "de", "fr", "eu", "gov", "edu",
];
const LINK_PATTERN = new RegExp(
  String.raw`(https?:\/\/|www\.|\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(${TLDS.join("|")})(\b|\/))`,
  "i",
);
const EMAIL_PATTERN = /@[a-z0-9-]+\.[a-z]{2,}|[^\s@]+@[^\s@]+/i;
// Ten or more digits, with optional spaces or dashes between them.
const PHONE_PATTERN = /(?:\+?\d[\s-]?){10,}/;

// Profanity as whole words. Before matching, stand-in characters are undone and runs of a repeated letter are
// collapsed, so "f#ck", "f*ck" and "fuuuck" all match "fuck".
const PROFANE = [
  "fuck", "fucking", "shit", "bitch", "bastard", "asshole", "cunt", "slut", "whore", "dick", "pussy", "motherfucker",
  "bhenchod", "behenchod", "madarchod", "chutiya", "chutiye", "gandu", "randi", "lodu", "lund",
];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "#": "u", "*": "u" };

// Collapses each run of a repeated letter to one letter.
function collapse(word: string): string {
  return word.replace(/(.)\1+/g, "$1");
}

const PROFANE_KEYS = new Set(PROFANE.map(collapse));

function normaliseWords(value: string): string[] {
  const mapped = value
    .toLowerCase()
    .replace(/[013457@$!#*]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z\s]/g, " ");
  return mapped.split(/\s+/).filter(Boolean).map(collapse);
}

// A character repeated six times ("aaaaaa"), or the same word four times in a row ("buy buy buy buy").
function isRepeated(value: string): boolean {
  if (/(.)\1{5,}/.test(value)) return true;
  const words = value.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
  let run = 1;
  for (let i = 1; i < words.length; i++) {
    run = words[i] === words[i - 1] ? run + 1 : 1;
    if (run >= 4) return true;
  }
  return false;
}

// The first problem found in the text, or null when it is fine.
export function contentProblem(value: string): ContentProblem | null {
  if (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value)) return "CONTACT";
  if (LINK_PATTERN.test(value)) return "LINK";
  if (normaliseWords(value).some((w) => PROFANE_KEYS.has(w))) return "PROFANITY";
  if (isRepeated(value)) return "REPEATED";
  return null;
}
