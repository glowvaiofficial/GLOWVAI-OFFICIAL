// GlowVai Coins wallet rules (top-ups). Plain data: change a number here, not in the routes. Everything else (the
// routes, the screen text, the admin read model) reads these values.
//
// THE RATE IS ONE LINE: change COINS_PER_RUPEE to change how many coins a rupee buys. Launch rate is 1 coin per rupee.
// It is separate from GROWTH_CONFIG.coins.rupeesPerCoin, which is the checkout discount per coin. The two must multiply
// to 1 (a coin bought for N rupees must not be worth more than N rupees at checkout); a test enforces this.
//
// Owner decisions behind these numbers (see the report that added this file): 1 coin = Rs 1 at launch; top-ups of
// Rs 100 to Rs 10,000 per payment; a wallet never holds more than 50,000 coins; Rs 20,000 of top-ups per customer per day.
// Stored value in India is regulated (RBI payment instruments rules). These limits are not a compliance opinion.

export const COINS_PER_RUPEE = 1;
export const MIN_TOPUP_RUPEES = 100;
export const MAX_TOPUP_RUPEES = 10_000;
export const MAX_BALANCE_COINS = 50_000;
export const DAILY_TOPUP_CAP_RUPEES = 20_000;
// Quick amounts offered on the wallet screen. Each must sit inside the min and max above.
export const TOPUP_PRESETS_RUPEES: readonly number[] = [100, 250, 500, 1000];
// A top-up left unpaid for this long is EXPIRED (read-time check). A payment that Razorpay captures later still credits.
export const TOPUP_EXPIRY_MINUTES = 30;
// Rate limits (per customer and per IP). The limiter is per server instance, as for the other shop routes.
export const TOPUP_LIMITS = {
  createPerCustomerPerHour: 5,
  createPerIpPerHour: 20,
  verifyPerCustomerPerHour: 30,
  verifyPerIpPerHour: 60,
  failPerCustomerPerHour: 30,
  historyPerMinute: 60,
  statusPerMinute: 60,
} as const;
export const WALLET_PAGE_SIZE = 20;
