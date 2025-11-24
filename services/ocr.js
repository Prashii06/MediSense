const fs = require('fs');
const path = require('path');
const os = require('os');
const child_process = require('child_process');
const { createWorker } = require('tesseract.js');
const pdfParse = require('pdf-parse');

async function ocrImageBuffer(buffer, lang = 'eng') {
  const worker = createWorker({
    logger: () => {}, // Disables logging
  });
  try {
    await worker.load();
    await worker.loadLanguage(lang);
    await worker.initialize(lang);
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return text;
  } catch (e) {
    try { await worker.terminate(); } catch (_) {}
    throw e;
  }
}

function hasPdfToppm() {
  try {
    const res = child_process.spawnSync('pdftoppm', ['-v'], { stdio: 'ignore' });
    return res.status === 0 || res.status === null || res.status === undefined;
  } catch (e) {
    return false;
  }
}

function runPdftoppmToPng(pdfPath, outDir, dpi = 300) {
  // Generate PNGs named outprefix-1.png, outprefix-2.png, ...
  const outPrefix = path.join(outDir, 'page');
  const args = ['-png', '-r', String(dpi), pdfPath, outPrefix];
  child_process.execFileSync('pdftoppm', args, { stdio: 'ignore' });
  // Collect generated pngs
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.png')).map(f => path.join(outDir, f));
  files.sort();
  return files;
}

async function ocrMultipleImages(imagePaths, lang = 'eng') {
  const texts = [];
  for (const imgPath of imagePaths) {
    const buf = fs.readFileSync(imgPath);
    const t = await ocrImageBuffer(buf, lang);
    texts.push(t);
  }
  return texts.join('\n');
}

/**
 * Extract text from a file. Supports:
 * - searchable PDFs via `pdf-parse`
 * - image files (png/jpg/tiff) via Tesseract
 * - scanned PDFs: if `pdf-parse` returns no text, this will try to extract images
 *   using `pdf-parse` page buffers (best-effort) and run OCR on them.
 * Note: For robust PDF -> image conversion you may want Poppler (`pdftoppm`) installed;
 * this helper makes a best-effort extraction without external binaries.
 */
async function extractTextFromFile(filePath, opts = {}) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // If it's a PDF, try pdf-parse first (searchable PDF)
  if (ext === '.pdf') {
    try {
      const parsed = await pdfParse(buffer);
      const txt = (parsed && parsed.text) ? parsed.text.trim() : '';
      if (txt && txt.length > 20) return txt;

      // If no text extracted, attempt simple OCR per-page using raw page buffers
      // If pdftoppm is available, convert to PNGs and OCR each page (better accuracy)
      if (hasPdfToppm()) {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aireport-'));
        let tmpPdf = null;
        try {
          // write buffer to a temp pdf file for pdftoppm to consume
          tmpPdf = path.join(tmp, 'input.pdf');
          fs.writeFileSync(tmpPdf, buffer);
          const pngs = runPdftoppmToPng(tmpPdf, tmp, opts.dpi || 300);
          const ocrText = await ocrMultipleImages(pngs, opts.lang || 'eng');
          // cleanup
          try { pngs.forEach(p => fs.unlinkSync(p)); } catch (_) {}
          try { if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf); } catch (_) {}
          try { fs.rmdirSync(tmp); } catch (_) {}
          if (ocrText && ocrText.trim().length > 0) return ocrText;
        } catch (e) {
          // fall back to single-buffer OCR below
          try { if (tmpPdf && fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf); } catch (_) {}
          try { fs.rmdirSync(tmp); } catch (_) {}
        }
      }

      // Best-effort: run OCR on the entire PDF buffer
      try {
        const ocrResult = await ocrImageBuffer(buffer, opts.lang || 'eng');
        if (ocrResult && ocrResult.trim().length > 0) return ocrResult;
      } catch (e) {
        // fall through to error below
      }

      return '';
    } catch (e) {
      // pdf-parse failed; fall through to image OCR attempt
    }
  }

  // For image files, pass buffer directly to Tesseract
  if (['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp'].includes(ext)) {
    return ocrImageBuffer(buffer, opts.lang || 'eng');
  }

  // Generic fallback: try OCR on the raw buffer
  try {
    return await ocrImageBuffer(buffer, opts.lang || 'eng');
  } catch (e) {
    return '';
  }
}

module.exports = { extractTextFromFile };
