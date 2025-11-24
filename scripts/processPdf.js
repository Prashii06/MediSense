require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ReportAnalyzer = require('../reportAnalyzer');

async function requirePdfParse() {
  try {
    return require('pdf-parse');
  } catch (e) {
    console.error("Missing dependency: 'pdf-parse'. Please run: npm install pdf-parse");
    process.exit(1);
  }
}

function usage() {
  console.log('Usage: node scripts/processPdf.js <file> [--userId=<id>]');
  console.log('  <file> can be a .pdf or .txt file containing the report text.');
  process.exit(1);
}

function extractPatientMeta(text) {
  const meta = {};
  const reName = /Patient Name:\s*(.+)/i;
  const reDob = /Date of Birth:\s*(.+)/i;
  const reSex = /Sex:\s*(Male|Female|Other)/i;
  const reAge = /\((\d+) years\)/i;

  const mName = text.match(reName);
  if (mName) meta.name = mName[1].trim();
  const mDob = text.match(reDob);
  if (mDob) meta.dob = mDob[1].trim();
  const mSex = text.match(reSex);
  if (mSex) meta.sex = mSex[1].trim();
  const mAge = text.match(reAge);
  if (mAge) meta.age = parseInt(mAge[1], 10);
  return meta;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) return usage();

  const fileArg = argv[0];
  const userIdArg = argv.find(a => a.startsWith('--userId='));
  const userId = userIdArg ? userIdArg.split('=')[1] : 'script-user';

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  let text = '';
  if (filePath.toLowerCase().endsWith('.pdf')) {
    const pdfParse = await requirePdfParse();
    const data = fs.readFileSync(filePath);
    console.log('Extracting text from PDF...');
    const parsed = await pdfParse(data);
    text = parsed.text || '';

    // If no searchable text was found, attempt OCR fallback
    if (!text || text.trim().length === 0) {
      console.log('No searchable text found in PDF — attempting OCR fallback (may be slower)...');
      try {
        const { extractTextFromFile } = require('../services/ocr');
        const ocrText = await extractTextFromFile(filePath);
        if (ocrText && ocrText.trim().length > 0) {
          text = ocrText;
        }
      } catch (e) {
        console.warn('OCR fallback failed or not available:', e.message || e);
      }
    }
  } else {
    // treat as plain text
    text = fs.readFileSync(filePath, 'utf8');
  }

  if (!text || text.trim().length === 0) {
    console.warn('No text extracted from file. Saving a placeholder report so frontend can show an informative message.');

    // Create a minimal analysis object so a report is saved and the frontend can show a helpful message
    const analyzer = new ReportAnalyzer();
    const filename = path.basename(filePath);
    const analysis = {
      summary: 'Unable to extract text from this file type. Please upload a plain text or searchable PDF. Raw file saved.',
      findings: 'Entracted text.',
      recommendations: 'Please download the original file and re-upload a searchable PDF or plain text file, or contact support for assistance.',
      terms: 'No extractable medical terms.',
      diagnosis: null,
      medications: null,
      medicationInstructions: null,
      alternativeMedications: null,
      originalText: '',
      filename
    };

    // Attach patient meta if any
    analysis.patientMeta = {};

    const reportId = uuidv4();
    await analyzer.saveReport(userId, analysis, reportId);
    const outPath = path.join(analyzer.reportsDir, `${reportId}.json`);
    console.log('Saved placeholder report to:', outPath);
    return;
  }

  const patientMeta = extractPatientMeta(text);

  console.log('Patient meta extracted:', patientMeta);

  const analyzer = new ReportAnalyzer();

  const noWatson = argv.includes('--noWatson') || argv.includes('--no-watson');

  console.log(noWatson ? 'Dry run: parsing locally without calling Watson.' : 'Analyzing report and calling lab analyzer (this may call your watsonx endpoint)...');

  try {
    const filename = path.basename(filePath);

    let analysis;
    if (noWatson) {
      // Attempt to use the local lab parser if available, otherwise fall back to a simple regex parse.
      let parsed = null;
      try {
        const LabAnalyzer = require('../services/labAnalyzer');
        if (LabAnalyzer && typeof LabAnalyzer.parseLabValues === 'function') {
          parsed = LabAnalyzer.parseLabValues(text);
        }
      } catch (e) {
        // ignore - will use fallback
      }

      if (!parsed) {
        // Simple fallback parser for common labs (hemoglobin, platelets, glucose fasting, hba1c)
        parsed = {};
        const simpleNumber = (re) => {
          const m = text.match(re);
          if (!m) return null;
          const val = m[1].replace(/,/g, '').trim();
          const num = parseFloat(val);
          return Number.isFinite(num) ? num : null;
        };
        parsed.hemoglobin = simpleNumber(/Hemoglobin \(Hb\)\s*([0-9]+\.?[0-9]*)/i) || simpleNumber(/Hb\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i);
        parsed.platelet = simpleNumber(/Platelets\s*([0-9,]+)\s*\/?μ?L/i) || simpleNumber(/Platelets\s*([0-9,]+)/i);
        parsed.fasting_glucose = simpleNumber(/Fasting Glucose\s*([0-9]+\.?[0-9]*)/i) || simpleNumber(/Glucose\s*([0-9]+\.?[0-9]*)/i);
        parsed.hba1c = simpleNumber(/HbA1c\s*([0-9]+\.?[0-9]*)/i);
      }

      // Use the existing analyzer to produce the base analysis (summary, findings, etc.)
      analysis = analyzer.analyzeReport(text, filename);
      analysis.patientMeta = patientMeta;
      analysis.labAnalysis = {
        method: 'local-only',
        result: {
          parsed,
          note: 'Parsed locally without calling Watson. Use full run (no --noWatson) to call your watsonx endpoint.'
        }
      };

      const reportId = uuidv4();
      await analyzer.saveReport(userId, analysis, reportId);
      const outPath = path.join(analyzer.reportsDir, `${reportId}.json`);
      console.log('Saved local-only report to:', outPath);
      console.log('Parsed values:', parsed);
      return;
    }

    // Normal run: call the analyzer which includes lab analyzer and may call Watson
    analysis = await analyzer.analyzeReportWithLabs(text, filename, patientMeta);

    const reportId = uuidv4();
    await analyzer.saveReport(userId, analysis, reportId);

    const outPath = path.join(analyzer.reportsDir, `${reportId}.json`);
    console.log('Saved report to:', outPath);
    console.log('Summary:');
    console.log('  reportId:', reportId);
    console.log('  filename:', filename);
    if (analysis.labAnalysis && analysis.labAnalysis.result) {
      console.log('  labAnalysis keys:', Object.keys(analysis.labAnalysis.result));
    } else {
      console.log('  labAnalysis: none (check logs or watson config)');
    }
  } catch (err) {
    console.error('Error analyzing report:', err.message || err);
    console.error(err.stack || '');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractPatientMeta };
