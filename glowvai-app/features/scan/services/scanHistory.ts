/**
 * Latest skin scan result, kept in browser storage so the scan tab can offer
 * "View latest skin report". Stored per browser only (the USER app used the
 * same key).
 */

import { storage } from '../../../core/utils/storage';
import type { SkinAnalysisResult } from '../../../core/services/skinModelService';

const HISTORY_KEY = '@glowvai_scan_history';

export async function saveScanResult(result: SkinAnalysisResult): Promise<void> {
  await storage.setItem(HISTORY_KEY, JSON.stringify({ savedAt: Date.now(), result }));
}

export async function loadLatestScanResult(): Promise<SkinAnalysisResult | null> {
  const raw = await storage.getItem(HISTORY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { result?: SkinAnalysisResult };
    const result = parsed.result;
    return result && result.skinProfile && Array.isArray(result.concerns) ? result : null;
  } catch {
    return null;
  }
}

/** Latest result plus when it was saved, for the scan tab summary. */
export async function loadLatestScanEntry(): Promise<{ savedAt: number | null; result: SkinAnalysisResult } | null> {
  const raw = await storage.getItem(HISTORY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { savedAt?: number; result?: SkinAnalysisResult };
    const result = parsed.result;
    if (!result || !result.skinProfile || !Array.isArray(result.concerns)) return null;
    return { savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : null, result };
  } catch {
    return null;
  }
}
