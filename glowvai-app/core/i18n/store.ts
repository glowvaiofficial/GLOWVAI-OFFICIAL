// The shop's language: the account value (users/{uid}.language) when signed in, otherwise the choice kept on this device.
// Default is English. Storage is optional: when the browser blocks it, the choice lasts for this page view only.
import { create } from 'zustand';
import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from '@/lib/shop/settings/rules';
import { translate } from './translate';
import type { MessageKey } from './messages';

const DEVICE_KEY = 'glowvai:language';

function readDevice(): LanguageCode {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DEVICE_KEY) : null;
    return isLanguageCode(raw) ? raw : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function writeDevice(language: LanguageCode) {
  try {
    window.localStorage.setItem(DEVICE_KEY, language);
  } catch {
    // Storage blocked: nothing to do, the in-memory choice still applies.
  }
}

interface LanguageState {
  language: LanguageCode;
  // Sets the language for the page and the device. Callers validate the code (isLanguageCode) before calling.
  setLanguage: (language: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>()((set) => ({
  language: readDevice(),
  setLanguage: (language) => {
    writeDevice(language);
    if (typeof document !== 'undefined') document.documentElement.lang = language;
    set({ language });
  },
}));

// Components call this to get a translator that re-renders when the language changes.
export function useT() {
  const language = useLanguageStore((s) => s.language);
  return (key: MessageKey, vars?: Record<string, string>) => translate(language, key, vars);
}
