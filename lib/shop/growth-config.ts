// Growth programme rules (referrals, GlowVai coins, subscribe and save). Plain data: change a number here, not in the
// routes. Money and points are never taken from the browser; these values are applied on the server only.

export const GROWTH_CONFIG = {
  referral: {
    // 8 characters from an alphabet without 0, O, 1, I and L, so a code read aloud or typed from a screen is unambiguous.
    codeLength: 8,
    codeAlphabet: "ABCDEFGHJKMNPQRSTUVWXYZ23456789",
    // Reward rule: granted once per referee, when the referee's FIRST order reaches DELIVERED.
    rewardTrigger: "FIRST_ORDER_DELIVERED" as const,
    referrerCoins: 50,
    refereeCoins: 50,
    // Apply limits: a customer may try a code 3 times a day; an address may try 10 times a day (brute-force guard).
    applyPerUserPerDay: 3,
    applyPerIpPerDay: 10,
    // Attempts to find an unused code when a customer's code is first generated.
    maxCodeAttempts: 5,
  },
  coins: {
    // One coin is worth one rupee at checkout.
    rupeesPerCoin: 1,
    // At most this share of the item total (before delivery, tip and coupon) may be paid with coins.
    maxRedeemPercentOfItemTotal: 20,
    // Coins never expire unless the owner sets a number of days. null means no expiry.
    expiryDays: null as number | null,
    redeemPreviewPerUserPerHour: 20,
    historyLimit: 50,
  },
  subscriptions: {
    intervalsWeeks: [2, 4, 8] as readonly number[],
    quantityMin: 1,
    quantityMax: 5,
    maxActivePerUser: 10,
    writesPerUserPerHour: 20,
    // Orders the daily cron creates at most, per run. Due subscriptions beyond this wait for the next day.
    maxPerRun: 50,
    // A skipped subscription (out of stock, product unpublished) is retried this many hours later.
    skipRetryHours: 24,
    // A run that stops midway keeps its lock for this long, then a later run may continue it.
    runLockMinutes: 10,
  },
} as const;
