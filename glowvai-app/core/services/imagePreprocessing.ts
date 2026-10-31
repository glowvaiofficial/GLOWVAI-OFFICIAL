/**
 * GlowVAI — Image Preprocessing (web build)
 * ==========================================
 * Browser-canvas version of the Phase 6 preprocessing bridge.
 *
 * Pipeline:
 *   captured File / Blob (camera or gallery)
 *     → decode with createImageBitmap
 *     → crop to face bounds and resize to 224×224 on a canvas
 *     → read RGBA pixels → RGB (HWC, 0–255)
 *     → apply skin mask (non-skin pixels zeroed)
 *
 * No native modules: expo-image-manipulator, expo-file-system and jpeg-js
 * are replaced by canvas and Blob APIs.
 */

// ─── Face bounding box (from Phase 2 landmark detection) ─────────────────────
export interface FaceCropBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ─── Preprocessing result consumed by skinModelService.runSkinAnalysis() ─────
export interface ModelInputPixels {
  /** 224×224 RGB, HWC, 0–255 — the cropped image before masking */
  rgbPixels: Uint8Array;
  /** 224×224 RGB, HWC, 0–255 — non-skin pixels zeroed by the skin mask */
  maskedPixels: Uint8Array;
  width: 224;
  height: 224;
}

const MODEL_SIZE = 224;

/**
 * Prepares a captured image for ONNX model inference.
 *
 * @param source         Captured or uploaded image (File or Blob)
 * @param faceCropBounds Face bounding box in source pixel coordinates, or null for the full image
 * @param skinMask       Uint8Array [224*224]: 1=skin pixel, 0=non-skin
 */
export async function prepareModelInput(
  source: Blob,
  faceCropBounds: FaceCropBounds | null,
  skinMask: Uint8Array
): Promise<ModelInputPixels> {
  if (faceCropBounds && (faceCropBounds.maxX - faceCropBounds.minX <= 0 || faceCropBounds.maxY - faceCropBounds.minY <= 0)) {
    throw new Error(
      '[Preprocessing] Invalid face crop bounds. ' +
        'Ensure the face is clearly visible in the captured image.'
    );
  }

  const bitmap = await decodeBitmap(source);
  try {
    // Null bounds mean the full image. Otherwise clamp the crop to the decoded image.
    const bounds = faceCropBounds ?? { minX: 0, minY: 0, maxX: bitmap.width, maxY: bitmap.height };
    const cropW = bounds.maxX - bounds.minX;
    const cropH = bounds.maxY - bounds.minY;
    const sx = Math.max(0, Math.floor(bounds.minX));
    const sy = Math.max(0, Math.floor(bounds.minY));
    const sw = Math.min(Math.ceil(cropW), bitmap.width - sx);
    const sh = Math.min(Math.ceil(cropH), bitmap.height - sy);
    if (sw <= 0 || sh <= 0) {
      throw new Error('[Preprocessing] Face crop lies outside the image bounds.');
    }

    const rgbPixels = cropToRgb(bitmap, sx, sy, sw, sh, MODEL_SIZE, MODEL_SIZE);
    const maskedPixels = applyMaskToRgb(rgbPixels, skinMask, MODEL_SIZE, MODEL_SIZE);

    return { rgbPixels, maskedPixels, width: MODEL_SIZE, height: MODEL_SIZE };
  } finally {
    bitmap.close();
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function decodeBitmap(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source);
  } catch (err) {
    throw new Error(`[Preprocessing] Could not decode image: ${String(err)}`);
  }
}

/**
 * Crops a region of the bitmap, resizes it to outW×outH and returns RGB (HWC).
 */
export function cropToRgb(
  bitmap: ImageBitmap,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  outW: number,
  outH: number
): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('[Preprocessing] 2D canvas context unavailable in this browser.');
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
  const { data } = ctx.getImageData(0, 0, outW, outH);
  return rgbaToRgb(data, outW, outH);
}

/**
 * Converts RGBA Uint8ClampedArray / Uint8Array to RGB Uint8Array by dropping alpha.
 */
export function rgbaToRgb(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): Uint8Array {
  const pixelCount = width * height;
  const rgb = new Uint8Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    rgb[i * 3] = rgba[i * 4] ?? 0;
    rgb[i * 3 + 1] = rgba[i * 4 + 1] ?? 0;
    rgb[i * 3 + 2] = rgba[i * 4 + 2] ?? 0;
  }
  return rgb;
}

/**
 * Applies a binary skin mask to an RGB pixel array.
 * Non-skin pixels (mask[i] === 0) are set to 0 in all channels.
 */
export function applyMaskToRgb(
  rgb: Uint8Array,
  mask: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const pixelCount = width * height;

  if (mask.length !== pixelCount) {
    throw new Error(
      `[Preprocessing] Mask length (${mask.length}) ≠ pixel count (${pixelCount}). ` +
        'Mask must be a flat Uint8Array of length width × height.'
    );
  }

  const masked = new Uint8Array(rgb.length);
  for (let i = 0; i < pixelCount; i++) {
    if (mask[i] === 1) {
      masked[i * 3] = rgb[i * 3] ?? 0;
      masked[i * 3 + 1] = rgb[i * 3 + 1] ?? 0;
      masked[i * 3 + 2] = rgb[i * 3 + 2] ?? 0;
    }
  }
  return masked;
}

/**
 * Mean luminance (0–1) of a downsampled frame, used for the live lighting check.
 */
export function measureLuminance(source: CanvasImageSource, width: number, height: number): number {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 0.5;
  ctx.drawImage(source, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255;
  }
  return sum / (width * height);
}
