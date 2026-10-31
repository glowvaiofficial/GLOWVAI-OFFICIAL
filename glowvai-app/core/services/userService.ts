/**
 * User & Role Management Service for GlowVAI V2
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  CustomerUserDocument,
  BaseUserDocument,
  UserConsents,
  UserAddress,
} from '../types';

export const USERS_COLLECTION = 'users';
export const ADDRESSES_SUBCOLLECTION = 'addresses';

/**
 * Retrieves the user profile document and resolves their role
 */
export const getUserProfile = async (uid: string): Promise<BaseUserDocument | null> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as BaseUserDocument;
};

/**
 * Initializes a new Customer user profile after Phone Authentication
 */
export const initializeCustomerProfile = async (params: {
  uid: string;
  phoneNumber: string;
  displayName?: string | null;
  email?: string | null;
  consents: UserConsents;
  referredByCode?: string | null;
}): Promise<CustomerUserDocument> => {
  const { uid, phoneNumber, displayName = null, email = null, consents, referredByCode = null } = params;
  
  // Generate a random 6-character referral code
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const referralCode = `GLOW-${randomSuffix}`;

  const now = Date.now();
  const newProfile: CustomerUserDocument = {
    uid,
    phoneNumber,
    role: 'customer',
    displayName,
    email,
    isStudentVerified: false,
    referralCode,
    referredByCode,
    referralCoinBalance: 0,
    consents,
    createdAt: now,
    updatedAt: now,
  };

  const userRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(userRef, newProfile);
  return newProfile;
};

/**
 * Updates user consents (e.g. Terms, Camera Privacy, Medical Disclaimer)
 */
export const updateUserConsents = async (uid: string, consents: Partial<UserConsents>): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    consents,
    updatedAt: Date.now(),
  });
};

/**
 * Adds or updates a user delivery address
 */
export const saveUserAddress = async (uid: string, address: UserAddress): Promise<void> => {
  const addressRef = doc(db, USERS_COLLECTION, uid, ADDRESSES_SUBCOLLECTION, address.addressId);
  await setDoc(addressRef, address);
};

/**
 * Fetches all saved addresses for a user
 */
export const getUserAddresses = async (uid: string): Promise<UserAddress[]> => {
  const addressQuery = query(collection(db, USERS_COLLECTION, uid, ADDRESSES_SUBCOLLECTION));
  const snapshot = await getDocs(addressQuery);
  return snapshot.docs.map(d => d.data() as UserAddress);
};
