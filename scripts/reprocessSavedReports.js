require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ReportAnalyzer = require('../reportAnalyzer');
const labAnalyzer = require('../services/labAnalyzer');

async function main() {
  const reportsDir = path.join(__dirname, '..', 'reports');
  const analyzer = new ReportAnalyzer();

  const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} report(s) in ${reportsDir}`);

  for (const file of files) {
    const full = path.join(reportsDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      const analysis = data.analysis || {};
      // If there's already a labAnalysis with result.explanations, skip
      if (analysis.labAnalysis && analysis.labAnalysis.result && (analysis.labAnalysis.result.explanations || analysis.labAnalysis.result.raw_assistant)) {
        console.log(`Skipping ${file} — already has labAnalysis.`);
        continue;
      }

      // Try to reconstruct a text input from saved fields
      const textParts = [];
      if (analysis.findings) textParts.push(analysis.findings);
      if (analysis.summary) textParts.push(analysis.summary);
      if (analysis.terms) textParts.push(analysis.terms);
      const reconstructed = textParts.join('\n\n');

      // Parse lab values locally
      const parsed = labAnalyzer.parseLabValues(reconstructed);
      const assessments = [];
      for (const k of Object.keys(parsed)) {
        const v = parsed[k];
        const a = labAnalyzer.assessValue(k, v, data.analysis && data.analysis.patientMeta ? data.analysis.patientMeta : {});
        assessments.push(a);
      }

      const labAnalysis = {
        method: 'local-only-reprocessed',
        result: {
          parsed,
          explanations: assessments.map(a => ({ key: a.key, explanation: (a.status === 'normal') ? `Your ${a.key} is within the normal range.` : `Your ${a.key} is ${a.status} (value ${a.value}). Severity: ${a.severity}.` , severity: a.severity })),
          action_items: assessments.filter(a => a.severity === 'severe').map(a => `URGENT: see a doctor for ${a.key}`),
          questions: ['Please consult your doctor for interpretation.']
        },
        assessments
      };

      // Attach and save using analyzer.saveReport to maintain format
      const newAnalysis = Object.assign({}, data.analysis || {});
      newAnalysis.labAnalysis = labAnalysis;
      // keep patientMeta if present
      if (data.analysis && data.analysis.patientMeta) newAnalysis.patientMeta = data.analysis.patientMeta;

      // Use the existing saveReport to write a normalized file (it will create new id)
      const reportId = file.replace(/\.json$/, '');
      // Write directly to the file (preserve id and timestamp)
      data.analysis = newAnalysis;
      fs.writeFileSync(full, JSON.stringify(data, null, 2));
      console.log(`Updated ${file} with local labAnalysis.`);
    } catch (e) {
      console.error(`Error processing ${file}:`, e && e.message ? e.message : e);
    }
  }
}

if (require.main === module) main();
