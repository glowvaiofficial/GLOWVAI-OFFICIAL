/** Reads a user-facing message from an unknown thrown value. */
export const errorMessageOf = (err: unknown, fallback: string): string =>
  (err as { message?: string } | null)?.message || fallback;

/** Web equivalents of the native permission prompts used during onboarding. */

// Triggers the browser location prompt. Resolves false when unsupported or denied.
export const requestLocationPermission = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });

// Triggers the browser camera prompt, then releases the stream. Resolves false when unavailable or denied.
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
};
