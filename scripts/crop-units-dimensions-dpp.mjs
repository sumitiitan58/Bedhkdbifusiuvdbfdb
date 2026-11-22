import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT = process.cwd();
const TMP_DIR = '/tmp/dpp_units_dim_ppm';
const PDF_REL_PATH = 'public/assets/aistudio/Units_and_Dimensions_JEE_DPP_75Q_bcdbb8b4.pdf';
const ASSET_FOLDER = 'dpp-phy-units-dimensions-75';
const TEST_ID = 'dpp-phy-units-dimensions-75';
const SLUG = 'units-and-dimensions-jee-main-advanced-dpp-75-questions';

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
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
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
  i++;
  const data = buf.subarray(i, i + width * height * 3);
  return { width, height, data };
}

function isNonWhite(data, idx, thresh = 247) {
  return data[idx] < thresh || data[idx + 1] < thresh || data[idx + 2] < thresh;
}

function cropAndSavePng(img, x0, y0, x1, y1, outPath, pad = 10, bgRgb = [255, 255, 255]) {
  const cx0 = Math.max(0, Math.floor(x0));
  const cy0 = Math.max(0, Math.floor(y0));
  const cx1 = Math.min(img.width, Math.ceil(x1));
  const cy1 = Math.min(img.height, Math.ceil(y1));
  const cw = Math.max(1, cx1 - cx0);
  const ch = Math.max(1, cy1 - cy0);

  const outW = cw + pad * 2;
  const outH = ch + pad * 2;
  const out = Buffer.alloc(outW * outH * 3);
  for (let p = 0; p < outW * outH; p++) {
    out[p * 3] = bgRgb[0];
    out[p * 3 + 1] = bgRgb[1];
    out[p * 3 + 2] = bgRgb[2];
  }

  for (let y = 0; y < ch; y++) {
    const srcStart = ((cy0 + y) * img.width + cx0) * 3;
    const dstStart = ((y + pad) * outW + pad) * 3;
    img.data.copy(out, dstStart, srcStart, srcStart + cw * 3);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, encodePngRgb(out, outW, outH));
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

/**
 * Locate the internal horizontal header divider line (`rgb(203, 213, 225)`) inside either:
 *  - Left Question box (supports both 1-line and 2-line wrapped headers, followed by pure white body `rgb(255,255,255)`)
 *  - Right Solution box (header fill `rgb(226,232,240)`, divider `rgb(203,213,225)`, followed by cool-white body `rgb(248,250,252)`)
 * Crops strictly below the divider line and inside outer borders.
 */
function cropBoxBodyBelowHeader(img, bounds, kind, label) {
  const { width: W, data } = img;
  const innerX0 = bounds.x0 + 8;
  const innerX1 = bounds.x1 - 8;

  const probeX0 = bounds.x0 + Math.floor((bounds.x1 - bounds.x0) * 0.1);
  const probeX1 = bounds.x1 - Math.floor((bounds.x1 - bounds.x0) * 0.1);
  const probeW = Math.max(1, probeX1 - probeX0);

  const rowStats = (y) => {
    let sr = 0, sg = 0, sb = 0, divPx = 0;
    for (let x = probeX0; x < probeX1; x++) {
      const idx = (y * W + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      sr += r;
      sg += g;
      sb += b;
      // Exact divider line is rgb(203,213,225) — allow slight AA tolerance
      if (r >= 185 && r <= 222 && g >= 195 && g <= 230 && b >= 208 && b <= 238) {
        divPx++;
      }
    }
    return {
      avgR: sr / probeW,
      avgG: sg / probeW,
      avgB: sb / probeW,
      divRatio: divPx / probeW,
    };
  };

  const searchStart = Math.min(bounds.y1 - 20, bounds.y0 + 24);
  const searchEnd = Math.min(bounds.y1 - 20, bounds.y0 + (kind === 'question' ? 175 : 145));

  let dividerY = -1;
  for (let y = searchStart; y <= searchEnd; y++) {
    const st = rowStats(y);
    if (st.divRatio >= 0.88) {
      // Check row 4px below to verify we transition into clean body fill
      const below = rowStats(Math.min(bounds.y1 - 6, y + 4));
      const isCleanBody =
        kind === 'question'
          ? below.avgR >= 249 && below.avgG >= 249 && below.avgB >= 249
          : below.avgR >= 242 && below.avgG >= 245 && below.avgB >= 248;
      if (isCleanBody) {
        dividerY = y;
      }
    }
  }

  if (dividerY < 0) {
    throw new Error(
      `Failed to locate header divider for ${label} (${kind}) y=[${bounds.y0}..${bounds.y1}]`
    );
  }

  // Advance past multi-pixel stroke of the divider line
  while (dividerY + 1 < bounds.y1 - 10 && rowStats(dividerY + 1).divRatio >= 0.8) {
    dividerY++;
  }

  const bodyTopLimit = dividerY + 3;
  const bodyBotLimit = Math.max(bodyTopLimit + 10, bounds.y1 - 6);

  const bgRgb = kind === 'question' ? [255, 255, 255] : [248, 250, 252];
  const [bgR, bgG, bgB] = bgRgb;

  // Tightly find ink bounds inside body (excluding header and outer borders)
  let inkTop = bodyBotLimit;
  let inkBot = bodyTopLimit;
  for (let y = bodyTopLimit; y < bodyBotLimit; y++) {
    let rowInk = 0;
    for (let x = innerX0; x < innerX1; x++) {
      const idx = (y * W + x) * 3;
      const diff =
        Math.abs(data[idx] - bgR) +
        Math.abs(data[idx + 1] - bgG) +
        Math.abs(data[idx + 2] - bgB);
      if (diff > 28) {
        rowInk++;
      }
    }
    if (rowInk >= 3) {
      if (y < inkTop) inkTop = y;
      if (y > inkBot) inkBot = y;
    }
  }

  if (inkTop > inkBot) {
    inkTop = bodyTopLimit;
    inkBot = bodyBotLimit - 1;
  }

  const cropY0 = Math.max(dividerY + 2, inkTop - 4);
  const cropY1 = Math.min(bodyBotLimit, inkBot + 6);

  return {
    x0: innerX0,
    y0: cropY0,
    x1: innerX1,
    y1: cropY1,
    bgRgb,
    dividerY,
    headerHeightPx: dividerY - bounds.y0,
  };
}

function renderPdfPagesToPpm(pdfRelPath, dpi = 170) {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });
  execFileSync(
    'gs',
    [
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      '-sDEVICE=ppmraw',
      `-r${dpi}`,
      `-sOutputFile=${path.join(TMP_DIR, 'page_%03d.ppm')}`,
      path.join(ROOT, pdfRelPath),
    ],
    { stdio: 'pipe' }
  );
  return fs
    .readdirSync(TMP_DIR)
    .filter((f) => f.endsWith('.ppm'))
    .sort()
    .map((f) => path.join(TMP_DIR, f));
}

