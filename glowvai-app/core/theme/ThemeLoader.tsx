import { useEffect } from 'react';

// Applies the colours and fonts the GlowVai team published (or the draft, for a staff preview link) to the whole shop.
// It only sets the variables the server sends, and keeps the built-in look if the request fails.
const readPreviewToken = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get('preview');
  } catch {
    return null;
  }
};

export function ThemeLoader() {
  useEffect(() => {
    let alive = true;
    const token = readPreviewToken();
    const url = token ? `/api/shop/theme?preview=${encodeURIComponent(token)}` : '/api/shop/theme';
    fetch(url, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data || typeof data.cssVariables !== 'object' || data.cssVariables === null) return;
        const root = document.documentElement;
        for (const [name, value] of Object.entries(data.cssVariables as Record<string, string>)) {
          if (name.startsWith('--') && typeof value === 'string') root.style.setProperty(name, value);
        }
      })
      .catch(() => {
        // The built-in colours and fonts stay in place.
      });
    return () => {
      alive = false;
    };
  }, []);
  return null;
}
