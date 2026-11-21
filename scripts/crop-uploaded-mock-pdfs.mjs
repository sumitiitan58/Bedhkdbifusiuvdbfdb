import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const TMP_DIR = '/tmp/mock_ppm_crop';

// --- Minimal zero-dependency PNG encoder (RGB8) ---
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePngRgb(rgbBuffer, width, height) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter None
    rgbBuffer.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function readPpm(filePath) {
  const buf = fs.readFileSync(filePath);
  let i = 0;
  function readToken() {
    while (i < buf.length) {
      const ch = buf[i];
      if (ch === 35) {
        // '#' comment
        while (i < buf.length && buf[i] !== 10) i++;
      } else if (ch <= 32) {
        i++;
      } else {
        break;
      }
    }
    const start = i;
    while (i < buf.length && buf[i] > 32 && buf[i] !== 35) i++;
    return buf.subarray(start, i).toString('ascii');
  }

  const magic = readToken();
  if (magic !== 'P6') throw new Error(`Expected P6 PPM in ${filePath}, got ${magic}`);
  const width = Number(readToken());
  const height = Number(readToken());
  const maxVal = Number(readToken());
  if (maxVal !== 255) throw new Error(`Unexpected maxVal ${maxVal}`);
  i++; // single whitespace byte after maxVal
  const data = buf.subarray(i, i + width * height * 3);
  return { width, height, data };
}

function cropAndSavePng(img, x0, y0, x1, y1, outPath, padWhite = 8) {
  const cx0 = Math.max(0, Math.floor(x0));
  const cy0 = Math.max(0, Math.floor(y0));
  const cx1 = Math.min(img.width, Math.ceil(x1));
  const cy1 = Math.min(img.height, Math.ceil(y1));
  const cw = Math.max(1, cx1 - cx0);
  const ch = Math.max(1, cy1 - cy0);

  const outW = cw + padWhite * 2;
  const outH = ch + padWhite * 2;
  const out = Buffer.alloc(outW * outH * 3, 255);

  for (let y = 0; y < ch; y++) {
    const srcStart = ((cy0 + y) * img.width + cx0) * 3;
    const dstStart = ((y + padWhite) * outW + padWhite) * 3;
    img.data.copy(out, dstStart, srcStart, srcStart + cw * 3);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, encodePngRgb(out, outW, outH));
}

function isNonWhite(data, idx, thresh = 247) {
  return data[idx] < thresh || data[idx + 1] < thresh || data[idx + 2] < thresh;
}

function tightBounds(img, x0, y0, x1, y1, thresh = 247) {
  let minX = x1;
  let maxX = x0;
  let minY = y1;
  let maxY = y0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * img.width + x) * 3;
      if (isNonWhite(img.data, idx, thresh)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX || minY > maxY) {
    return { x0, y0, x1, y1 };
  }
  return { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 };
}

function renderPdfToPpm(pdfRelPath, prefix, dpi = 200) {
  const outDir = path.join(TMP_DIR, prefix);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  execFileSync(
    'gs',
    [
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      '-sDEVICE=ppmraw',
      `-r${dpi}`,
      `-sOutputFile=${path.join(outDir, 'page_%02d.ppm')}`,
      path.join(ROOT, pdfRelPath),
    ],
    { stdio: 'pipe' }
  );
  return fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith('.ppm'))
    .sort()
    .map((f) => path.join(outDir, f));
}

/**
 * Side-by-Side Boxed Q&A extractor (Jee Main Mock Test 03, 04, 05)
 * Each question is a left blue-tinted box paired horizontally with a right green-tinted box.
 */
