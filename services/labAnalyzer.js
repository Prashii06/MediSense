// services/labAnalyzer.js
// Lab parsing + rule engine + watsonx.ai prompt + call wrapper

// Load environment variables so this module can detect watsonx configuration
require('dotenv').config();
const axios = require('axios');
const thresholds = require('../config/labThresholds');

// Utility: normalize text for easier parsing
function normalizeText(s) {
  return (s || '').replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ').toLowerCase();
}

// Simple extraction patterns for common tests (expandable)
const patterns = [
  // Allow some non-digit characters between the test name and the value (e.g. "Hemoglobin (Hb) 10.8 g/dL")
  { key: 'hemoglobin', names: ['hemoglobin', 'hb', 'h b', 'hb.'], regex: /(?:hemoglobin|hgb|hb)[^0-9]{0,20}(\d+(?:\.\d+)?)/i },
  // Platelet counts often include commas (e.g. 220,000)
  { key: 'platelet', names: ['platelet', 'platelets', 'plt'], regex: /(?:platelet(?:s)?|plt)[^0-9]{0,20}([0-9,]+(?:\.\d+)?)/i },
  { key: 'glucose_fasting', names: ['glucose', 'fasting glucose', 'fbs', 'blood sugar fasting'], regex: /(?:fasting glucose|glucose|fbs)[^0-9]{0,20}(\d+(?:\.\d+)?)/i }
  // Add more patterns as needed
];

function parseLabValues(text) {
  const norm = normalizeText(text);
  const found = {};

  for (const p of patterns) {
    const m = norm.match(p.regex);
    if (m) {
      // Remove commas for platelet-like numbers before parsing
      const raw = String(m[1]).replace(/,/g, '');
      found[p.key] = parseFloat(raw);
    }
  }
  return found;
}

// Determine severity relative to threshold config
function assessValue(key, value, patientMeta = {}) {
  const conf = thresholds[key];
  if (!conf) return { key, value, status: 'unknown', severity: 'unknown', note: 'No threshold configured' };

  // support sex-specific thresholds (example)
  const sex = (patientMeta.sex || '').toLowerCase();
  let normalLow = conf.normalLow;
  let normalHigh = conf.normalHigh;

  if (conf[sex]) {
    normalLow = conf[sex].normalLow ?? normalLow;
    normalHigh = conf[sex].normalHigh ?? normalHigh;
  }

  // determine whether lower-is-bad (e.g., hemoglobin) or higher-is-bad (e.g., glucose)
  const lowerIsBad = typeof normalLow === 'number' && typeof normalHigh === 'number' && value < (normalLow || Number.POSITIVE_INFINITY);

  let severity = 'normal';
  let status = 'normal';

  if (lowerIsBad) {
    const pct = value / normalLow;
    if (pct < (conf.severity.severe ?? 0.7)) {
      severity = 'severe';
      status = 'low';
    } else if (pct < (conf.severity.moderate ?? 0.85)) {
      severity = 'moderate';
      status = 'low';
    } else if (pct < 1.0) {
      severity = 'mild';
      status = 'low';
    } else {
      severity = 'normal';
      status = 'normal';
    }
  } else {
    // higher-is-bad
    if (normalHigh != null && value > normalHigh) {
      const ratio = value / normalHigh;
      if (ratio > (conf.severity.severe ?? 1.5)) {
        severity = 'severe';
        status = 'high';
      } else if (ratio > (conf.severity.moderate ?? 1.2)) {
        severity = 'moderate';
        status = 'high';
      } else {
        severity = 'mild';
        status = 'high';
      }
    } else {
      severity = 'normal';
      status = 'normal';
    }
  }

  return {
    key,
    value,
    unit: conf.unit || '',
    normalRange: { low: normalLow, high: normalHigh },
    status,
    severity
  };
}