async function parseDppPdfMetadata(pdfRelPath) {
  const data = new Uint8Array(fs.readFileSync(path.join(ROOT, pdfRelPath)));
  const doc = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise;
  const numPages = doc.numPages;

  const letterToIdx = { A: 0, B: 1, C: 2, D: 3 };
  const expectedPerPage = {};
  const specs = [];

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({
        str: it.str.trim(),
        x: it.transform[4],
        y: vp.height - it.transform[5],
      }));

    // Left column Q.XX headers
    const qHeaders = items
      .filter((it) => it.x < 85 && /^Q\.(\d{2})$/.test(it.str))
      .sort((a, b) => a.y - b.y);

    // Right column Ans: ... pills
    const ansItems = items
      .filter((it) => it.x > 400 && /^Ans:\s*/.test(it.str))
      .sort((a, b) => a.y - b.y);

    if (qHeaders.length !== ansItems.length) {
      throw new Error(
        `Page ${p}: mismatch between Q headers (${qHeaders.length}) and Ans items (${ansItems.length})`
      );
    }

    expectedPerPage[p] = qHeaders.length;

    for (let i = 0; i < qHeaders.length; i++) {
      const qh = qHeaders[i];
      const qNum = Number(qh.str.match(/^Q\.(\d{2})$/)[1]);

      // Match nearest Ans item within ±8pt of qh.y
      const ansIt = ansItems.find((a) => Math.abs(a.y - qh.y) <= 8);
      if (!ansIt) {
        throw new Error(`Page ${p} Q.${qNum}: could not match Ans item near y=${qh.y}`);
      }

      // Extract topic text on the same line (x between 62 and 216, |y - qh.y| <= 3)
      const topicParts = items
        .filter(
          (it) =>
            it.x >= 62 &&
            it.x <= 216 &&
            Math.abs(it.y - qh.y) <= 3 &&
            !/^(Easy|Medium|Hard|\+4\s*\/\s*[−-]?\d)$/.test(it.str)
        )
        .sort((a, b) => a.x - b.x)
        .map((it) => it.str);
      const topic = topicParts.join(' ').replace(/\s+/g, ' ').trim() || 'Units & Dimensions';

      // Extract answer & questionType
      const rawAns = ansIt.str.replace(/^Ans:\s*/, '').trim();
      let questionType = 'single-mcq';
      let correctOptionIndices = [];
      let numericalAnswer;
      let positiveMarks = 4;
      let negativeMarks = 1;

      const singleMatch = rawAns.match(/^\(([A-D])\)$/);
      const multiMatch = rawAns.match(/^\(([A-D](?:\s*,\s*[A-D])+)\)$/);
      const numMatch = rawAns.match(/^([+-]?\d+(?:\.\d+)?)$/);

      if (singleMatch) {
        questionType = 'single-mcq';
        correctOptionIndices = [letterToIdx[singleMatch[1]]];
        positiveMarks = 4;
        negativeMarks = 1;
      } else if (multiMatch) {
        questionType = 'multi-mcq';
        correctOptionIndices = multiMatch[1]
          .split(',')
          .map((s) => letterToIdx[s.trim()])
          .sort((a, b) => a - b);
        positiveMarks = 4;
        negativeMarks = 2;
      } else if (numMatch) {
        questionType = 'integer';
        numericalAnswer = numMatch[1];
        positiveMarks = 4;
        negativeMarks = 0;
      } else {
        throw new Error(`Page ${p} Q.${qNum}: unrecognized Ans format "${ansIt.str}"`);
      }

      specs.push({
        q: qNum,
        page: p,
        topic,
        questionType,
        correctOptionIndices,
        numericalAnswer,
        positiveMarks,
        negativeMarks,
        rawAns,
      });
    }
  }

  specs.sort((a, b) => a.q - b.q);
  if (specs.length !== 75) {
    throw new Error(`Expected 75 questions, parsed ${specs.length}`);
  }
  for (let i = 0; i < 75; i++) {
    if (specs[i].q !== i + 1) {
      throw new Error(`Missing or out-of-order question at index ${i}: got Q.${specs[i].q}`);
    }
  }

  const scqCount = specs.filter((s) => s.questionType === 'single-mcq').length;
  const mcqCount = specs.filter((s) => s.questionType === 'multi-mcq').length;
  const intCount = specs.filter((s) => s.questionType === 'integer').length;
  console.log(
    `Parsed 75 questions across ${numPages} pages: ${scqCount} SCQ (+4/-1), ${mcqCount} Multi-Correct (+4/-2), ${intCount} Numerical (+4/0).`
  );

  return { numPages, expectedPerPage, specs };
}

