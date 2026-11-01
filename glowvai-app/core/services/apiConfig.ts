/**
 * Universal Backend API Endpoint Resolver for GlowVAI (web build).
 * Ported from the Expo app. Expo/React Native lookups are replaced with Vite env variables.
 */

export const getBackendBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';
};

export const getCloudBackendUrl = (): string => {
  return process.env.NEXT_PUBLIC_RENDER_API_URL || 'https://glowvai-backend-r7u2.onrender.com';
};