// Create prompt for watsonx.ai
function createWatsonPrompt(parsedResults, patientMeta = {}) {
  const lines = [];
  lines.push('You are a helpful, concise medical assistant that explains lab results in plain language for patients.');
  lines.push('Do NOT provide definitive diagnoses. Always recommend seeing a doctor for serious or severe findings.');
  lines.push('');
  lines.push('Patient metadata:');
  lines.push(JSON.stringify(patientMeta));
  lines.push('');
  lines.push('Lab results:');
  for (const r of parsedResults) {
    lines.push(`- ${r.key}: ${r.value} ${r.unit || ''} (normal range: ${r.normalRange.low}-${r.normalRange.high} ${r.unit || ''}). Status: ${r.status}, severity: ${r.severity}`);
  }
  lines.push('');
  lines.push('Task:');
  lines.push('1) For each lab item provide a 1-2 sentence plain-language explanation of what the result means for the patient.');
  lines.push('2) If severity is moderate or severe, clearly say "URGENT: see a doctor" or similar and list 2 immediate actions.');
  lines.push('3) Provide 3 suggested questions the patient may ask their doctor about these results.');
  lines.push('');
  lines.push('Format the output as JSON with keys: "explanations" (array of {key, explanation, severity}), "action_items" (array), "questions" (array).');
  lines.push('');
  lines.push('Be brief and use non-technical language suitable for patients.');
  lines.push('');
  return lines.join('\n');
}

// watsonx.ai call wrapper with support for both 'apikey' (basic) and 'iam' flows.
// Use `WATSON_PREDICTION_URL` to override the default prediction URL if you have a full endpoint.
let _iamTokenCache = { token: null, expiresAt: 0 };

async function getIamToken() {
  const now = Date.now();
  if (_iamTokenCache.token && _iamTokenCache.expiresAt - 60000 > now) {
    return _iamTokenCache.token; // cached and still valid (1 min margin)
  }

  const iamUrl = process.env.WATSON_IAM_URL || 'https://iam.cloud.ibm.com/identity/token';
  const apikey = process.env.WATSON_APIKEY;
  if (!apikey) throw new Error('WATSON_APIKEY is required for IAM auth');

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
  params.append('apikey', apikey);

  const resp = await axios.post(iamUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const data = resp.data;
  if (!data || !data.access_token) throw new Error('Failed to obtain IAM token');

  _iamTokenCache.token = data.access_token;
  // data.expires_in is in seconds
  _iamTokenCache.expiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600 * 1000);
  return _iamTokenCache.token;
}

