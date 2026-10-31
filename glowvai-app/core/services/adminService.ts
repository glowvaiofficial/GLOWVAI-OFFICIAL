/**
 * Admin Service & Operations Management for GlowVAI V2
 * 
 * Manages:
 * 1. Vendor Application Reviews (Approve/Reject)
 * 2. Delivery Assignment with WhatsApp coordination
 * 3. System Catalogue & Order Overrides
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
  VendorApplicationDocument,
  VendorApplicationStatus,
  DeliveryAssignment,
  DeliveryPartnerType,
  OrderDocument,
  OrderStatus,
} from '../types';
import { VENDORS_COLLECTION, VENDOR_APPLICATIONS_COLLECTION, ORDERS_COLLECTION } from './vendorService';
import { USERS_COLLECTION } from './userService';
import { createWhatsAppOrderLink } from '../utils/whatsapp';

/**
 * 1. Fetch all pending vendor applications
 */
export const getPendingVendorApplications = async (): Promise<VendorApplicationDocument[]> => {
  const q = query(
    collection(db, VENDOR_APPLICATIONS_COLLECTION),
    where('status', '==', 'PENDING_APPROVAL'),
    orderBy('submittedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as VendorApplicationDocument);
};

/**
 * 2. Approve a Vendor Application & Activate Vendor Store
 */
export const approveVendorApplication = async (
  applicationId: string,
  adminUid: string
): Promise<VendorDocument> => {
  const appRef = doc(db, VENDOR_APPLICATIONS_COLLECTION, applicationId);
  const appSnap = await getDoc(appRef);

  if (!appSnap.exists()) {
    throw new Error(`Application ${applicationId} not found.`);
  }

  const appData = appSnap.data();
  const applicantUid: string = appData.applicantUid;
  const now = Date.now();

  const vendorProfile: VendorDocument = {
    uid: applicantUid,
    vendorId: applicantUid,
    role: 'vendor',
    displayName: appData.ownerName,
    email: appData.email,
    phoneNumber: appData.contactNumber,
    storeName: appData.storeName,
    ownerName: appData.ownerName,
    contactNumber: appData.contactNumber,
    businessRegistrationNumber: appData.businessRegistrationNumber,
    drugLicenseNumber: appData.drugLicenseNumber,
    gstNumber: appData.gstNumber,
    address: {
      street: appData.streetAddress,
      city: appData.city,
      state: appData.state,
      pincode: appData.pincode,
      coordinates: appData.coordinates,
    },
    serviceZoneIds: appData.serviceZoneIds || [],
    operatingHours: appData.operatingHours,
    applicationStatus: 'APPROVED' as VendorApplicationStatus,
    approvedByAdminUid: adminUid,
    approvedAt: now,
    isActive: true,
    averageFulfillmentTimeMinutes: 30,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Write vendor document
  const vendorRef = doc(db, VENDORS_COLLECTION, applicantUid);
  await setDoc(vendorRef, vendorProfile);

  // 2. Update user profile role to 'vendor'
  const userRef = doc(db, USERS_COLLECTION, applicantUid);
  await updateDoc(userRef, {
    role: 'vendor',
    updatedAt: now,
  });

  // 3. Update application status
  await updateDoc(appRef, {
    status: 'APPROVED',
    approvedByAdminUid: adminUid,
    approvedAt: now,
    updatedAt: now,
  });

  return vendorProfile;
};

/**
 * 3. Reject a Vendor Application
 */
export const rejectVendorApplication = async (
  applicationId: string,
  adminUid: string,
  rejectionReason: string
): Promise<void> => {
  const appRef = doc(db, VENDOR_APPLICATIONS_COLLECTION, applicationId);
  const now = Date.now();

  await updateDoc(appRef, {
    status: 'REJECTED',
    rejectionReason,
    reviewedByAdminUid: adminUid,
    updatedAt: now,
  });
};

/**
 * 4. Admin Delivery Assignment & WhatsApp Link Generation
 */
export interface AssignDeliveryParams {
  orderId: string;
  adminUid: string;
  deliveryPartnerType: DeliveryPartnerType;
  riderName: string;
  riderPhone: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedArrivalMinutes?: number;
  pickupAddress: string;
  dropAddress: string;
}

export const assignDeliveryToOrder = async (
  params: AssignDeliveryParams
): Promise<DeliveryAssignment> => {
  const {
    orderId,
    adminUid,
    deliveryPartnerType,
    riderName,
    riderPhone,
    trackingNumber,
    trackingUrl,
    estimatedArrivalMinutes = 45,
    pickupAddress,
    dropAddress,
  } = params;

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    throw new Error(`Order ${orderId} does not exist.`);
  }

  const orderData = orderSnap.data() as OrderDocument;
  const now = Date.now();

  // Generate WhatsApp dispatch link for quick coordination with the rider
  const whatsappContactUrl = createWhatsAppOrderLink(
    riderPhone,
    `Order #${orderId} for ${orderData.customerName}. Pickup: ${pickupAddress} | Drop: ${dropAddress}`
  );

  const assignment: DeliveryAssignment = {
    deliveryPartnerType,
    riderName,
    riderPhone,
    trackingNumber,
    trackingUrl,
    whatsappContactUrl,
    assignedByAdminUid: adminUid,
    assignedAt: now,
    estimatedArrivalMinutes,
    pickupAddress,
    dropAddress,
  };

  await updateDoc(orderRef, {
    deliveryAssignment: assignment,
    status: 'OUT_FOR_DELIVERY' as OrderStatus,
    updatedAt: now,
  });

  return assignment;
};