function cropSideBySideMock({ pdfRelPath, slug, expectedPerPage, totalExpected }) {
  console.log(`\n=== Processing ${slug} (${pdfRelPath}) ===`);
  const pages = renderPdfToPpm(pdfRelPath, slug, 200);
  const outDir = path.join(ROOT, 'public/assets/mocks', slug);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let qIndex = 0;

  for (let pageIdx = 1; pageIdx <= pages.length; pageIdx++) {
    const expectedCount = expectedPerPage[pageIdx];
    if (!expectedCount) continue;

    const img = readPpm(pages[pageIdx - 1]);
    const { width: W, height: H, data } = img;

    // Dynamically locate the full-width running header rule (top 2%..6.5%) and footer rule (bottom 93%..98%)
    const probeX0 = Math.floor(W * 0.12);
    const probeX1 = Math.floor(W * 0.88);
    const probeLen = probeX1 - probeX0;
    const isFullRule = (y) => {
      let dark = 0;
      for (let x = probeX0; x < probeX1; x += 2) {
        if (isNonWhite(data, (y * W + x) * 3, 240)) dark++;
      }
      return dark / (probeLen / 2) > 0.75;
    };

    let yTop = Math.floor(H * 0.048);
    for (let y = Math.floor(H * 0.02); y < Math.floor(H * 0.062); y++) {
      if (isFullRule(y)) yTop = y + 4;
    }

    let yBot = Math.floor(H * 0.955);
    for (let y = Math.floor(H * 0.975); y > Math.floor(H * 0.93); y--) {
      if (isFullRule(y)) yBot = y - 4;
    }

    const leftX0 = Math.floor(W * 0.03);
    const leftX1 = Math.floor(W * 0.495);
    const gutX0 = Math.floor(W * 0.495);
    const gutX1 = Math.floor(W * 0.505);
    const rightX0 = Math.floor(W * 0.505);
    const rightX1 = Math.floor(W * 0.97);

    // For each row, check left activity, right activity, and center gutter whiteness
    const rowPaired = new Uint8Array(H);
    for (let y = yTop; y < yBot; y++) {
      let gutNonWhite = 0;
      const gutLen = Math.max(1, gutX1 - gutX0);
      for (let x = gutX0; x < gutX1; x++) {
        if (isNonWhite(data, (y * W + x) * 3, 245)) gutNonWhite++;
      }
      // If center gutter has dark/colored banner across it, skip this row
      if (gutNonWhite / gutLen > 0.25) continue;

      let leftNonWhite = 0;
      for (let x = leftX0; x < leftX1; x += 2) {
        if (isNonWhite(data, (y * W + x) * 3, 246)) leftNonWhite++;
      }

      let rightNonWhite = 0;
      for (let x = rightX0; x < rightX1; x += 2) {
        if (isNonWhite(data, (y * W + x) * 3, 246)) rightNonWhite++;
      }

      // Both question box (left) and solution box (right) exist on this scanline
      if (leftNonWhite >= 8 && rightNonWhite >= 8) {
        rowPaired[y] = 1;
      }
    }

    // Group contiguous active y-bands (bridge tiny 1-2px gaps inside a box, NEVER bridge white gutters >= 8px)
    const bands = [];
    let inBand = false;
    let startY = 0;
    let gapCount = 0;
    for (let y = yTop; y < yBot; y++) {
      if (rowPaired[y]) {
        if (!inBand) {
          inBand = true;
          startY = y;
        }
        gapCount = 0;
      } else if (inBand) {
        gapCount++;
        if (gapCount > 5) {
          const endY = y - gapCount + 1;
          if (endY - startY >= 65) {
            bands.push({ y0: startY, y1: endY });
          }
          inBand = false;
          gapCount = 0;
        }
      }
    }
    if (inBand) {
      const endY = yBot - gapCount;
      if (endY - startY >= 65) {
        bands.push({ y0: startY, y1: endY });
      }
    }

    // Refine each band: expand up/down slightly (up to 6px) in case one side's rounded border extends 1-2px beyond the other,
    // stopping strictly at a pure white row in that column.
    const expandColumnY = (y0, y1, cx0, cx1) => {
      let ey0 = y0;
      let ey1 = y1;
      const rowHasInk = (yy) => {
        if (yy < yTop || yy >= yBot) return false;
        let cnt = 0;
        for (let x = cx0; x < cx1; x += 2) {
          if (isNonWhite(data, (yy * W + x) * 3, 246)) cnt++;
        }
        return cnt >= 4;
      };
      // Check center gutter is still clear before expanding
      const gutClear = (yy) => {
        let g = 0;
        for (let x = gutX0; x < gutX1; x++) {
          if (isNonWhite(data, (yy * W + x) * 3, 245)) g++;
        }
        return g / Math.max(1, gutX1 - gutX0) <= 0.25;
      };
      while (ey0 > yTop && gutClear(ey0 - 1) && rowHasInk(ey0 - 1)) ey0--;
      while (ey1 < yBot && gutClear(ey1) && rowHasInk(ey1)) ey1++;
      return { y0: ey0, y1: ey1 };
    };

    console.log(`  Page ${pageIdx}: detected ${bands.length} paired boxes (expected ${expectedCount})`);
    if (bands.length !== expectedCount) {
      console.error(`  MISMATCH on page ${pageIdx} of ${slug}! Bands:`, bands);
      throw new Error(`Expected ${expectedCount} boxes on page ${pageIdx} of ${slug}, got ${bands.length}`);
    }

    for (const band of bands) {
      qIndex++;
      const num = String(qIndex).padStart(2, '0');

      const lSpan = expandColumnY(band.y0, band.y1, leftX0, leftX1);
      const rSpan = expandColumnY(band.y0, band.y1, rightX0, rightX1);

      const qBounds = tightBounds(img, leftX0, lSpan.y0, leftX1, lSpan.y1, 247);
      const sBounds = tightBounds(img, rightX0, rSpan.y0, rightX1, rSpan.y1, 247);

      cropAndSavePng(img, qBounds.x0, qBounds.y0, qBounds.x1, qBounds.y1, path.join(outDir, `q${num}.png`), 8);
      cropAndSavePng(img, sBounds.x0, sBounds.y0, sBounds.x1, sBounds.y1, path.join(outDir, `s${num}.png`), 8);
    }
  }

  if (qIndex !== totalExpected) {
    throw new Error(`Expected ${totalExpected} total questions for ${slug}, got ${qIndex}`);
  }
  console.log(`  SUCCESS: Saved ${qIndex} question + ${qIndex} solution PNGs to public/assets/mocks/${slug}/`);
}

