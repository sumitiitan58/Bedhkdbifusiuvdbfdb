import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT = process.cwd();
const TMP_DIR = '/tmp/neet_ppm_crop';

const NEET_TESTS = [
  {
    num: 1,
    id: 'cbt-neet-full-mock-test-1',
    slug: 'neet-ug-full-mock-test-01-ncert-foundation',
    assetFolder: 'neet-mock-test-1',
    prefix: 'neet1',
    pdfRelPath: 'public/assets/aistudio/NEET_UG_Mock_Test_01_ad0c2971.pdf',
    title: 'NEET (UG) Full Mock Test 01 — Full NCERT Foundation',
    subtitle: 'Full NCERT Foundation',
    seoDescription:
      'Attempt NEET (UG) Full Mock Test 01 (Full NCERT Foundation) free online in NTA CBT format on PREPSKM.IN — 180 compulsory MCQs across Physics, Chemistry, Botany & Zoology, 720 marks, 180 minutes, +4/-1 marking with step-by-step solutions.',
    createdAtIso: '2026-11-21T10:01:00.000Z',
  },
  {
    num: 2,
    id: 'cbt-neet-full-mock-test-2',
    slug: 'neet-ug-full-mock-test-02-conceptual-numerical',
    assetFolder: 'neet-mock-test-2',
    prefix: 'neet2',
    pdfRelPath: 'public/assets/aistudio/NEET_UG_Mock_Test_02_b9ae73d7.pdf',
    title: 'NEET (UG) Full Mock Test 02 — Conceptual & Numerical',
    subtitle: 'Conceptual & Numerical',
    seoDescription:
      'Attempt NEET (UG) Full Mock Test 02 (Conceptual & Numerical) free online in NTA CBT format on PREPSKM.IN — 180 compulsory MCQs across Physics, Chemistry, Botany & Zoology, 720 marks, 180 minutes, +4/-1 marking with step-by-step solutions.',
    createdAtIso: '2026-11-21T10:02:00.000Z',
  },
  {
    num: 3,
    id: 'cbt-neet-full-mock-test-3',
    slug: 'neet-ug-full-mock-test-03-high-yield-ncert-lines',
    assetFolder: 'neet-mock-test-3',
    prefix: 'neet3',
    pdfRelPath: 'public/assets/aistudio/NEET_UG_Mock_Test_03_2b8e9168.pdf',
    title: 'NEET (UG) Full Mock Test 03 — High-Yield NCERT Lines',
    subtitle: 'High-Yield NCERT Lines',
    seoDescription:
      'Attempt NEET (UG) Full Mock Test 03 (High-Yield NCERT Lines) free online in NTA CBT format on PREPSKM.IN — 180 compulsory MCQs across Physics, Chemistry, Botany & Zoology, 720 marks, 180 minutes, +4/-1 marking with step-by-step solutions.',
    createdAtIso: '2026-11-21T10:03:00.000Z',
  },
  {
    num: 4,
    id: 'cbt-neet-full-mock-test-4',
    slug: 'neet-ug-full-mock-test-04-application-reasoning',
    assetFolder: 'neet-mock-test-4',
    prefix: 'neet4',
    pdfRelPath: 'public/assets/aistudio/NEET_UG_Mock_Test_04_b93e8d6c.pdf',
    title: 'NEET (UG) Full Mock Test 04 — Application & Reasoning',
    subtitle: 'Application & Reasoning',
    seoDescription:
      'Attempt NEET (UG) Full Mock Test 04 (Application & Reasoning) free online in NTA CBT format on PREPSKM.IN — 180 compulsory MCQs across Physics, Chemistry, Botany & Zoology, 720 marks, 180 minutes, +4/-1 marking with step-by-step solutions.',
    createdAtIso: '2026-11-21T10:04:00.000Z',
  },
  {
    num: 5,
    id: 'cbt-neet-full-mock-test-5',
    slug: 'neet-ug-full-mock-test-05-statement-assertion-mix',
    assetFolder: 'neet-mock-test-5',
    prefix: 'neet5',
    pdfRelPath: 'public/assets/aistudio/NEET_UG_Mock_Test_05_c7684e5a.pdf',
    title: 'NEET (UG) Full Mock Test 05 — Statement & Assertion Mix',
    subtitle: 'Statement & Assertion Mix',
    seoDescription:
      'Attempt NEET (UG) Full Mock Test 05 (Statement & Assertion Mix) free online in NTA CBT format on PREPSKM.IN — 180 compulsory MCQs across Physics, Chemistry, Botany & Zoology, 720 marks, 180 minutes, +4/-1 marking with step-by-step solutions.',
    createdAtIso: '2026-11-21T10:05:00.000Z',
  },
  {
    num: 6,
    id: 'cbt-neet-full-mock-test-6',
    slug: 'neet-ug-full-mock-test-06-balanced-grand-test',
    assetFolder: 'neet-mock-test-6',
    prefix: 'neet6',
    pdfRelPath: 'public/assets/aistudio/NEET_UG_Mock_Test_06_93317060.pdf',
    title: 'NEET (UG) Full Mock Test 06 — Balanced Grand Test',
    subtitle: 'Balanced Grand Test',
    seoDescription:
      'Attempt NEET (UG) Full Mock Test 06 (Balanced Grand Test) free online in NTA CBT format on PREPSKM.IN — 180 compulsory MCQs across Physics, Chemistry, Botany & Zoology, 720 marks, 180 minutes, +4/-1 marking with step-by-step solutions.',
    createdAtIso: '2026-11-22T10:06:00.000Z',
  },
  {
    num: 7,
    id: 'cbt-neet-full-mock-test-7',
    slug: 'neet-ug-full-mock-test-07-speed-accuracy-drill',
    assetFolder: 'neet-mock-test-7',
    prefix: 'neet7',
    pdfRelPath: 'public/assets/aistudio/NEET_UG_Mock_Test_07_483c046e.pdf',
    title: 'NEET (UG) Full Mock Test 07 — Speed & Accuracy Drill',
    subtitle: 'Speed & Accuracy Drill',
    seoDescription:
      'Attempt NEET (UG) Full Mock Test 07 (Speed & Accuracy Drill) free online in NTA CBT format on PREPSKM.IN — 180 compulsory MCQs across Physics, Chemistry, Botany & Zoology, 720 marks, 180 minutes, +4/-1 marking with step-by-step solutions.',
    createdAtIso: '2026-11-22T10:07:00.000Z',
  },
  {
    num: 8,
    id: 'cbt-neet-full-mock-test-8',
    slug: 'neet-ug-full-mock-test-08-pyq-pattern-comprehensive',
    assetFolder: 'neet-mock-test-8',
    prefix: 'neet8',
    pdfRelPath: 'public/assets/aistudio/NEET_UG_Mock_Test_08_401f6a65.pdf',
    title: 'NEET (UG) Full Mock Test 08 — PYQ-Pattern Comprehensive',
    subtitle: 'PYQ-Pattern Comprehensive',
    seoDescription:
      'Attempt NEET (UG) Full Mock Test 08 (PYQ-Pattern Comprehensive) free online in NTA CBT format on PREPSKM.IN — 180 compulsory MCQs across Physics, Chemistry, Botany & Zoology, 720 marks, 180 minutes, +4/-1 marking with step-by-step solutions.',
    createdAtIso: '2026-11-22T10:08:00.000Z',
  },
];

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
 * Find the internal horizontal divider line right below the header inside a question/solution box,
 * and trim strictly below that line (excluding box borders and header).
 */