async function callWatsonx(prompt) {
  // allow full custom url override
  const predictionUrl = process.env.WATSON_PREDICTION_URL || null;

  const deploymentId = process.env.WATSON_DEPLOYMENT_ID;
  const baseUrl = process.env.WATSON_URL;

  if (!predictionUrl && (!baseUrl || !deploymentId)) {
    throw new Error('Either WATSON_PREDICTION_URL or (WATSON_URL and WATSON_DEPLOYMENT_ID) must be set');
  }

  const url = predictionUrl || `${baseUrl.replace(/\/$/, '')}/v1/deployments/${deploymentId}/predictions`;
  const requestBody = { input: { text: prompt } };

  // If this is a chat endpoint, prefer sending a chat-style payload first
  const isChatEndpoint = url.includes('/text/chat') || (process.env.WATSON_REQUEST_STYLE || '').toLowerCase() === 'chat';

  // choose auth flow: 'apikey' (basic auth) or 'iam' (exchange api key for IAM token)
  const flow = (process.env.WATSON_AUTH_FLOW || 'apikey').toLowerCase();

  const axiosOpts = { headers: { 'Content-Type': 'application/json' } };

  if (flow === 'iam') {
    const token = await getIamToken();
    axiosOpts.headers['Authorization'] = `Bearer ${token}`;
  } else {
    // default: try basic apikey auth (username=apikey, password=<key>)
    if (!process.env.WATSON_APIKEY) throw new Error('WATSON_APIKEY is required for apikey auth');
    axiosOpts.auth = { username: 'apikey', password: process.env.WATSON_APIKEY };
  }

  try {
    if (isChatEndpoint) {
      // include the system instruction inside the user content to avoid 'system' role rejection
      const systemInstruction = 'You are a helpful, concise medical assistant that explains lab results in plain language for patients.';
      const chatBody = { messages: [ { role: 'user', content: `${systemInstruction}\n\n${prompt}` } ] };
      const resp = await axios.post(url, chatBody, axiosOpts);
      return resp.data;
    }

    const resp = await axios.post(url, requestBody, axiosOpts);
    return resp.data;
  } catch (err) {
    console.error('Watsonx request failed:', err && err.message ? err.message : err);
    if (err.response && err.response.data) {
      console.error('Watsonx response data:', JSON.stringify(err.response.data));
    }

    // If endpoint looks like a chat endpoint, try an alternate chat-style payload
    try {
      if (url.includes('/text/chat') || (process.env.WATSON_REQUEST_STYLE || '').toLowerCase() === 'chat') {
        try {
          const chatResp = await callWatsonxChatStyle(url, prompt, axiosOpts);
          return chatResp;
        } catch (inner) {
          console.error('Chat-style (role/content) attempt failed:', inner && inner.message ? inner.message : inner);
          if (inner.response && inner.response.data) console.error('Chat-style response:', JSON.stringify(inner.response.data));
          // Try an alternate chat payload shape
          try {
            const altResp = await callWatsonxChatStyleAlt(url, prompt, axiosOpts);
            return altResp;
          } catch (altErr) {
            console.error('Chat-style (alt) attempt failed:', altErr && altErr.message ? altErr.message : altErr);
            if (altErr.response && altErr.response.data) console.error('Chat-style alt response:', JSON.stringify(altErr.response.data));
          }
        }
      }
    } catch (innerErr) {
      // fall through to rethrow outer error
    }

    throw err;
  }

}

// Helper: indicate whether watsonx configuration is present and the service can be called
function isWatsonConfigured() {
  const predictionUrl = process.env.WATSON_PREDICTION_URL || null;
  const deploymentId = process.env.WATSON_DEPLOYMENT_ID;
  const baseUrl = process.env.WATSON_URL;
  const apikey = process.env.WATSON_APIKEY;
  // If a prediction URL is provided, consider configured (apikey still recommended)
  if (predictionUrl) return true;
  // Otherwise require both base URL and deployment id plus an apikey (either for basic or IAM)
  if (baseUrl && deploymentId && apikey) return true;
  return false;
}

// Helper: attempt chat-shaped payload for text/chat endpoints (some Watson deployments expect this)
async function callWatsonxChatStyle(url, prompt, axiosOpts) {
  // common chat-style body (role-based)
  // Some watsonx /text/chat endpoints reject a 'system' role; send only a user message.
  const chatBody = {
    messages: [
      { role: 'user', content: prompt }
    ]
  };

  // some endpoints expect 'application/json' which we already set
  const resp = await axios.post(url, chatBody, axiosOpts);
  return resp.data;
}

// Alternate chat payload format seen in some IBM docs
async function callWatsonxChatStyleAlt(url, prompt, axiosOpts) {
  const altBody = {
    messages: [
      { author: 'system', type: 'text', text: 'You are a helpful, concise medical assistant that explains lab results in plain language for patients.' },
      { author: 'user', type: 'text', text: prompt }
    ]
  };
  const resp = await axios.post(url, altBody, axiosOpts);
  return resp.data;
}