/**
 * 2-Column Table Q&A extractor (JEE Main Full-Pattern Mock Test with Solutions — 15 Qs across 6 pages)
 */
function cropTableMock({ pdfRelPath, slug, expectedPerPage, totalExpected }) {
  console.log(`\n=== Processing ${slug} (${pdfRelPath}) ===`);
  const pages = renderPdfToPpm(pdfRelPath, slug, 200);
  const outDir = path.join(ROOT, 'public/assets/mocks', slug);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let qIndex = 0;

  for (let pageIdx = 1; pageIdx <= pages.length; pageIdx++) {
    const expectedCount = expectedPerPage[pageIdx];
    if (!expectedCount) continue;

    const img = readPpm(pages[pageIdx - 1]);
    const { width: W, height: H, data } = img;

    // 1. Detect horizontal table rule lines spanning across x = 15%..85%
    const xProbe0 = Math.floor(W * 0.15);
    const xProbe1 = Math.floor(W * 0.85);
    const probeW = xProbe1 - xProbe0;

    const hLineRows = [];
    for (let y = Math.floor(H * 0.06); y < Math.floor(H * 0.94); y++) {
      let darkCount = 0;
      let sumLum = 0;
      for (let x = xProbe0; x < xProbe1; x++) {
        const idx = (y * W + x) * 3;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = (r + g + b) / 3;
        sumLum += lum;
        if (lum < 238) darkCount++;
      }
      if (darkCount / probeW > 0.85) {
        hLineRows.push({ y, avgLum: sumLum / probeW });
      }
    }

    // Group contiguous horizontal rule rows into distinct horizontal line segments
    const hSegments = [];
    for (const row of hLineRows) {
      if (hSegments.length === 0 || row.y > hSegments[hSegments.length - 1].y1 + 2) {
        hSegments.push({ y0: row.y, y1: row.y, sumLum: row.avgLum, count: 1 });
      } else {
        const last = hSegments[hSegments.length - 1];
        last.y1 = row.y;
        last.sumLum += row.avgLum;
        last.count++;
      }
    }

    // Filter out thin/header bands and empty space between table bottom and footer rule
    const rowCells = [];
    for (let i = 0; i < hSegments.length - 1; i++) {
      const top = hSegments[i].y1 + 1;
      const bot = hSegments[i + 1].y0 - 1;
      const h = bot - top;
      if (h < 220) continue;

      // Verify a vertical center table divider exists within x = 44%..56% across this row
      let maxVertRatio = 0;
      for (let x = Math.floor(W * 0.44); x <= Math.floor(W * 0.56); x++) {
        let nonWhite = 0;
        let tot = 0;
        for (let y = top + 12; y < bot - 12; y += 3) {
          const idx = (y * W + x) * 3;
          if ((data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 235) nonWhite++;
          tot++;
        }
        const ratio = nonWhite / Math.max(1, tot);
        if (ratio > maxVertRatio) maxVertRatio = ratio;
      }
      if (maxVertRatio < 0.75) continue;

      // Check average brightness inside cell (real Q&A cells have mostly white background, avgLum > 195)
      let lumSum = 0;
      let samples = 0;
      for (let y = top + 10; y < bot - 10; y += 6) {
        for (let x = xProbe0; x < xProbe1; x += 6) {
          const idx = (y * W + x) * 3;
          lumSum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          samples++;
        }
      }
      const avgLum = lumSum / Math.max(1, samples);
      if (avgLum < 185) continue;

      rowCells.push({ y0: top, y1: bot });
    }

    // 2. Detect left border, vertical center divider, and right border across the detected table rows
    const tableY0 = rowCells[0]?.y0 ?? Math.floor(H * 0.2);
    const tableY1 = rowCells[rowCells.length - 1]?.y1 ?? Math.floor(H * 0.8);
    const tableH = Math.max(1, tableY1 - tableY0);

    const findVerticalLine = (xStart, xEnd) => {
      let bestX = Math.floor((xStart + xEnd) / 2);
      let bestScore = -1;
      for (let x = xStart; x <= xEnd; x++) {
        let nonWhite = 0;
        for (let y = tableY0; y < tableY1; y += 2) {
          const idx = (y * W + x) * 3;
          if ((data[idx] + data[idx + 1] + data[idx + 2]) / 3 < 235) nonWhite++;
        }
        const score = nonWhite / (tableH / 2);
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
        }
      }
      return bestX;
    };

    const leftBorderX = findVerticalLine(Math.floor(W * 0.04), Math.floor(W * 0.14));
    const midDividerX = findVerticalLine(Math.floor(W * 0.42), Math.floor(W * 0.56));
    const rightBorderX = findVerticalLine(Math.floor(W * 0.86), Math.floor(W * 0.96));

    console.log(
      `  Page ${pageIdx}: detected ${rowCells.length} table rows (expected ${expectedCount}), borders=[${leftBorderX}, ${midDividerX}, ${rightBorderX}]`
    );
    if (rowCells.length !== expectedCount) {
      console.error(`  MISMATCH on page ${pageIdx} of ${slug}! hSegments:`, hSegments, 'rowCells:', rowCells);
      throw new Error(`Expected ${expectedCount} table rows on page ${pageIdx} of ${slug}, got ${rowCells.length}`);
    }

    for (const cell of rowCells) {
      qIndex++;
      const num = String(qIndex).padStart(2, '0');

      const qBounds = tightBounds(img, leftBorderX + 4, cell.y0 + 3, midDividerX - 4, cell.y1 - 3, 248);
      const sBounds = tightBounds(img, midDividerX + 4, cell.y0 + 3, rightBorderX - 4, cell.y1 - 3, 248);

      cropAndSavePng(img, qBounds.x0, qBounds.y0, qBounds.x1, qBounds.y1, path.join(outDir, `q${num}.png`), 14);
      cropAndSavePng(img, sBounds.x0, sBounds.y0, sBounds.x1, sBounds.y1, path.join(outDir, `s${num}.png`), 14);
    }
  }

  if (qIndex !== totalExpected) {
    throw new Error(`Expected ${totalExpected} total questions for ${slug}, got ${qIndex}`);
  }
  console.log(`  SUCCESS: Saved ${qIndex} question + ${qIndex} solution PNGs to public/assets/mocks/${slug}/`);
}

