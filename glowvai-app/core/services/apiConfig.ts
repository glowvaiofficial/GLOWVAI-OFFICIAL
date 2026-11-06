/**
 * Base URLs of the skin-scan backend (the CNN /predict server).
 *
 * Production builds never fall back to localhost: the shop's production CSP does not allow it (next.config.js).
 */

// An extra backend tried before the hosted one. In development it defaults to a local server; in production it is
// used only when NEXT_PUBLIC_BACKEND_API_URL is set.
export const getBackendBaseUrl = (): string | null => {
  if (process.env.NEXT_PUBLIC_BACKEND_API_URL) return process.env.NEXT_PUBLIC_BACKEND_API_URL;
  return process.env.NODE_ENV === 'production' ? null : 'http://localhost:4000';
};

// The hosted backend, allowed by the shop's CSP.
export const getCloudBackendUrl = (): string => {
  return process.env.NEXT_PUBLIC_RENDER_API_URL || 'https://glowvai-backend-r7u2.onrender.com';
};
