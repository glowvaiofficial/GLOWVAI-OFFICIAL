// Applies a friend's referral code from a share link (glowvai.in/shop?ref=CODE) once the customer signs in with a phone
// account. The website's ReferralCapture keeps the code on the device until then; this also reads the current address,
// so a customer who opens the link while already signed in gets it too. The rules are in lib/shop/growth/pendingReferral.ts.
import { applyReferralCode } from '../../core/services/shopApi';
import {
  applyOutcome,
  clearPendingReferral,
  readPendingReferral,
  referralCodeFromLink,
  savePendingReferral,
  type ApplyOutcome,
} from '../../../lib/shop/growth/pendingReferral';

let inFlight: Promise<ApplyOutcome | 'none'> | null = null;

function deviceStore(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

// Sends the stored code once. 'none' when there is nothing to apply. A refused code is dropped; a failed call keeps it
// for the next sign-in. Concurrent callers share one request.
export function applyPendingReferral(): Promise<ApplyOutcome | 'none'> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const store = deviceStore();
    if (!store) return 'none' as const;
    try {
      const fromUrl = referralCodeFromLink(new URLSearchParams(window.location.search).get('ref'));
      if (fromUrl) savePendingReferral(store, fromUrl, Date.now());
    } catch {
      // No readable address: only a stored code is used.
    }
    const pending = readPendingReferral(store, Date.now());
    if (!pending) return 'none' as const;
    const outcome = applyOutcome(await applyReferralCode(pending.code));
    if (outcome !== 'retry') clearPendingReferral(store, pending.code);
    return outcome;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
