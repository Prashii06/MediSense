// scripts/testWatson.js
// Simple test runner for services/labAnalyzer.js

require('dotenv').config();
const { analyzeLabReport, parseLabValues } = require('../services/labAnalyzer');

async function run() {
  // Check env vars first
  const missing = [];
  if (!process.env.WATSON_URL) missing.push('WATSON_URL');
  if (!process.env.WATSON_APIKEY) missing.push('WATSON_APIKEY');
  if (!process.env.WATSON_DEPLOYMENT_ID) missing.push('WATSON_DEPLOYMENT_ID');

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Create a `.env` file (not committed) or set environment variables. You can copy from `.env.example`.');
    process.exitCode = 2;
    return;
  }

  const sampleText = `Patient: John Doe\nHemoglobin: 8.9 g/dL\nPlatelets: 220\nFasting Glucose: 92 mg/dL`;

  console.log('\n--- Parsed lab values (local parse) ---');
  try {
    const parsed = parseLabValues(sampleText);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.error('Local parsing failed:', e && e.message ? e.message : e);
  }

  console.log('\n--- Calling analyzeLabReport (this will call watsonx) ---');
  try {
    const out = await analyzeLabReport(sampleText, { name: 'John Doe', age: 45, sex: 'male' });
    console.log('\n--- Assessments ---');
    console.log(JSON.stringify(out.assessments, null, 2));
    console.log('\n--- Result (watson output or fallback) ---');
    console.log(JSON.stringify(out.result, null, 2));
  } catch (err) {
    console.error('analyzeLabReport failed:', err && err.message ? err.message : err);
    if (err.response && err.response.data) {
      console.error('Remote response data:', JSON.stringify(err.response.data, null, 2));
    }
    process.exitCode = 3;
  }
}

run();
