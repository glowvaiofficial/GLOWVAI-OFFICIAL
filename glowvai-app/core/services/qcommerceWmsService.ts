/**
 * Q-Commerce Warehouse Management System (WMS) & Picker Workflow Engine
 * Generates optimal shortest pick paths, barcode verification, and instant inventory sync.
 */

import {
  DarkstoreSKU,
  PickTask,
  PickPathItem,
  ReplenishmentAlert,
} from '../types/qcommerce';

// Mock inventory data mapped to darkstore bins in Vijayawada
const MOCK_DARKSTORE_INVENTORY: Record<string, DarkstoreSKU> = {
  'prod-01': {
    skuId: 'prod-01',
    productName: 'Minimalist 10% Niacinamide Serum (30ml)',
    brand: 'Minimalist',
    category: 'Serum',
    eanBarcode: '8906100010015',
    binLocation: {
      aisle: 'A',
      rack: 1,
      shelf: 2,
      binNumber: 'BIN-A-01-02-01',
      barcode: 'BARCODE-BIN-A010201',
      zone: 'HIGH_VELOCITY',
    },
    currentStock: 48,
    reservedStock: 2,
    availableStock: 46,
    safetyThreshold: 10,
    reorderQuantity: 50,
    costPrice: 380,
    mrp: 599,
    sellingPrice: 569,
    shelfLifeDays: 730,
    expiryDate: '2027-06-30',
  },
  'prod-02': {
    skuId: 'prod-02',
    productName: 'The Derma Co 1% Salicylic Acid Gel Face Wash (100ml)',
    brand: 'The Derma Co',
    category: 'Cleanser',
    eanBarcode: '8906100010022',
    binLocation: {
      aisle: 'B',
      rack: 2,
      shelf: 2,
      binNumber: 'BIN-B-02-02-03',
      barcode: 'BARCODE-BIN-B020203',
      zone: 'HIGH_VELOCITY',
    },
    currentStock: 32,
    reservedStock: 1,
    availableStock: 31,
    safetyThreshold: 8,
    reorderQuantity: 40,
    costPrice: 190,
    mrp: 299,
    sellingPrice: 284,
    shelfLifeDays: 730,
    expiryDate: '2027-08-15',
  },
  'prod-03': {
    skuId: 'prod-03',
    productName: 'Dot & Key Watermelon Cooling Sunscreen SPF 50 (50g)',
    brand: 'Dot & Key',
    category: 'Sunscreen',
    eanBarcode: '8906100010039',
    binLocation: {
      aisle: 'C',
      rack: 1,
      shelf: 3,
      binNumber: 'BIN-C-01-03-02',
      barcode: 'BARCODE-BIN-C010302',
      zone: 'HIGH_VELOCITY',
    },
    currentStock: 64,
    reservedStock: 3,
    availableStock: 61,
    safetyThreshold: 15,
    reorderQuantity: 60,
    costPrice: 280,
    mrp: 445,
    sellingPrice: 422,
    shelfLifeDays: 730,
    expiryDate: '2027-09-01',
  },
};

/**
 * 1. Generates an Optimized Sequential Walking Route through the dark store aisles.
 * Sorts items by Aisle (A -> B -> C), then Rack, then Shelf to prevent backtracking.
 */
