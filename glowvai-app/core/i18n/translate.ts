// Pure lookup for the message catalogue. No React and no browser APIs, so the node tests use it directly.
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/lib/shop/settings/rules";
import { en, messagesByLanguage, type MessageKey } from "./messages";

// The text for one key in one language. A key the language does not have, or an unknown language, shows English.
// Placeholders are filled with plain text. The result is a string for React to render as text: never HTML.
export function translate(language: string, key: MessageKey, vars: Record<string, string> = {}): string {
  const lang = (language in messagesByLanguage ? language : DEFAULT_LANGUAGE) as LanguageCode;
  const template = messagesByLanguage[lang][key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match));
}