// Run all 4 real uploaded JEE Main mock PDFs
cropTableMock({
  pdfRelPath: 'public/assets/aistudio/JEE_Main_Full_Pattern_Mock_Test_with_Solutions_4ae75a72.pdf',
  slug: 'full-mock-test-2',
  expectedPerPage: { 1: 2, 2: 3, 3: 2, 4: 3, 5: 3, 6: 2 },
  totalExpected: 15,
});

cropSideBySideMock({
  pdfRelPath: 'public/assets/aistudio/Jee_Main_Mock_Test_03_0a6f71cd.pdf',
  slug: 'full-mock-test-3',
  expectedPerPage: { 2: 6, 3: 7, 4: 7, 5: 5, 6: 7, 7: 7, 8: 7, 9: 4, 10: 7, 11: 8, 12: 8, 13: 2 },
  totalExpected: 75,
});

cropSideBySideMock({
  pdfRelPath: 'public/assets/aistudio/Jee_Main_Mock_Test_04_4134b7ce.pdf',
  slug: 'full-mock-test-4',
  expectedPerPage: { 2: 6, 3: 7, 4: 7, 5: 5, 6: 6, 7: 7, 8: 7, 9: 5, 10: 7, 11: 8, 12: 8, 13: 2 },
  totalExpected: 75,
});

cropSideBySideMock({
  pdfRelPath: 'public/assets/aistudio/Jee_Main_Mock_Test_05_4cf0fd73.pdf',
  slug: 'full-mock-test-5',
  expectedPerPage: { 2: 7, 3: 7, 4: 7, 5: 4, 6: 6, 7: 7, 8: 7, 9: 5, 10: 8, 11: 9, 12: 8 },
  totalExpected: 75,
});

fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log('\nALL 4 MOCK PDFS CROPPED SUCCESSFULLY (480 PNGs total)!');
