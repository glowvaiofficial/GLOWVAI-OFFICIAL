/**
 * Reads the signed-in Firebase user.
 *
 * Phone sign-in is not offered: there is no SMS provider yet, and no code is accepted on the device. The shop keeps
 * an anonymous session per device (core/services/customerSession.ts) and the customer's details on the server.
 */

import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Returns current authenticated user synchronously
 */
export const getCurrentUser = (): FirebaseUser | null => {
  try {
    return auth ? auth.currentUser : null;
  } catch {
    return null;
  }
};
