const COS = require('ibm-cos-sdk');

function createClient() {
  const endpoint = process.env.COS_ENDPOINT;
  const apiKeyId = process.env.COS_API_KEY_ID;
  const serviceInstanceId = process.env.COS_RESOURCE_INSTANCE_ID || process.env.COS_SERVICE_INSTANCE_ID;
  const region = process.env.COS_REGION || 'us-standard';

  if (!endpoint || !apiKeyId || !serviceInstanceId) {
    throw new Error('IBM COS not configured. Set COS_ENDPOINT, COS_API_KEY_ID and COS_RESOURCE_INSTANCE_ID in env.');
  }

  // Normalize endpoint: if user omitted scheme, assume https
  let normalizedEndpoint = endpoint;
  if (!/^https?:\/\//i.test(normalizedEndpoint)) {
    normalizedEndpoint = `https://${normalizedEndpoint}`;
  }

  // Provide clearer error message if connectivity fails upstream (errors will still be thrown by SDK)
  try {
    return new COS.S3({
      endpoint: normalizedEndpoint,
      apiKeyId,
      serviceInstanceId,
      region,
      signatureVersion: 'iam'
    });
  } catch (err) {
    const msg = `Failed to create IBM COS client for endpoint=${normalizedEndpoint} region=${region}: ${err && err.message ? err.message : err}`;
    throw new Error(msg);
  }
}

async function uploadObject(bucketName, key, body, contentType = 'application/json') {
  const s3 = createClient();
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType
  };

  return new Promise((resolve, reject) => {
    s3.putObject(params, (err, data) => {
      if (err) return reject(err);
      // Return a simple info object
      resolve({ bucket: bucketName, key, etag: data.ETag });
    });
  });
}

module.exports = { uploadObject };
