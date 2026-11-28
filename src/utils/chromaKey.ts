export interface WhiteChromaKeyOptions {
  /** Minimum RGB channel value to consider a pixel pure/near-white background (default: 226) */
  hardThreshold?: number;
  /** Lower brightness bound for anti-aliased edge feathering next to keyed background (default: 175) */
  softThreshold?: number;
  /** Maximum channel spread (max(r,g,b) - min(r,g,b)) for neutral white background (default: 30) */
  maxChroma?: number;
  /** Number of edge feathering passes around the foreground contour (default: 2) */
  featherPasses?: number;
}

export interface ChromaKeyStats {
  transparentPixels: number;
  featheredPixels: number;
  opaquePixels: number;
}

/**
 * Real-time white-background chroma-key filter for RGBA pixel buffers.
 *
 * Uses a fast border-seeded connected flood-fill so exterior white backdrop pixels
 * become fully transparent (alpha = 0) while preserving white specular highlights
 * inside the robot's armor/helmet. Follows with anti-aliased edge feathering and
 * white-spill decontamination to eliminate white halos on dark obsidian backgrounds.
 */
export function applyWhiteChromaKey(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: WhiteChromaKeyOptions = {},
  scratchMask?: Uint8Array,
  scratchQueue?: Int32Array
): ChromaKeyStats {
  const totalPixels = width * height;
  if (totalPixels === 0 || data.length < totalPixels * 4) {
    return { transparentPixels: 0, featheredPixels: 0, opaquePixels: 0 };
  }

  const hardThreshold = options.hardThreshold ?? 226;
  const softThreshold = options.softThreshold ?? 175;
  const maxChroma = options.maxChroma ?? 30;
  const featherPasses = Math.max(1, options.featherPasses ?? 2);

  // 0 = foreground, 1 = keyed exterior background, 2 = candidate edge fringe
  const mask = scratchMask && scratchMask.length >= totalPixels ? scratchMask : new Uint8Array(totalPixels);
  mask.fill(0, 0, totalPixels);

  const queue =
    scratchQueue && scratchQueue.length >= totalPixels ? scratchQueue : new Int32Array(totalPixels);

  const isNearWhiteBg = (pixelIdx: number): boolean => {
    const i = pixelIdx * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
    if (minC < hardThreshold) return false;
    const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
    return maxC - minC <= maxChroma;
  };

  let head = 0;
  let tail = 0;

  const enqueueIfBg = (pixelIdx: number) => {
    if (mask[pixelIdx] === 0 && isNearWhiteBg(pixelIdx)) {
      mask[pixelIdx] = 1;
      queue[tail++] = pixelIdx;
    }
  };

  // Seed flood-fill from all four outer borders of the video frame
  for (let x = 0; x < width; x++) {
    enqueueIfBg(x);
    enqueueIfBg((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueueIfBg(y * width);
    enqueueIfBg(y * width + (width - 1));
  }

  // Connected-component flood-fill across exterior white backdrop
  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    const y = (idx - x) / width;

    if (x > 0) enqueueIfBg(idx - 1);
    if (x < width - 1) enqueueIfBg(idx + 1);
    if (y > 0) enqueueIfBg(idx - width);
    if (y < height - 1) enqueueIfBg(idx + width);
  }

  let transparentPixels = 0;
  for (let p = 0; p < totalPixels; p++) {
    if (mask[p] === 1) {
      data[p * 4 + 3] = 0;
      transparentPixels++;
    }
  }

  // Smooth anti-aliased edge feathering + white-spill decontamination (removes white halo)
  let featheredPixels = 0;
  const softRange = Math.max(1, hardThreshold - softThreshold);

  for (let pass = 0; pass < featherPasses; pass++) {
    let frontierCount = 0;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const p = rowOffset + x;
        if (mask[p] !== 0) continue;

        // Check 4-connected neighbors for keyed background or previous soft edge
        let bgNeighbors = 0;
        if (x > 0 && mask[p - 1] > 0) bgNeighbors++;
        if (x < width - 1 && mask[p + 1] > 0) bgNeighbors++;
        if (y > 0 && mask[p - width] > 0) bgNeighbors++;
        if (y < height - 1 && mask[p + width] > 0) bgNeighbors++;
        if (bgNeighbors === 0) continue;

        const i = p * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
        const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
        const chroma = maxC - minC;

        // Neutral light halo pixels right on the boundary get smooth alpha falloff + color un-premultiply
        if (minC >= softThreshold && chroma <= maxChroma + 22) {
          const whiteness = Math.min(1, Math.max(0, (minC - softThreshold) / softRange));
          // Slightly softer falloff on pass 1 vs pass 0
          const passAttenuation = pass === 0 ? 1 : 0.65;
          const alphaFactor = Math.max(0, 1 - whiteness * passAttenuation);
          const nextAlpha = Math.round(data[i + 3] * alphaFactor);
          data[i + 3] = nextAlpha;

          // Decontaminate white spill on semi-transparent boundary pixels
          if (alphaFactor > 0.08 && alphaFactor < 0.98) {
            const bgContribution = (1 - alphaFactor) * 255;
            data[i] = Math.max(0, Math.min(255, Math.round((r - bgContribution) / alphaFactor)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round((g - bgContribution) / alphaFactor)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round((b - bgContribution) / alphaFactor)));
          }

          queue[frontierCount++] = p;
          featheredPixels++;
        }
      }
    }

    for (let k = 0; k < frontierCount; k++) {
      mask[queue[k]] = 2;
    }
  }

  return {
    transparentPixels,
    featheredPixels,
    opaquePixels: Math.max(0, totalPixels - transparentPixels - featheredPixels),
  };
}
