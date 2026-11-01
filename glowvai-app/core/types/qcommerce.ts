/**
 * GlowVAI Q-Commerce Production Architecture
 * Data contracts for WMS, Bin-Level Mapping, Sequential Pick Paths,
 * Multi-Variable ETA Engine, and Dynamic Pricing.
 */

// ==============================================================================
// 1. INVENTORY & DARK STORE MANAGEMENT (WMS)
// ==============================================================================

export interface BinLocation {
  aisle: string;        // e.g. "A" (Serums), "B" (Sunscreens), "C" (Cleansers)
  rack: number;         // 1 to 8
  shelf: number;        // 1 to 4 (Eye-level 2/3 for highest rotation items)
  binNumber: string;    // "BIN-A-02-03-01"
  barcode: string;      // "BARCODE-BIN-A020301"
  zone: 'HIGH_VELOCITY' | 'MEDIUM_VELOCITY' | 'COLD_STORAGE' | 'HAZARDOUS';
}

export interface DarkstoreSKU {
  skuId: string;
  productName: string;
  brand: string;
  category: string;
  eanBarcode: string;           // 13-digit physical product barcode
  binLocation: BinLocation;
  currentStock: number;
  reservedStock: number;        // Items currently inside active picker carts
  availableStock: number;       // currentStock - reservedStock
  safetyThreshold: number;      // Trigger automated replenishment when <= threshold
  reorderQuantity: number;      // Units to auto-order from central hub
  costPrice: number;
  mrp: number;
  sellingPrice: number;
  shelfLifeDays: number;
  expiryDate: string;           // YYYY-MM-DD
}

export interface ReplenishmentAlert {
  alertId: string;
  darkstoreId: string;
  skuId: string;
  productName: string;
  currentAvailable: number;
  safetyThreshold: number;
  suggestedReorderQuantity: number;
  urgency: 'HIGH' | 'MEDIUM' | 'CRITICAL';
  status: 'PENDING_DISPATCH' | 'IN_TRANSIT' | 'RECEIVED';
  createdAt: number;
}

// ==============================================================================
// 2. ORDER PROCESSING & PICKER WORKFLOW (90-120 SECONDS SLA)
// ==============================================================================

export interface PickPathItem {
  skuId: string;
  productName: string;
  quantityRequired: number;
  quantityPicked: number;
  binLocation: BinLocation;
  eanBarcode: string;
  pickSequenceIndex: number;    // Ordered by shortest walking path
  status: 'PENDING' | 'SCANNED_VERIFIED' | 'OUT_OF_STOCK_SUBSTITUTE';
  scannedBarcodeTimestamp?: number;
}

export interface PickTask {
  pickTaskId: string;
  orderId: string;
  darkstoreId: string;
  pickerId: string;
  pickerName: string;
  items: PickPathItem[];
  totalItemCount: number;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'PACKED_STAGED' | 'FAILED';
  stagingBayNumber: string;     // e.g. "BAY-04"
  stagingQrCode: string;        // "STAGE-ORD-17880-BAY04"
  assignedAt: number;
  startedAt?: number;
  completedAt?: number;
  durationSeconds?: number;     // Target <= 120s
}

// ==============================================================================
// 3. DELIVERY ROUTING & DISPATCH LOGISTICS
// ==============================================================================

export interface RiderTelemetryState {
  riderId: string;
  riderName: string;
  phoneNumber: string;
  vehicleType: 'EV_SCOOTER' | 'MOTORCYCLE' | 'CYCLE';
  vehicleNumber: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  headingDegrees: number;
  batteryPercentage?: number;
  status: 'WAITING_AT_BAY' | 'STAGED_PICKUP' | 'IN_TRANSIT_TO_HOME' | 'DOORSTEP_HANDOVER' | 'OFFLINE';
  lastPingTimestamp: number;
}

export interface DispatchAssignment {
  dispatchId: string;
  orderId: string;
  darkstoreId: string;
  rider: RiderTelemetryState;
  stagingBay: string;
  pickupOtp: string;            // Rider scans to unlock bag
  deliveryOtp: string;          // Customer provides at door
  status: 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  assignedAt: number;
  pickedUpAt?: number;
  deliveredAt?: number;
}

// ==============================================================================
// 4. MULTI-VARIABLE ETA PREDICTION ENGINE
// ==============================================================================

export interface ETAVariables {
  darkstoreCongestionIndex: number; // 1.0 (empty) to 2.5 (severe bottleneck)
  pickerQueueTimeSec: number;        // e.g. 30s
  pickingPackingTimeSec: number;     // e.g. 110s
  stagingHandoverSec: number;        // e.g. 40s
  transitDriveTimeSec: number;       // e.g. 420s (7 mins based on live traffic)
  doorstepDeliveryBufferSec: number; // e.g. 60s
  totalEstimatedSeconds: number;     // Sum of all stages
  totalEstimatedMinutes: number;     // Display badge value (e.g. 11)
  slaTargetSeconds: number;          // 600s (10 min) or 720s (12 min)
  slaHealth: 'ON_TRACK' | 'AT_RISK' | 'DELAYED_NOTIFIED';
}

// ==============================================================================
// 5. DEMAND FORECASTING & DYNAMIC PRICING ENGINE
// ==============================================================================

export interface DemandSurgeRule {
  neighborhoodId: string;
  activeOrdersInGrid: number;
  availableRidersInGrid: number;
  surgeMultiplier: number;           // 1.0x to 1.4x
  weatherCondition: 'CLEAR' | 'RAIN' | 'HEATWAVE' | 'NIGHT_HOURS';
  lateNightFee: number;              // ₹0 or ₹15 after 11 PM
  deliveryFee: number;               // Dynamic: ₹0 if cart >= ₹199, else ₹30
  handlingFee: number;               // ₹0 (Transparent pricing)
}
