/**
 * Key-value storage for the web build. Backed by localStorage; every call is safe when storage is unavailable.
 */

const hasStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return hasStorage() ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (hasStorage()) window.localStorage.setItem(key, value);
    } catch {
      // storage full or blocked
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (hasStorage()) window.localStorage.removeItem(key);
    } catch {
      // storage blocked
    }
  },
};
