/**
 * Delivery, Service Zone, and Dispatch Types for GlowVAI V2
 */

export type DeliveryPartnerType = 'INTERNAL_RIDER' | 'PORTER' | 'DUNZO' | 'SHADOWFAX' | 'DELHIVERY' | 'BLUEDART' | 'MANUAL';

export interface DeliveryAssignment {
  deliveryPartnerType: DeliveryPartnerType;
  riderName: string;
  riderPhone: string;
  trackingNumber?: string;
  trackingUrl?: string;
  whatsappContactUrl?: string;
  assignedByAdminUid: string;
  assignedAt: number;
  estimatedArrivalMinutes?: number;
  pickupAddress: string;
  dropAddress: string;
}

export interface DeliveryZoneCoordinate {
  latitude: number;
  longitude: number;
}

export interface DeliveryZoneDocument {
  zoneId: string;
  name: string;
  city: 'Vijayawada' | string;
  isActive: boolean;
  polygonCoordinates: DeliveryZoneCoordinate[];
  assignedVendorIds: string[];
  maxQuickCommerceRadiusKm: number;
  estimatedDeliveryTimeMinutes: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  createdAt: number;
  updatedAt: number;
}
