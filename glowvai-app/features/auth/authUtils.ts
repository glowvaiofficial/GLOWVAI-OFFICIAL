// Onboarding answers kept on this device only (name, age range, gender).
export const PROFILE_ANSWERS_KEY = 'glowvai_profile_answers';

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