export const generateOptimalPickTask = (
  orderId: string,
  darkstoreId: string = 'DS-VIJ-01',
  orderedItems: Array<{ id: string; name: string; quantity: number }>
): PickTask => {
  const pickItems: PickPathItem[] = orderedItems.map((item) => {
    const sku = MOCK_DARKSTORE_INVENTORY[item.id] || {
      skuId: item.id,
      productName: item.name,
      eanBarcode: `89061000100${item.id.slice(-2)}`,
      binLocation: {
        aisle: 'A',
        rack: 1,
        shelf: 2,
        binNumber: `BIN-A-01-02-${item.id.slice(-2)}`,
        barcode: `BARCODE-BIN-A0102${item.id.slice(-2)}`,
        zone: 'HIGH_VELOCITY' as const,
      },
    };

    return {
      skuId: item.id,
      productName: item.name,
      quantityRequired: item.quantity || 1,
      quantityPicked: 0,
      binLocation: sku.binLocation,
      eanBarcode: sku.eanBarcode,
      pickSequenceIndex: 0,
      status: 'PENDING' as const,
    };
  });

  // Sort sequentially: Aisle A -> B -> C, Rack 1 -> 8, Shelf 1 -> 4
  pickItems.sort((a, b) => {
    if (a.binLocation.aisle !== b.binLocation.aisle) {
      return a.binLocation.aisle.localeCompare(b.binLocation.aisle);
    }
    if (a.binLocation.rack !== b.binLocation.rack) {
      return a.binLocation.rack - b.binLocation.rack;
    }
    return a.binLocation.shelf - b.binLocation.shelf;
  });

  // Assign indexed walking path numbers (1, 2, 3...)
  pickItems.forEach((item, index) => {
    item.pickSequenceIndex = index + 1;
  });

  const stagingBay = `BAY-0${Math.floor(Math.random() * 8) + 1}`;

  return {
    pickTaskId: `PICK-${Date.now()}`,
    orderId,
    darkstoreId,
    pickerId: 'PICKER-102',
    pickerName: 'Ramesh Kumar (FastPicker)',
    items: pickItems,
    totalItemCount: pickItems.reduce((acc, it) => acc + it.quantityRequired, 0),
    status: 'ASSIGNED',
    stagingBayNumber: stagingBay,
    stagingQrCode: `STAGE-${orderId}-${stagingBay}`,
    assignedAt: Date.now(),
  };
};

/**
 * 2. Barcode Validation Engine
 * Ensures picker scanned BOTH the bin barcode and physical product barcode.
 */
export const verifyPickerScans = (
  scannedBinBarcode: string,
  scannedProductBarcode: string,
  expectedItem: PickPathItem
): { success: boolean; message: string } => {
  if (scannedBinBarcode !== expectedItem.binLocation.barcode) {
    return {
      success: false,
      message: `Wrong bin! Expected ${expectedItem.binLocation.binNumber}, scanned: ${scannedBinBarcode}`,
    };
  }

  if (scannedProductBarcode !== expectedItem.eanBarcode) {
    return {
      success: false,
      message: `Wrong product! Barcode ${scannedProductBarcode} does not match SKU ${expectedItem.skuId}`,
    };
  }

  return {
    success: true,
    message: `Verified: ${expectedItem.productName} (100% Match)`,
  };
};

/**
 * 3. Real-Time Stock Decrement & Automated Replenishment Trigger
 */
export const executeInventoryDecrement = (
  skuId: string,
  quantity: number
): { availableStock: number; replenishmentTriggered: boolean; alert?: ReplenishmentAlert } => {
  const item = MOCK_DARKSTORE_INVENTORY[skuId];
  if (!item) {
    return { availableStock: 99, replenishmentTriggered: false };
  }

  item.currentStock = Math.max(0, item.currentStock - quantity);
  item.availableStock = Math.max(0, item.currentStock - item.reservedStock);

  if (item.availableStock <= item.safetyThreshold) {
    const alert: ReplenishmentAlert = {
      alertId: `REP-${Date.now()}`,
      darkstoreId: 'DS-VIJ-01',
      skuId,
      productName: item.productName,
      currentAvailable: item.availableStock,
      safetyThreshold: item.safetyThreshold,
      suggestedReorderQuantity: item.reorderQuantity,
      urgency: item.availableStock <= 3 ? 'CRITICAL' : 'HIGH',
      status: 'PENDING_DISPATCH',
      createdAt: Date.now(),
    };
    return { availableStock: item.availableStock, replenishmentTriggered: true, alert };
  }

  return { availableStock: item.availableStock, replenishmentTriggered: false };
};