function cropAllPages(meta) {
  console.log(`Rendering ${PDF_REL_PATH} at 170 DPI...`);
  const ppmFiles = renderPdfPagesToPpm(PDF_REL_PATH, 170);
  if (ppmFiles.length !== meta.numPages) {
    throw new Error(`Expected ${meta.numPages} PPM files, got ${ppmFiles.length}`);
  }

  const outDir = path.join(ROOT, 'public/assets/mocks', ASSET_FOLDER);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let qIndex = 0;
  let twoLineCount = 0;

  for (let idx = 0; idx < ppmFiles.length; idx++) {
    const pageNum = idx + 1;
    const expectedCount = meta.expectedPerPage[pageNum] || 0;
    const img = readPpm(ppmFiles[idx]);
    const { width: W, height: H, data } = img;

    // Exclude top page margin and bottom footer
    const yTop = Math.floor(H * 0.025);
    const yBot = Math.floor(H * 0.945);

    const leftX0 = Math.floor(W * 0.03);
    const leftX1 = Math.floor(W * 0.496);
    const gutX0 = Math.floor(W * 0.497);
    const gutX1 = Math.floor(W * 0.506);
    const rightX0 = Math.floor(W * 0.507);
    const rightX1 = Math.floor(W * 0.97);

    // Detect paired card rows: left & right have content/borders while the center gutter is clean white.
    // This naturally ignores full-width title banners and Section A–G banners!
    const rowPaired = new Uint8Array(H);
    for (let y = yTop; y < yBot; y++) {
      let gutNonWhite = 0;
      const gutLen = Math.max(1, gutX1 - gutX0);
      for (let x = gutX0; x < gutX1; x++) {
        if (isNonWhite(data, (y * W + x) * 3, 245)) gutNonWhite++;
      }
      if (gutNonWhite / gutLen > 0.15) continue;

      let leftNonWhite = 0;
      for (let x = leftX0; x < leftX1; x++) {
        if (isNonWhite(data, (y * W + x) * 3, 246)) {
          leftNonWhite++;
          if (leftNonWhite >= 2) break;
        }
      }

      let rightNonWhite = 0;
      for (let x = rightX0; x < rightX1; x++) {
        if (isNonWhite(data, (y * W + x) * 3, 246)) {
          rightNonWhite++;
          if (rightNonWhite >= 2) break;
        }
      }

      if (leftNonWhite >= 2 && rightNonWhite >= 2) {
        rowPaired[y] = 1;
      }
    }

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
        if (gapCount > 6) {
          const endY = y - gapCount + 1;
          if (endY - startY >= 90) {
            bands.push({ y0: startY, y1: endY });
          }
          inBand = false;
          gapCount = 0;
        }
      }
    }
    if (inBand) {
      const endY = yBot - gapCount;
      if (endY - startY >= 90) {
        bands.push({ y0: startY, y1: endY });
      }
    }

    if (bands.length !== expectedCount) {
      console.error(`Page ${pageNum}: detected ${bands.length} bands, expected ${expectedCount}`, bands);
      throw new Error(`Band count mismatch on page ${pageNum}`);
    }

    const expandColumnY = (y0, y1, cx0, cx1) => {
      let ey0 = y0;
      let ey1 = y1;
      const rowHasInk = (yy) => {
        if (yy < yTop || yy >= yBot) return false;
        let cnt = 0;
        for (let x = cx0; x < cx1; x++) {
          if (isNonWhite(data, (yy * W + x) * 3, 246)) {
            cnt++;
            if (cnt >= 2) return true;
          }
        }
        return false;
      };
      const gutClear = (yy) => {
        let g = 0;
        for (let x = gutX0; x < gutX1; x++) {
          if (isNonWhite(data, (yy * W + x) * 3, 245)) g++;
        }
        return g / Math.max(1, gutX1 - gutX0) <= 0.15;
      };
      while (ey0 > yTop && gutClear(ey0 - 1) && rowHasInk(ey0 - 1)) ey0--;
      while (ey1 < yBot && gutClear(ey1) && rowHasInk(ey1)) ey1++;
      return { y0: ey0, y1: ey1 };
    };

    for (const band of bands) {
      qIndex++;
      const num = String(qIndex).padStart(2, '0');

      const lSpan = expandColumnY(band.y0, band.y1, leftX0, leftX1);
      const rSpan = expandColumnY(band.y0, band.y1, rightX0, rightX1);

      const qBounds = tightBounds(img, leftX0, lSpan.y0, leftX1, lSpan.y1, 247);
      const sBounds = tightBounds(img, rightX0, rSpan.y0, rightX1, rSpan.y1, 247);

      const qBody = cropBoxBodyBelowHeader(img, qBounds, 'question', `P${pageNum} Q.${num}`);
      const sBody = cropBoxBodyBelowHeader(img, sBounds, 'solution', `P${pageNum} S.${num}`);

      if (qBody.headerHeightPx > 85) {
        twoLineCount++;
      }

      cropAndSavePng(
        img,
        qBody.x0,
        qBody.y0,
        qBody.x1,
        qBody.y1,
        path.join(outDir, `q${num}.png`),
        10,
        qBody.bgRgb
      );
      cropAndSavePng(
        img,
        sBody.x0,
        sBody.y0,
        sBody.x1,
        sBody.y1,
        path.join(outDir, `s${num}.png`),
        10,
        sBody.bgRgb
      );
    }
  }

  if (qIndex !== 75) {
    throw new Error(`Expected 75 cropped questions, got ${qIndex}`);
  }
  console.log(
    `SUCCESS: 75 header-free Q + 75 header-free S PNGs saved to public/assets/mocks/${ASSET_FOLDER} (${twoLineCount} wrapped 2-line headers cleanly removed).`
  );
}

