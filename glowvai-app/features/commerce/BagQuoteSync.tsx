import { useApp } from '../../context/useApp';
import { useBagQuoteSync } from './lib/bagQuote';

// Mounted once at the app root. Keeps the bag's offers and discount up to date, from any screen.
export function BagQuoteSync() {
  const { showToast } = useApp();
  useBagQuoteSync((message) => showToast(message));
  return null;
}
