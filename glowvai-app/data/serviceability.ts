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

export const INITIAL_USER_ADDRESS: Address = {
  id: 'addr-default-1',
  label: 'Home',
  street: 'Flat 402, Sri Krishna Heights, Near Sweet Magic',
  landmark: 'Opposite Sub-Collector Office',
  area: 'Benz Circle',
  city: 'Vijayawada',
  pincode: '520010',
  serviceable: true,
  deliveryMinutes: 12,
  isDefault: true,
  deliveryInstructions: 'Leave with security guard if not answering bell.',
};

export const SAMPLE_SAVED_ADDRESSES: Address[] = [
  INITIAL_USER_ADDRESS,
  {
    id: 'addr-work-2',
    label: 'Work',
    street: 'Floor 3, Tech Valley Towers, MG Road',
    landmark: 'Beside Trendset Mall',
    area: 'MG Road, Labbipet',
    city: 'Vijayawada',
    pincode: '520010',
    serviceable: true,
    deliveryMinutes: 15,
    isDefault: false,
    deliveryInstructions: 'Reception desk delivery',
  },
];
