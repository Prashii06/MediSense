#!/usr/bin/env node

/**
 * System Diagnostic Tool
 * Checks configuration and dependencies for MedExplain AI
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(title, 'bright');
  log('='.repeat(60), 'cyan');
}

function checkPass(message) {
  log(`✓ ${message}`, 'green');
}

function checkWarn(message) {
  log(`⚠ ${message}`, 'yellow');
}

function checkFail(message) {
  log(`✗ ${message}`, 'red');
}

async function diagnose() {
  log('\nMedExplain AI System Diagnostic Tool', 'bright');
  log('====================================\n', 'bright');

  let issues = 0;
  let warnings = 0;

  // Check Node.js version
  section('Node.js Environment');
  const nodeVersion = process.version;
  log(`Node.js version: ${nodeVersion}`);
  if (parseInt(nodeVersion.slice(1)) >= 14) {
    checkPass('Node.js version is compatible');
  } else {
    checkFail('Node.js version too old. Require v14 or higher');
    issues++;
  }

  // Check required dependencies
  section('Required Dependencies');
  const requiredDeps = [
    'express',
    'multer',
    'pdf-parse',
    'dotenv',
    'uuid',
    'axios',
    'ibm-cos-sdk',
    'tesseract.js'
  ];

  for (const dep of requiredDeps) {
    try {
      require.resolve(dep);
      checkPass(`${dep} installed`);
    } catch (e) {
      if (dep === 'tesseract.js' && process.env.ENABLE_OCR !== 'true') {
        checkWarn(`${dep} not installed (OCR disabled, optional)`);
        warnings++;
      } else {
        checkFail(`${dep} not installed. Run: npm install ${dep}`);
        issues++;
      }
    }
  }

  // Check directory structure
  section('Directory Structure');
  const requiredDirs = ['uploads', 'reports', 'public', 'protected'];
  for (const dir of requiredDirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      checkPass(`${dir}/ directory exists`);
    } else {
      checkWarn(`${dir}/ directory missing (will be created automatically)`);
      warnings++;
    }
  }

  // Check OCR configuration
  section('OCR Configuration');
  if (process.env.ENABLE_OCR === 'true') {
    checkPass('OCR is enabled');
    log(`OCR language: ${process.env.OCR_LANG || 'eng (default)'}`);
    
    try {
      require.resolve('tesseract.js');
      checkPass('tesseract.js installed');
    } catch (e) {
      checkFail('tesseract.js not installed. Run: npm install tesseract.js');
      issues++;
    }
  } else {
    checkWarn('OCR is disabled (image files will not be processed)');
    warnings++;
  }

  // Check Watson configuration
  section('Watson AI Configuration');
  const watsonPredictionUrl = process.env.WATSON_PREDICTION_URL;
  const watsonUrl = process.env.WATSON_URL;
  const watsonDeploymentId = process.env.WATSON_DEPLOYMENT_ID;
  const watsonApiKey = process.env.WATSON_APIKEY;
  const watsonAuthFlow = process.env.WATSON_AUTH_FLOW || 'apikey';

  if (watsonPredictionUrl) {
    checkPass('WATSON_PREDICTION_URL is set');
    log(`  URL: ${watsonPredictionUrl.substring(0, 50)}...`);
  } else if (watsonUrl && watsonDeploymentId) {
    checkPass('WATSON_URL and WATSON_DEPLOYMENT_ID are set');
    log(`  URL: ${watsonUrl}`);
    log(`  Deployment: ${watsonDeploymentId}`);
  } else {
    checkFail('Watson endpoint not configured');
    log('  Set either:');
    log('  - WATSON_PREDICTION_URL');
    log('  OR');
    log('  - WATSON_URL + WATSON_DEPLOYMENT_ID');
    issues++;
  }

  if (watsonApiKey) {
    checkPass('WATSON_APIKEY is set');
    log(`  Auth flow: ${watsonAuthFlow}`);
  } else {
    checkFail('WATSON_APIKEY not set');
    issues++;
  }

  // Check COS configuration
  section('IBM Cloud Object Storage');
  if (process.env.ENABLE_COS_UPLOAD === 'true') {
    checkPass('COS upload is enabled');
    
    const cosEndpoint = process.env.COS_ENDPOINT;
    const cosApiKey = process.env.COS_API_KEY_ID;
    const cosInstanceId = process.env.COS_RESOURCE_INSTANCE_ID;
    const cosBucket = process.env.COS_BUCKET;

    if (cosEndpoint) {
      checkPass('COS_ENDPOINT is set');
      log(`  Endpoint: ${cosEndpoint}`);
    } else {
      checkFail('COS_ENDPOINT not set');
      issues++;
    }

    if (cosApiKey) {
      checkPass('COS_API_KEY_ID is set');
    } else {
      checkFail('COS_API_KEY_ID not set');
      issues++;
    }

    if (cosInstanceId) {
      checkPass('COS_RESOURCE_INSTANCE_ID is set');
    } else {
      checkFail('COS_RESOURCE_INSTANCE_ID not set');
      issues++;
    }

    if (cosBucket) {
      checkPass('COS_BUCKET is set');
      log(`  Bucket: ${cosBucket}`);
    } else {
      checkFail('COS_BUCKET not set');
      issues++;
    }

    // Test COS connection
    if (cosEndpoint && cosApiKey && cosInstanceId && cosBucket) {
      try {
        log('\nTesting COS connection...');
        const cos = require('../services/cos');
        const testKey = `diagnostic-test-${Date.now()}.txt`;
        const testBody = Buffer.from('Diagnostic test');
        
        await cos.uploadObject(cosBucket, testKey, testBody, 'text/plain');
        checkPass('COS connection successful');
      } catch (e) {
        checkFail(`COS connection failed: ${e.message}`);
        issues++;
      }
    }
  } else {
    checkWarn('COS upload is disabled');
    warnings++;
  }

  // Check file persistence
  section('File Storage');
  if (process.env.PERSIST_ORIGINALS === 'true') {
    checkPass('Original file persistence enabled');
    const originalsDir = path.join(__dirname, '..', 'uploads', 'originals');
    if (fs.existsSync(originalsDir)) {
      checkPass('Originals directory exists');
    } else {
      checkWarn('Originals directory will be created on first use');
      warnings++;
    }
  } else {
    checkWarn('Original files will not be persisted (reprocessing unavailable)');
    warnings++;
  }

  // Test Watson connection
  section('Watson AI Connection Test');
  if (watsonApiKey && (watsonPredictionUrl || (watsonUrl && watsonDeploymentId))) {
    try {
      log('Testing Watson connection...');
      const { analyzeLabReport } = require('../services/labAnalyzer');
      const testText = 'Hemoglobin: 12.5 g/dL\nGlucose: 95 mg/dL';
      const result = await analyzeLabReport(testText, { age: 35, sex: 'Male' });
      
      if (result && result.result) {
        checkPass('Watson connection successful');
        log('  Sample response received');
      } else {
        checkWarn('Watson returned empty response');
        warnings++;
      }
    } catch (e) {
      checkFail(`Watson connection failed: ${e.message}`);
      issues++;
    }
  } else {
    checkWarn('Skipping Watson test (not configured)');
    warnings++;
  }

  // Summary
  section('Summary');
  log(`\nTotal checks: ${issues + warnings} issues/warnings found`);
  
  if (issues === 0 && warnings === 0) {
    log('✓ All systems operational!', 'green');
  } else if (issues === 0) {
    log(`⚠ ${warnings} warnings (system will work with limitations)`, 'yellow');
  } else {
    log(`✗ ${issues} critical issues found`, 'red');
    if (warnings > 0) {
      log(`⚠ ${warnings} additional warnings`, 'yellow');
    }
  }

  log('\nRecommendations:', 'bright');
  if (issues > 0) {
    log('1. Fix critical issues listed above');
    log('2. Review .env.example for required variables');
    log('3. Run: npm install (to install missing dependencies)');
  }
  if (warnings > 0 && issues === 0) {
    log('1. Enable optional features for full functionality');
    log('2. Review warnings above for improvements');
  }
  if (issues === 0 && warnings === 0) {
    log('1. System ready to use!');
    log('2. Start with: npm start');
  }

  log('\nFor more help, see TROUBLESHOOTING.md\n');
  
  process.exit(issues > 0 ? 1 : 0);
}

// Run diagnostics
diagnose().catch(err => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});