// Helper: extract JSON object from assistant text (strip code fences, find first JSON block)
function extractJsonFromText(s) {
  if (!s || typeof s !== 'string') return null;
  // Remove fenced code blocks but keep inner content
  s = s.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1');
  // Remove inline backticks
  s = s.replace(/`/g, '');

  // Find the first JSON object-looking substring
  const m = s.match(/\{[\s\S]*\}/);
  if (m) {
    const jsonText = m[0];
    try {
      return JSON.parse(jsonText);
    } catch (e) {
      // try to be more forgiving by trimming trailing commas
      const cleaned = jsonText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      try {
        return JSON.parse(cleaned);
      } catch (err) {
        return null;
      }
    }
  }
  return null;
}

/**
 * Main exported function:
 * - rawText: string (text extracted from PDF/image)
 * - patientMeta: { name, age, sex, ... } optional
 */
async function analyzeLabReport(rawText, patientMeta = {}) {
  const parsedMap = parseLabValues(rawText);

  const assessments = [];
  for (const key of Object.keys(parsedMap)) {
    const value = parsedMap[key];
    const ass = assessValue(key, value, patientMeta);
    assessments.push(ass);
  }

  const prompt = createWatsonPrompt(assessments, patientMeta);

  // If watsonx isn't configured, skip the remote call and return a local fallback
  if (!isWatsonConfigured()) {
    const localExplanations = assessments.map(a => {
      const explanation = (a.status === 'normal') ?
        `Your ${a.key} is within the normal range (${a.normalRange.low}-${a.normalRange.high} ${a.unit}).` :
        `Your ${a.key} is ${a.status} (value ${a.value} ${a.unit}). Severity: ${a.severity}. We recommend medical follow-up.`;
      return { key: a.key, explanation, severity: a.severity };
    });
    return {
      assessments,
      result: {
        explanations: localExplanations,
        action_items: assessments.filter(a => a.severity === 'severe').map(a => `URGENT: see a doctor for ${a.key}`),
        questions: ['Please consult a doctor for next steps.']
      },
      rawWatson: null
    };
  }

  let watsonResp;
  try {
    watsonResp = await callWatsonx(prompt);
  } catch (err) {
    console.error('Watsonx call failed:', err && err.message ? err.message : err);
    if (err.response && err.response.data) console.error('Watsonx response data:', JSON.stringify(err.response.data));
    const localExplanations = assessments.map(a => {
      const explanation = (a.status === 'normal') ?
        `Your ${a.key} is within the normal range (${a.normalRange.low}-${a.normalRange.high} ${a.unit}).` :
        `Your ${a.key} is ${a.status} (value ${a.value} ${a.unit}). Severity: ${a.severity}. We recommend medical follow-up.`;
      return { key: a.key, explanation, severity: a.severity };
    });
    return {
      assessments,
      result: {
        explanations: localExplanations,
        action_items: assessments.filter(a => a.severity === 'severe').map(a => `URGENT: see a doctor for ${a.key}`),
        questions: ['Please consult a doctor for next steps.']
      },
      rawWatson: null
    };
  }
  // Add to labAnalyzer.js after Watson call:
console.log('Full Watson response:', JSON.stringify(watsonResp, null, 2));

  let generated = null;
  try {
    // If this is a chat-style response (choices.message.content), try to extract JSON from the assistant message
    if (watsonResp && watsonResp.choices && watsonResp.choices[0] && watsonResp.choices[0].message && watsonResp.choices[0].message.content) {
      const content = watsonResp.choices[0].message.content;
      const parsed = extractJsonFromText(content);
      if (parsed) {
        generated = parsed;
      } else {
        // If not parseable, include the raw assistant content
        generated = { raw_assistant: content };
      }
    } else {
    if (watsonResp.predictions && watsonResp.predictions[0]) {
      generated = watsonResp.predictions[0].result || watsonResp.predictions[0].output || watsonResp.predictions[0];
    } else if (watsonResp.output && watsonResp.output.generations) {
      generated = watsonResp.output.generations;
    } else {
      generated = watsonResp;
    }
    }
  } catch (e) {
    generated = watsonResp;
  }

  return {
    assessments,
    result: generated,
    rawWatson: watsonResp
  };
}

module.exports = {
  parseLabValues,
  analyzeLabReport,
  assessValue
};
