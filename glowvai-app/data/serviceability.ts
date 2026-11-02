import { Address } from '../types';

export interface ServiceArea {
  id: string;
  name: string;
  pincode: string;
  quickCommerceAvailable: boolean;
  estimatedMinutes: number;
  deliveryFee: number;
}

export const VIJAYAWADA_AREAS: ServiceArea[] = [
  { id: 'area-1', name: 'Benz Circle', pincode: '520010', quickCommerceAvailable: true, estimatedMinutes: 12, deliveryFee: 0 },
  { id: 'area-2', name: 'MG Road, Labbipet', pincode: '520010', quickCommerceAvailable: true, estimatedMinutes: 15, deliveryFee: 0 },
  { id: 'area-3', name: 'Governorpet', pincode: '520002', quickCommerceAvailable: true, estimatedMinutes: 15, deliveryFee: 0 },
  { id: 'area-4', name: 'Patamata', pincode: '520010', quickCommerceAvailable: true, estimatedMinutes: 18, deliveryFee: 0 },
  { id: 'area-5', name: 'Auto Nagar', pincode: '520007', quickCommerceAvailable: true, estimatedMinutes: 25, deliveryFee: 19 },
  { id: 'area-6', name: 'Bhavanipuram', pincode: '520012', quickCommerceAvailable: true, estimatedMinutes: 22, deliveryFee: 19 },
  { id: 'area-7', name: 'Gannavaram', pincode: '521101', quickCommerceAvailable: false, estimatedMinutes: 120, deliveryFee: 49 },
];

// Shown until the customer saves or picks a delivery address. Empty on purpose: no sample address is ever
// presented as the customer's own, and an empty address is not serviceable, so checkout asks for one.
export const NO_ADDRESS: Address = {
  id: 'addr-none',
  label: 'Home',
  street: '',
  area: '',
  city: '',
  pincode: '',
  serviceable: false,
  deliveryMinutes: 0,
  isDefault: false,
};
