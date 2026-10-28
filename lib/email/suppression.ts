import { storage } from "@/lib/storage";

/**
 * GLOW VAI Email Suppression Service.
 * Tracks bounced, complained, and unsubscribed email addresses.
 * Skipped silently before sending any outbound email.
 */

const localSuppressions = new Set<string>();

export async function isSuppressed(email: string, stream: "transactional" | "marketing" = "transactional"): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();

  if (localSuppressions.has(cleanEmail)) {
    return true;
  }

  try {
    // Query Google Sheets Suppressions tab via storage adapter if configured
    const res = await storage.callSheet({
      tab: "Suppressions",
      action: "check",
      data: { email: cleanEmail, stream },
    });

    if (res && res.suppressed === true) {
      localSuppressions.add(cleanEmail);
      return true;
    }
  } catch {
    // Fail-open: do not block send if check fails
  }

  return false;
}

export async function addSuppression(email: string, reason: "bounced" | "complained" | "unsubscribed", source: string = "system"): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  localSuppressions.add(cleanEmail);

  try {
    await storage.callSheet({
      tab: "Suppressions",
      action: "create",
      data: {
        created_at: new Date().toISOString(),
        email: cleanEmail,
        reason,
        source,
      },
    });
  } catch (err) {
    console.error("Failed to store suppression record:", err);
  }
}
