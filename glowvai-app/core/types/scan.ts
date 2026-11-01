/**
 * AI Skin Diagnostic and Scan Models for GlowVAI V2
 */

export type SkinType = 'OILY' | 'DRY' | 'COMBINATION' | 'NORMAL' | 'SENSITIVE';

export interface SkinMetric {
  name: string;
  score: number; // 0 to 100
  status: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'NEEDS_ATTENTION';
  description: string;
  keyIngredientRecommendation: string;
}

export interface SkinScanReport {
  scanId: string;
  userId: string;
  scannedAt: number;
  overallScore: number; // 0 to 100 (Glow Score)
  skinType: SkinType;
  metrics: {
    hydration: SkinMetric;
    acne: SkinMetric;
    texture: SkinMetric;
    pigmentation: SkinMetric;
    sebum: SkinMetric;
    sensitivity: SkinMetric;
  };
  primaryConcerns: string[];
  recommendedRoutineIds: string[];
  imageUri?: string;
  isInferenceLive?: boolean;
  inferenceError?: string;
  inferenceMethod?: 'cnn_model_v1' | 'calibrated_baseline';
  inferenceMethodName?: string;
}

export interface RoutineProduct {
  id: string;
  stepNumber: number;
  stepName: 'Cleanser' | 'Toner' | 'Targeted Serum' | 'Moisturizer / SPF' | 'Gentle Cleanser' | 'Barrier Moisturizer' | 'Sunscreen Protection';
  brand: string;
  name: string;
  keyIngredients: string[];
  price: number;
  originalPrice: number;
  imageUri?: string;
  rating: number;
  reviewsCount: number;
  isQuickCommerceAvailable: boolean;
  deliveryMinutes: number;
}
