// Text for the cart count on the home top bar. Zero hides the badge; counts above 99 show as 99+.
export function cartBadgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? '99+' : String(Math.floor(count));
}
