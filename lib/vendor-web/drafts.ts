// Onboarding drafts kept in this browser, one per signed-in uid. Browser storage can be blocked or full, so every access
// is wrapped: a failure just means no draft is kept. Drafts never hold the full PAN or account number (the form never keeps them).

export const DRAFT_PREFIX = "glowvai.vendor.onboarding.v1.";

const keyFor = (uid: string) => `${DRAFT_PREFIX}${uid}`;

export function loadDraft<T>(uid: string): T | null {
  try {
    if (typeof window === "undefined" || !uid) return null;
    const raw = window.localStorage.getItem(keyFor(uid));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(uid: string, draft: unknown): void {
  try {
    if (typeof window === "undefined" || !uid) return;
    window.localStorage.setItem(keyFor(uid), JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the form still works, it just cannot keep a draft.
  }
}

export function clearDraft(uid: string): void {
  try {
    if (typeof window === "undefined" || !uid) return;
    window.localStorage.removeItem(keyFor(uid));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

/** Removes every vendor draft in this browser (used on sign-out). */
export function clearAllDrafts(): void {
  try {
    if (typeof window === "undefined") return;
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(DRAFT_PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Storage unavailable: nothing was kept.
  }
}