function cropBoxBodyBelowHeader(img, bounds, kind) {
  const { width: W, data } = img;
  // Step strictly inside outer rounded box border
  const innerX0 = bounds.x0 + 8;
  const innerX1 = bounds.x1 - 8;
  const innerW = Math.max(1, innerX1 - innerX0);

  // Sample probe region horizontally away from rounded corners
  const probeX0 = bounds.x0 + Math.floor((bounds.x1 - bounds.x0) * 0.12);
  const probeX1 = bounds.x1 - Math.floor((bounds.x1 - bounds.x0) * 0.12);
  const probeW = Math.max(1, probeX1 - probeX0);

  // Scan downward from box top + 14px to top + 100px for the internal horizontal divider line
  // Left question box divider RGB ≈ (188, 206, 228), bg ≈ (245, 248, 252)
  // Right solution box divider RGB ≈ (172, 218, 210), bg ≈ (243, 250, 248)
  const searchStart = Math.min(bounds.y1 - 15, bounds.y0 + 14);
  const searchEnd = Math.min(bounds.y1 - 15, bounds.y0 + 105);

  let dividerY = -1;
  let bestRatio = 0;

  for (let y = searchStart; y <= searchEnd; y++) {
    let linePx = 0;
    for (let x = probeX0; x < probeX1; x++) {
      const idx = (y * W + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Divider line is clearly darker than the pale box fill (245,248,252 or 243,250,248)
      if (r < 228 && g < 236 && b < 242) {
        linePx++;
      }
    }
    const ratio = linePx / probeW;
    if (ratio > 0.82 && ratio >= bestRatio) {
      bestRatio = ratio;
      dividerY = y;
    }
  }

  if (dividerY < 0) {
    throw new Error(
      `Failed to locate internal header divider rule for ${kind} box y=[${bounds.y0}..${bounds.y1}], bestRatio=${bestRatio.toFixed(2)}`
    );
  }

  // Body region starts strictly below the divider line and stops inside bottom border
  const bodyTopLimit = dividerY + 3;
  const bodyBotLimit = Math.max(bodyTopLimit + 10, bounds.y1 - 6);

  // Determine the exact box background RGB from the clean row right below the divider line
  const sampleY = Math.min(bodyBotLimit - 1, dividerY + 2);
  let bgR = 245;
  let bgG = 248;
  let bgB = 252;
  if (kind === 'solution') {
    bgR = 243;
    bgG = 250;
    bgB = 248;
  } else {
    // Sample median-like average on sampleY where pixels are light
    let sr = 0, sg = 0, sb = 0, sc = 0;
    for (let x = probeX0; x < probeX1; x += 2) {
      const idx = (sampleY * W + x) * 3;
      if (data[idx] > 235 && data[idx + 1] > 235 && data[idx + 2] > 235) {
        sr += data[idx];
        sg += data[idx + 1];
        sb += data[idx + 2];
        sc++;
      }
    }
    if (sc > 20) {
      bgR = Math.round(sr / sc);
      bgG = Math.round(sg / sc);
      bgB = Math.round(sb / sc);
    }
  }

  // Tightly find vertical ink extent inside the body (pixels differing from box bg by > 18)
  let inkTop = bodyBotLimit;
  let inkBot = bodyTopLimit;
  for (let y = bodyTopLimit; y < bodyBotLimit; y++) {
    let rowInk = 0;
    for (let x = innerX0; x < innerX1; x++) {
      const idx = (y * W + x) * 3;
      const dr = Math.abs(data[idx] - bgR);
      const dg = Math.abs(data[idx + 1] - bgG);
      const db = Math.abs(data[idx + 2] - bgB);
      if (dr + dg + db > 28) {
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

  // Include slight natural margin around ink, strictly staying below dividerY + 2 and inside bottom border
  const cropY0 = Math.max(dividerY + 2, inkTop - 4);
  const cropY1 = Math.min(bodyBotLimit, inkBot + 6);

  return {
    x0: innerX0,
    y0: cropY0,
    x1: innerX1,
    y1: cropY1,
    bgRgb: [bgR, bgG, bgB],
    dividerY,
    innerW,
  };
}

function renderPdfPagesToPpm(pdfRelPath, slug, firstPage, lastPage, dpi = 165) {
  const outDir = path.join(TMP_DIR, slug);
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
      `-dFirstPage=${firstPage}`,
      `-dLastPage=${lastPage}`,
      `-sOutputFile=${path.join(outDir, 'page_%03d.ppm')}`,
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

async function parseNeetPdfMetadata(pdfRelPath) {
  const data = new Uint8Array(fs.readFileSync(path.join(ROOT, pdfRelPath)));
  const doc = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise;
  const numPages = doc.numPages;

  // Parse Quick Answer Key from final page
  const keyPage = await doc.getPage(numPages);
  const keyTextContent = await keyPage.getTextContent();
  const keyText = keyTextContent.items.map((it) => it.str).join(' ');
  const answerKey = new Map();
  const keyRegex = /Q(\d+)\s*:\s*\(([A-D])\)/g;
  let m;
  while ((m = keyRegex.exec(keyText)) !== null) {
    answerKey.set(Number(m[1]), m[2]);
  }
  if (answerKey.size !== 180) {
    throw new Error(`Expected 180 answers in Quick Answer Key of ${pdfRelPath}, found ${answerKey.size}`);
  }

  // Parse question headers & solution answers on pages 2..(numPages - 1)
  const expectedPerPage = {};
  const questionMeta = new Map();

  for (let p = 2; p < numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const pageStr = tc.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ');

    // Match headers like: Q1. | Physics • Units & Measurements [+4 / -1]
    const qHeaderRegex =
      /Q(\d+)\.\s*\|\s*(Physics|Chemistry|Botany|Zoology)\s*[•·\-]\s*([^\[]+?)\s*\[\+4\s*\/\s*-1\]/g;
    const foundOnPage = [];
    let hm;
    while ((hm = qHeaderRegex.exec(pageStr)) !== null) {
      const qNum = Number(hm[1]);
      const subject = hm[2].trim();
      const chapter = hm[3].trim().replace(/\s+/g, ' ');
      foundOnPage.push(qNum);
      questionMeta.set(qNum, {
        q: qNum,
        subject,
        chapter,
        page: p,
      });
    }

    // Cross-check Solution Qn Ans: (X)
    const solRegex = /Solution\s+Q(\d+)\s+Ans:\s*\(([A-D])\)/g;
    let sm;
    while ((sm = solRegex.exec(pageStr)) !== null) {
      const qNum = Number(sm[1]);
      const solAns = sm[2];
      const keyAns = answerKey.get(qNum);
      if (solAns !== keyAns) {
        throw new Error(
          `Answer mismatch in ${pdfRelPath} Q${qNum}: solution says (${solAns}), key says (${keyAns})`
        );
      }
    }

    expectedPerPage[p] = foundOnPage.length;
  }

  if (questionMeta.size !== 180) {
    const missing = [];
    for (let q = 1; q <= 180; q++) {
      if (!questionMeta.has(q)) missing.push(q);
    }
    throw new Error(
      `Expected 180 parsed question headers in ${pdfRelPath}, got ${questionMeta.size}. Missing: ${missing.join(', ')}`
    );
  }

  const letterToIdx = { A: 0, B: 1, C: 2, D: 3 };
  const specs = [];
  for (let q = 1; q <= 180; q++) {
    const meta = questionMeta.get(q);
    specs.push({
      q,
      subject: meta.subject,
      chapter: meta.chapter,
      page: meta.page,
      ans: letterToIdx[answerKey.get(q)],
    });
  }

  return { numPages, expectedPerPage, specs };
}

function cropNeetPdfImages(testCfg, meta) {
  console.log(`\n=== Cropping ${testCfg.assetFolder} (${testCfg.pdfRelPath}) ===`);
  const lastContentPage = meta.numPages - 1;
  const ppmFiles = renderPdfPagesToPpm(testCfg.pdfRelPath, testCfg.assetFolder, 2, lastContentPage, 165);
  const outDir = path.join(ROOT, 'public/assets/mocks', testCfg.assetFolder);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let qIndex = 0;

  for (let idx = 0; idx < ppmFiles.length; idx++) {
    const pageNum = idx + 2;
    const expectedCount = meta.expectedPerPage[pageNum] || 0;
    if (!expectedCount) continue;

    const img = readPpm(ppmFiles[idx]);
    const { width: W, height: H, data } = img;

    // Locate full-width running header rule (top 2%..6.5%) and footer rule (bottom 93%..98%)
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

    const rowPaired = new Uint8Array(H);
    for (let y = yTop; y < yBot; y++) {
      let gutNonWhite = 0;
      const gutLen = Math.max(1, gutX1 - gutX0);
      for (let x = gutX0; x < gutX1; x++) {
        if (isNonWhite(data, (y * W + x) * 3, 245)) gutNonWhite++;
      }
      if (gutNonWhite / gutLen > 0.25) continue;

      let leftNonWhite = 0;
      for (let x = leftX0; x < leftX1; x += 2) {
        if (isNonWhite(data, (y * W + x) * 3, 246)) leftNonWhite++;
      }

      let rightNonWhite = 0;
      for (let x = rightX0; x < rightX1; x += 2) {
        if (isNonWhite(data, (y * W + x) * 3, 246)) rightNonWhite++;
      }

      if (leftNonWhite >= 8 && rightNonWhite >= 8) {
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
        if (gapCount > 5) {
          const endY = y - gapCount + 1;
          if (endY - startY >= 55) {
            bands.push({ y0: startY, y1: endY });
          }
          inBand = false;
          gapCount = 0;
        }
      }
    }
    if (inBand) {
      const endY = yBot - gapCount;
      if (endY - startY >= 55) {
        bands.push({ y0: startY, y1: endY });
      }
    }

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

    if (bands.length !== expectedCount) {
      console.error(
        `  MISMATCH on page ${pageNum} of ${testCfg.assetFolder}: detected ${bands.length}, expected ${expectedCount}`,
        bands
      );
      throw new Error(
        `Expected ${expectedCount} boxes on page ${pageNum} of ${testCfg.assetFolder}, got ${bands.length}`
      );
    }

    for (const band of bands) {
      qIndex++;
      const num = String(qIndex).padStart(3, '0');

      const lSpan = expandColumnY(band.y0, band.y1, leftX0, leftX1);
      const rSpan = expandColumnY(band.y0, band.y1, rightX0, rightX1);

      const qBounds = tightBounds(img, leftX0, lSpan.y0, leftX1, lSpan.y1, 247);
      const sBounds = tightBounds(img, rightX0, rSpan.y0, rightX1, rSpan.y1, 247);

      const qBody = cropBoxBodyBelowHeader(img, qBounds, `question Q${qIndex}`);
      const sBody = cropBoxBodyBelowHeader(img, sBounds, `solution Q${qIndex}`);

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
    fs.rmSync(ppmFiles[idx], { force: true });
  }

  fs.rmSync(path.join(TMP_DIR, testCfg.assetFolder), { recursive: true, force: true });

  if (qIndex !== 180) {
    throw new Error(`Expected 180 cropped questions for ${testCfg.assetFolder}, got ${qIndex}`);
  }
  console.log(`  SUCCESS: 180 header-free Q + 180 header-free S PNGs saved to public/assets/mocks/${testCfg.assetFolder}`);
}

function buildCatalogFile(results) {
  const lines = [];
  lines.push(`import type { MockTestRecord, TestQuestionRecord } from '../types';`);
  lines.push(`import { getDefaultExamInstructions } from '../utils/examPresets';`);
  lines.push('');
  lines.push(`type NeetSubject = 'Physics' | 'Chemistry' | 'Botany' | 'Zoology';`);
  lines.push(`type NeetCompactTuple = [number, NeetSubject, string, number, 0 | 1 | 2 | 3];`);
  lines.push('');
  lines.push(`const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;`);
  lines.push('');
  lines.push(`function buildNeetQuestions(params: {`);
  lines.push(`  testId: string;`);
  lines.push(`  prefix: string;`);
  lines.push(`  assetFolder: string;`);
  lines.push(`  testLabel: string;`);
  lines.push(`  specs: NeetCompactTuple[];`);
  lines.push(`}): TestQuestionRecord[] {`);
  lines.push(`  const { testId, prefix, assetFolder, testLabel, specs } = params;`);
  lines.push(`  return specs.map(([q, subject, chapter, page, ans]) => {`);
  lines.push(`    const num = String(q).padStart(3, '0');`);
  lines.push(`    return {`);
  lines.push(`      id: \`q-\${prefix}-\${num}\`,`);
  lines.push(`      testId,`);
  lines.push(`      questionNumber: q,`);
  lines.push(`      subjectName: subject,`);
  lines.push(`      chapterName: chapter,`);
  lines.push(`      questionType: 'single-mcq',`);
  lines.push(`      questionText: \`\${testLabel} · Q\${q} (\${subject} — \${chapter}). Refer to the cropped question image.\`,`);
  lines.push(`      questionImageUrl: \`/assets/mocks/\${assetFolder}/q\${num}.png\`,`);
  lines.push(`      optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'],`);
  lines.push(`      correctOptionIndices: [ans],`);
  lines.push(`      solutionText: \`Correct Option: (\${OPTION_LETTERS[ans]}). Refer to the cropped NCERT solution for \${subject} — \${chapter}.\`,`);
  lines.push(`      solutionImageUrl: \`/assets/mocks/\${assetFolder}/s\${num}.png\`,`);
  lines.push(`      sourcePageNumber: page,`);
  lines.push(`      positiveMarks: 4,`);
  lines.push(`      negativeMarks: 1,`);
  lines.push(`      testStatus: 'published',`);
  lines.push(`    };`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push('');

  const testExportNames = [];
  const qExportNames = [];

  for (const { cfg, specs } of results) {
    // Derive unique chapter list per subject
    const subjectsOrder = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    const syllabus = subjectsOrder.map((subj) => {
      const seen = new Set();
      const chapters = [];
      for (const s of specs) {
        if (s.subject === subj && !seen.has(s.chapter)) {
          seen.add(s.chapter);
          chapters.push(s.chapter);
        }
      }
      return { subject: subj, chapters };
    });

    const recordName = `NEET_MOCK_TEST_${cfg.num}_RECORD`;
    const specsName = `NEET_MOCK_TEST_${cfg.num}_SPECS`;
    const questionsName = `NEET_MOCK_TEST_${cfg.num}_QUESTIONS`;
    testExportNames.push(recordName);
    qExportNames.push(questionsName);

    lines.push(`export const ${recordName}: MockTestRecord = {`);
    lines.push(`  id: ${JSON.stringify(cfg.id)},`);
    lines.push(`  title: ${JSON.stringify(cfg.title)},`);
    lines.push(`  slug: ${JSON.stringify(cfg.slug)},`);
    lines.push(`  seoDescription: ${JSON.stringify(cfg.seoDescription)},`);
    lines.push(`  destination: 'cbt-mock',`);
    lines.push(`  cohortId: 'class-12-neet',`);
    lines.push(`  cohortIds: ['class-12-neet', 'neet-dropper'],`);
    lines.push(`  examCategory: 'NEET (UG) Full Syllabus Mock Test (NTA Pattern)',`);
    lines.push(`  examType: 'NEET UG',`);
    lines.push(`  syllabus: ${JSON.stringify(syllabus, null, 2).replace(/\n/g, '\n  ')},`);
    lines.push(`  instructions: getDefaultExamInstructions({`);
    lines.push(`    examType: 'NEET UG',`);
    lines.push(`    durationMinutes: 180,`);
    lines.push(`    positiveMarks: 4,`);
    lines.push(`    negativeMarks: 1,`);
    lines.push(`    negativeMarkingEnabled: true,`);
    lines.push(`    totalQuestions: 180,`);
    lines.push(`  }),`);
    lines.push(`  subjectRanges: [`);
    lines.push(`    { subjectName: 'Physics', startQ: 1, endQ: 45 },`);
    lines.push(`    { subjectName: 'Chemistry', startQ: 46, endQ: 90 },`);
    lines.push(`    { subjectName: 'Botany', startQ: 91, endQ: 135 },`);
    lines.push(`    { subjectName: 'Zoology', startQ: 136, endQ: 180 },`);
    lines.push(`  ],`);
    lines.push(`  totalQuestions: 180,`);
    lines.push(`  totalMarks: 720,`);
    lines.push(`  durationMinutes: 180,`);
    lines.push(`  positiveMarks: 4,`);
    lines.push(`  negativeMarks: 1,`);
    lines.push(`  negativeMarkingEnabled: true,`);
    lines.push(`  showSolutionsAfterSubmit: true,`);
    lines.push(`  status: 'published',`);
    lines.push(`  createdAtIso: ${JSON.stringify(cfg.createdAtIso)},`);
    lines.push(`};`);
    lines.push('');

    lines.push(`const ${specsName}: NeetCompactTuple[] = [`);
    for (const s of specs) {
      lines.push(
        `  [${s.q}, ${JSON.stringify(s.subject)}, ${JSON.stringify(s.chapter)}, ${s.page}, ${s.ans}],`
      );
    }
    lines.push(`];`);
    lines.push('');
    lines.push(`export const ${questionsName}: TestQuestionRecord[] = buildNeetQuestions({`);
    lines.push(`  testId: ${JSON.stringify(cfg.id)},`);
    lines.push(`  prefix: ${JSON.stringify(cfg.prefix)},`);
    lines.push(`  assetFolder: ${JSON.stringify(cfg.assetFolder)},`);
    lines.push(`  testLabel: ${JSON.stringify(`NEET (UG) Mock Test 0${cfg.num}`)},`);
    lines.push(`  specs: ${specsName},`);
    lines.push(`});`);
    lines.push('');
  }

  lines.push(`export const NEET_FULL_MOCK_TESTS: MockTestRecord[] = [`);
  for (const name of testExportNames) lines.push(`  ${name},`);
  lines.push(`];`);
  lines.push('');
  lines.push(`export const NEET_FULL_MOCK_QUESTIONS: TestQuestionRecord[] = [`);
  for (const name of qExportNames) lines.push(`  ...${name},`);
  lines.push(`];`);
  lines.push('');

  const outPath = path.join(ROOT, 'src/data/neetMockTestsCatalog.ts');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`\nGenerated ${outPath} with ${results.length} NEET tests (${results.length * 180} questions).`);
}

async function main() {
  const force = process.argv.includes('--force');
  const results = [];
  for (const cfg of NEET_TESTS) {
    const meta = await parseNeetPdfMetadata(cfg.pdfRelPath);
    const outDir = path.join(ROOT, 'public/assets/mocks', cfg.assetFolder);
    const existingCount = fs.existsSync(outDir)
      ? fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).length
      : 0;
    if (!force && existingCount === 360) {
      console.log(`Skipping ${cfg.assetFolder} (already has 360 PNGs)`);
    } else {
      cropNeetPdfImages(cfg, meta);
    }
    results.push({ cfg, specs: meta.specs });
  }
  buildCatalogFile(results);
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.rmSync('/tmp/neet_probe', { recursive: true, force: true });
  console.log(`\nAll ${results.length} NEET (UG) Mock Tests cropped & cataloged cleanly!`);
  process.exit(0);
}

main().catch((err) => {
  console.error('NEET cropper failed:', err);
  process.exit(1);
});
