/**
 * Haptic feedback for the web build. Uses the Vibration API where the browser supports it, otherwise does nothing.
 */

export const safeHapticImpact = (duration: number = 10) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(duration);
  } catch {
    // unsupported browser
  }
};

export const safeHapticSelection = () => safeHapticImpact(5);
