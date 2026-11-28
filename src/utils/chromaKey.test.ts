import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWhiteChromaKey } from './chromaKey';

function createBuffer(width: number, height: number, fill: [number, number, number, number]): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buf[i * 4] = fill[0];
    buf[i * 4 + 1] = fill[1];
    buf[i * 4 + 2] = fill[2];
    buf[i * 4 + 3] = fill[3];
  }
  return buf;
}

function setPixel(
  buf: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  rgba: [number, number, number, number]
) {
  const idx = (y * width + x) * 4;
  buf[idx] = rgba[0];
  buf[idx + 1] = rgba[1];
  buf[idx + 2] = rgba[2];
  buf[idx + 3] = rgba[3];
}

test('applyWhiteChromaKey removes exterior white backdrop while keeping robot body and interior white highlights opaque', () => {
  const w = 9;
  const h = 9;
  // Solid white backdrop
  const buf = createBuffer(w, h, [252, 252, 252, 255]);

  // Draw a 5x5 navy robot torso (x=2..6, y=2..6) with an interior pure-white chest badge (x=4, y=4)
  for (let y = 2; y <= 6; y++) {
    for (let x = 2; x <= 6; x++) {
      setPixel(buf, w, x, y, [18, 36, 84, 255]);
    }
  }
  // Interior pure white glossy armor highlight (must NOT be punched through!)
  setPixel(buf, w, 4, 4, [255, 255, 255, 255]);

  const stats = applyWhiteChromaKey(buf, w, h);

  // Outer corner must be fully transparent
  assert.equal(buf[3], 0, 'top-left white background pixel should have alpha 0');
  assert.equal(buf[(8 * w + 8) * 4 + 3], 0, 'bottom-right white background pixel should have alpha 0');

  // Navy robot border pixel must remain opaque
  assert.equal(buf[(2 * w + 2) * 4 + 3], 255, 'colored robot body pixel should stay opaque');

  // Interior pure white chest badge must remain opaque (flood-fill does not leak inside outline)
  assert.equal(buf[(4 * w + 4) * 4 + 3], 255, 'interior white robot highlight must stay opaque');
  assert.equal(stats.transparentPixels, 81 - 25);
});

test('applyWhiteChromaKey feathers light anti-aliased fringe pixels without leaving harsh white halos', () => {
  const w = 7;
  const h = 7;
  const buf = createBuffer(w, h, [250, 250, 250, 255]);

  // Center 3x3 orange/cyan robot core
  for (let y = 2; y <= 4; y++) {
    for (let x = 2; x <= 4; x++) {
      setPixel(buf, w, x, y, [255, 122, 0, 255]);
    }
  }
  // Add a light anti-aliased white-gray halo pixel right on the edge (x=1, y=3)
  setPixel(buf, w, 1, 3, [212, 212, 214, 255]);

  const stats = applyWhiteChromaKey(buf, w, h, {
    hardThreshold: 230,
    softThreshold: 175,
    featherPasses: 2,
  });

  const fringeAlpha = buf[(3 * w + 1) * 4 + 3];
  assert.ok(fringeAlpha > 0 && fringeAlpha < 200, `edge fringe alpha (${fringeAlpha}) should be smoothly feathered`);
  assert.ok(stats.featheredPixels >= 1, 'at least one edge fringe pixel should be feathered');
  // Core orange robot pixel stays 100% opaque
  assert.equal(buf[(3 * w + 3) * 4 + 3], 255);
});