function buildCatalogFile(specs) {
  const lines = [];
  lines.push(`import type { MockTestRecord, TestQuestionRecord } from '../types';`);
  lines.push(`import { getDefaultExamInstructions } from '../utils/examPresets';`);
  lines.push('');
  lines.push(`const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;`);
  lines.push('');
  lines.push(`type DppQuestionSpec = {`);
  lines.push(`  q: number;`);
  lines.push(`  page: number;`);
  lines.push(`  topic: string;`);
  lines.push(`  type: 'single-mcq' | 'multi-mcq' | 'integer';`);
  lines.push(`  correctOptionIndices?: number[];`);
  lines.push(`  numericalAnswer?: string;`);
  lines.push(`  positiveMarks: number;`);
  lines.push(`  negativeMarks: number;`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export const DPP_UNITS_DIMENSIONS_75_RECORD: MockTestRecord = {`);
  lines.push(`  id: ${JSON.stringify(TEST_ID)},`);
  lines.push(
    `  title: 'Units & Dimensions — 75 Quality Questions (JEE Main & Advanced DPP)',`
  );
  lines.push(`  slug: ${JSON.stringify(SLUG)},`);
  lines.push(
    `  seoDescription: 'Practice 75 high-yield JEE Main & Advanced Physics DPP questions on Units, Dimensions, Significant Figures, Error Analysis, Vernier Calipers & Screw Gauge for Class 11 JEE and JEE Dropper on PREPSKM.IN with instant CBT scoring and step-by-step solutions.',`
  );
  lines.push(`  destination: 'dpp',`);
  lines.push(`  cohortId: 'class-11-jee',`);
  lines.push(`  cohortIds: ['class-11-jee', 'jee-dropper'],`);
  lines.push(`  subjectId: 'subj-physics',`);
  lines.push(`  chapterId: 'chap-jee-phy-01',`);
  lines.push(`  examCategory: 'Chapter-Wise DPP (JEE Main & Advanced)',`);
  lines.push(`  examType: 'JEE Main',`);
  lines.push(`  syllabus: [`);
  lines.push(`    {`);
  lines.push(`      subject: 'Physics',`);
  lines.push(`      chapters: [`);
  lines.push(`        'Units & Fundamental Quantities',`);
  lines.push(`        'Dimensional Formulae & Physical Constants',`);
  lines.push(`        'Principle of Homogeneity & Transcendental Functions',`);
  lines.push(`        'Deducing Relations & Non-Standard Fundamental Systems',`);
  lines.push(`        'Significant Figures & Rounding Off',`);
  lines.push(`        'Error Analysis & Propagation',`);
  lines.push(`        'Measuring Instruments (Vernier Calipers & Screw Gauge)',`);
  lines.push(`      ],`);
  lines.push(`    },`);
  lines.push(`  ],`);
  lines.push(`  instructions: getDefaultExamInstructions({`);
  lines.push(`    examType: 'JEE Main',`);
  lines.push(`    durationMinutes: 120,`);
  lines.push(`    positiveMarks: 4,`);
  lines.push(`    negativeMarks: 1,`);
  lines.push(`    negativeMarkingEnabled: true,`);
  lines.push(`    totalQuestions: 75,`);
  lines.push(`  }),`);
  lines.push(`  subjectRanges: [{ subjectName: 'Physics', startQ: 1, endQ: 75 }],`);
  lines.push(`  totalQuestions: 75,`);
  lines.push(`  totalMarks: 300,`);
  lines.push(`  durationMinutes: 120,`);
  lines.push(`  positiveMarks: 4,`);
  lines.push(`  negativeMarks: 1,`);
  lines.push(`  negativeMarkingEnabled: true,`);
  lines.push(`  showSolutionsAfterSubmit: true,`);
  lines.push(`  status: 'published',`);
  lines.push(`  createdAtIso: '2026-11-21T23:30:00.000Z',`);
  lines.push(`};`);
  lines.push('');
  lines.push(`const DPP_UNITS_DIMENSIONS_SPECS: DppQuestionSpec[] = [`);
  for (const s of specs) {
    const parts = [
      `q: ${s.q}`,
      `page: ${s.page}`,
      `topic: ${JSON.stringify(s.topic)}`,
      `type: ${JSON.stringify(s.questionType)}`,
    ];
    if (s.questionType === 'integer') {
      parts.push(`numericalAnswer: ${JSON.stringify(s.numericalAnswer)}`);
    } else {
      parts.push(`correctOptionIndices: [${s.correctOptionIndices.join(', ')}]`);
    }
    parts.push(`positiveMarks: ${s.positiveMarks}`);
    parts.push(`negativeMarks: ${s.negativeMarks}`);
    lines.push(`  { ${parts.join(', ')} },`);
  }
  lines.push(`];`);
  lines.push('');
  lines.push(
    `export const DPP_UNITS_DIMENSIONS_75_QUESTIONS: TestQuestionRecord[] = DPP_UNITS_DIMENSIONS_SPECS.map((spec) => {`
  );
  lines.push(`  const num = String(spec.q).padStart(2, '0');`);
  lines.push(`  const chapterLabel = \`Units & Dimensions — \${spec.topic}\`;`);
  lines.push(`  const answerSummary =`);
  lines.push(`    spec.type === 'integer'`);
  lines.push(`      ? \`Correct Answer: \${spec.numericalAnswer}\``);
  lines.push(
    `      : \`Correct Option: (\${(spec.correctOptionIndices ?? []).map((i) => OPTION_LETTERS[i]).join(', ')})\`;`
  );
  lines.push(`  return {`);
  lines.push(`    id: \`q-dpp-ud75-\${num}\`,`);
  lines.push(`    testId: ${JSON.stringify(TEST_ID)},`);
  lines.push(`    questionNumber: spec.q,`);
  lines.push(`    subjectName: 'Physics',`);
  lines.push(`    chapterName: chapterLabel,`);
  lines.push(`    questionType: spec.type,`);
  lines.push(
    `    questionText: \`Units & Dimensions DPP · Q\${spec.q} (\${spec.topic}). Refer to the cropped question image.\`,`
  );
  lines.push(`    questionImageUrl: \`/assets/mocks/${ASSET_FOLDER}/q\${num}.png\`,`);
  lines.push(
    `    ...(spec.type === 'integer'`
  );
  lines.push(`      ? { numericalAnswer: spec.numericalAnswer }`);
  lines.push(
    `      : { optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'], correctOptionIndices: spec.correctOptionIndices }),`
  );
  lines.push(
    `    solutionText: \`\${answerSummary}. Refer to the step-by-step cropped solution for \${spec.topic}.\`,`
  );
  lines.push(`    solutionImageUrl: \`/assets/mocks/${ASSET_FOLDER}/s\${num}.png\`,`);
  lines.push(`    sourcePageNumber: spec.page,`);
  lines.push(`    positiveMarks: spec.positiveMarks,`);
  lines.push(`    negativeMarks: spec.negativeMarks,`);
  lines.push(`    testStatus: 'published',`);
  lines.push(`  };`);
  lines.push(`});`);
  lines.push('');

  const outPath = path.join(ROOT, 'src/data/dppUnitsDimensionsCatalog.ts');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Generated ${outPath} with 75 JEE Main & Advanced DPP questions.`);
}

async function main() {
  const meta = await parseDppPdfMetadata(PDF_REL_PATH);
  cropAllPages(meta);
  buildCatalogFile(meta.specs);
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.rmSync('/tmp/dpp_probe', { recursive: true, force: true });
  console.log('Done! All 150 header-free PNGs and catalog generated cleanly.');
  process.exit(0);
}

main().catch((err) => {
  console.error('DPP cropper failed:', err);
  process.exit(1);
});
