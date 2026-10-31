/**
 * Vendor Workflow & Repository Service for GlowVAI V2
 * 
 * Manages:
 * 1. Vendor Application Onboarding (Pending Review)
 * 2. Store & Inventory Management
 * 3. Order Processing (Accept, Reject, Pack)
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  VendorDocument,
  VendorApplicationInput,
  VendorInventoryItem,
  OrderDocument,
  OrderStatus,
  VendorOrderStatus,
} from '../types';

export const VENDORS_COLLECTION = 'vendors';
export const VENDOR_APPLICATIONS_COLLECTION = 'vendorApplications';
export const VENDOR_INVENTORY_COLLECTION = 'vendorInventory';
export const ORDERS_COLLECTION = 'orders';

/**
 * 1. Submit a new vendor onboarding application
 */
export const submitVendorApplication = async (
  uid: string,
  input: VendorApplicationInput
): Promise<string> => {
  const applicationId = `VAPP-${uid}`;
  const applicationRef = doc(db, VENDOR_APPLICATIONS_COLLECTION, applicationId);
  
  const now = Date.now();
  const applicationData = {
    applicationId,
    applicantUid: uid,
    ...input,
    status: 'PENDING_APPROVAL',
    submittedAt: now,
    updatedAt: now,
  };

  await setDoc(applicationRef, applicationData);
  return applicationId;
};

/**
 * 2. Get vendor profile by vendor ID (or user UID)
 */
export const getVendorProfile = async (vendorId: string): Promise<VendorDocument | null> => {
  const vendorRef = doc(db, VENDORS_COLLECTION, vendorId);
  const snapshot = await getDoc(vendorRef);
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data() as VendorDocument;
};

/**
 * 3. Fetch orders assigned to this vendor
 */
export const getVendorOrders = async (
  vendorId: string,
  statusFilter?: OrderStatus
): Promise<OrderDocument[]> => {
  let q = query(
    collection(db, ORDERS_COLLECTION),
    where('vendorId', '==', vendorId),
    orderBy('createdAt', 'desc')
  );

  if (statusFilter) {
    q = query(
      collection(db, ORDERS_COLLECTION),
      where('vendorId', '==', vendorId),
      where('status', '==', statusFilter),
      orderBy('createdAt', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as OrderDocument);
};

/**
 * 4. Vendor Workflow: Accept Order
 */
export const vendorAcceptOrder = async (
  orderId: string,
  vendorId: string
): Promise<void> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const snapshot = await getDoc(orderRef);

  if (!snapshot.exists()) {
    throw new Error(`Order ${orderId} does not exist.`);
  }

  const orderData = snapshot.data() as OrderDocument;
  if (orderData.vendorId !== vendorId) {
    throw new Error('Unauthorized: Order is not assigned to this vendor.');
  }

  if (orderData.status !== 'PLACED' && orderData.status !== 'VENDOR_PENDING') {
    throw new Error(`Cannot accept order in current state: ${orderData.status}`);
  }

  const now = Date.now();
  await updateDoc(orderRef, {
    status: 'VENDOR_ACCEPTED' as OrderStatus,
    vendorStatus: 'ACCEPTED' as VendorOrderStatus,
    vendorAcceptedAt: now,
    updatedAt: now,
  });
};

/**
 * 5. Vendor Workflow: Reject Order
 */
export const vendorRejectOrder = async (
  orderId: string,
  vendorId: string,
  rejectionReason: string
): Promise<void> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const snapshot = await getDoc(orderRef);

  if (!snapshot.exists()) {
    throw new Error(`Order ${orderId} does not exist.`);
  }

  const orderData = snapshot.data() as OrderDocument;
  if (orderData.vendorId !== vendorId) {
    throw new Error('Unauthorized: Order is not assigned to this vendor.');
  }

  const now = Date.now();
  await updateDoc(orderRef, {
    status: 'VENDOR_REJECTED' as OrderStatus,
    vendorStatus: 'REJECTED' as VendorOrderStatus,
    vendorRejectionReason: rejectionReason,
    updatedAt: now,
  });
};

/**
 * 6. Vendor Workflow: Mark Order as Packed
 */
export const vendorMarkOrderPacked = async (
  orderId: string,
  vendorId: string
): Promise<void> => {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const snapshot = await getDoc(orderRef);

  if (!snapshot.exists()) {
    throw new Error(`Order ${orderId} does not exist.`);
  }

  const orderData = snapshot.data() as OrderDocument;
  if (orderData.vendorId !== vendorId) {
    throw new Error('Unauthorized: Order is not assigned to this vendor.');
  }

  if (orderData.vendorStatus !== 'ACCEPTED') {
    throw new Error('Order must be accepted before it can be marked as packed.');
  }

  const now = Date.now();
  await updateDoc(orderRef, {
    status: 'PACKED' as OrderStatus,
    vendorStatus: 'PACKED' as VendorOrderStatus,
    vendorPackedAt: now,
    updatedAt: now,
  });
};

/**
 * 7. Update Vendor Product Stock Level
 */
export const updateVendorProductStock = async (
  vendorId: string,
  productId: string,
  stock: number,
  isAvailable: boolean,
  unitPriceOverride?: number
): Promise<void> => {
  const inventoryDocRef = doc(db, VENDORS_COLLECTION, vendorId, VENDOR_INVENTORY_COLLECTION, productId);
  const inventoryItem: VendorInventoryItem = {
    productId,
    stock,
    isAvailable,
    unitPriceOverride,
    lastRestockedAt: Date.now(),
  };

  await setDoc(inventoryDocRef, inventoryItem, { merge: true });
};
