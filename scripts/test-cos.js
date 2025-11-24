const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { uploadObject } = require('../services/cos');

async function main() {
  const bucket = process.env.COS_BUCKET;
  if (!bucket) {
    console.error('COS_BUCKET not set in environment. Set COS_BUCKET and IBM COS credentials in .env');
    process.exit(2);
  }

  const input = process.argv[2] || path.join('reports', '83b469ab-ec27-445e-ad7e-6d3c9c898c60.json');
  if (!fs.existsSync(input)) {
    console.error('Input file not found:', input);
    process.exit(2);
  }

  const body = fs.readFileSync(input);
  const key = `test-upload-${path.basename(input)}-${Date.now()}.json`;

  console.log('Uploading', input, '->', `${bucket}/${key}`);
  try {
    const res = await uploadObject(bucket, key, body, 'application/json');
    console.log('Upload successful:', res);
    console.log('You can verify in the bucket or via IBM Cloud console.');
  } catch (e) {
    console.error('Upload failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

main();
