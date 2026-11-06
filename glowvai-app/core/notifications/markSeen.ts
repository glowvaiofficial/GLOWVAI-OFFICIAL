// Marks an order as seen on this device for the signed-in customer, using the same record the notifier reads.
import { auth } from '../config/firebase';
import { withOrderMarked } from './orderEvents';
import { readSeen, writeSeen } from './seenStorage';

// Does nothing when no customer session exists yet.
export function markOrderSeen(orderId: string, status: string): void {
  const uid = auth?.currentUser?.uid;
  if (!uid || !orderId) return;
  writeSeen(uid, withOrderMarked(readSeen(uid), orderId, status, Date.now()));
}
