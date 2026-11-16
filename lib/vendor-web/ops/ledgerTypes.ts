// Shape of GET /api/vendor/payouts as the portal receives it.
export interface LedgerResult {
  summary: {
    deliveredOrders: number;
    gross: number;
    commissionPercent: number | null;
    commission: number | null;
    netEarnings: number | null;
    settled: number;
    pending: number;
    balanceDue: number | null;
  };
  recentOrders: { orderId: string; deliveredAt: number; gross: number; commission: number | null; net: number | null }[];
  settlements: { id: string; period: string; gross: number; commission: number; netPayout: number; status: "PENDING" | "ON_HOLD" | "RELEASED" }[];
  bounds: { orderLimit: number; settlementLimit: number; truncated: boolean };
}
