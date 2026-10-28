/**
 * GLOW VAI Per-Recipient Email Rate Limiter.
 * Max 3 emails per recipient per hour.
 * Max 10 emails per recipient per day.
 */

interface RecipientHistory {
  hourlyTimestamps: number[];
  dailyTimestamps: number[];
}

const recipientLimits = new Map<string, RecipientHistory>();

export function checkRecipientRateLimit(email: string): { allowed: boolean; reason?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  const oneHourAgo = now - 3600 * 1000;
  const oneDayAgo = now - 24 * 3600 * 1000;

  const history = recipientLimits.get(cleanEmail) || { hourlyTimestamps: [], dailyTimestamps: [] };

  // Filter timestamps within windows
  history.hourlyTimestamps = history.hourlyTimestamps.filter((t) => t > oneHourAgo);
  history.dailyTimestamps = history.dailyTimestamps.filter((t) => t > oneDayAgo);

  if (history.hourlyTimestamps.length >= 3) {
    return { allowed: false, reason: "Hourly rate limit exceeded (max 3 per hour)" };
  }

  if (history.dailyTimestamps.length >= 10) {
    return { allowed: false, reason: "Daily rate limit exceeded (max 10 per day)" };
  }

  return { allowed: true };
}

export function recordEmailSent(email: string): void {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  const history = recipientLimits.get(cleanEmail) || { hourlyTimestamps: [], dailyTimestamps: [] };
  history.hourlyTimestamps.push(now);
  history.dailyTimestamps.push(now);
  recipientLimits.set(cleanEmail, history);
}
