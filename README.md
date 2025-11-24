# MediSense - AI-Powered Medical Report Simplification

**Transform complex medical reports into clear, easy-to-understand language in seconds.**

MediSense is a secure, privacy-first web application that helps patients, caregivers, and families understand laboratory reports, prescriptions, diagnoses, and imaging results — without needing to decode complicated medical terminology.

Upload your report → AI analyzes it → Get a simple, accurate explanation instantly.

## ✨ Key Features

- Instant conversion of medical jargon into plain language  
- Supports PDF, JPG, PNG, and TXT files  
- End-to-end encryption and enterprise-grade security  
- Powered by IBM watsonx.ai for accurate medical understanding  
- Secure authentication via IBM Cloud App ID  
- Personal report history with past analyses  
- Built on IBM Cloud with Cloud Object Storage (COS)

## 🛠 Tech Stack

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Frontend           | HTML5, CSS3, Vanilla JavaScript     |
| Backend            | Node.js + Express                   |
| Authentication     | IBM Cloud App ID                    |
| AI Engine          | IBM watsonx.ai                      |
| File Storage       | IBM Cloud Object Storage (COS)      |
| Session Management | Express Session (+ Redis in prod)   |
| Deployment         | IBM Cloud Foundry / Kubernetes     |

## 📋 Prerequisites

- Node.js 18 or higher  
- IBM Cloud account  
- IBM Cloud App ID service instance  
- IBM watsonx.ai project (API key + project ID)  
- IBM Cloud Object Storage instance

## 🚀 Local Development

```bash
git clone https://github.com/Prashii06/MediSense.git
cd MediSense
npm install
```

Create a `.env` file in the root directory:

```env
# IBM Cloud App ID
APPID_TENANT_ID=your-tenant-id
APPID_CLIENT_ID=your-client-id
APPID_SECRET=your-client-secret
APPID_OAUTH_SERVER_URL=https://<region>.appid.cloud.ibm.com/oauth/v4/<tenant-id>
APPID_REDIRECT_URI=http://localhost:3000/callback

# IBM watsonx.ai
WATSONX_AI_API_KEY=your-watsonx-api-key
WATSONX_AI_PROJECT_ID=your-project-id
WATSONX_AI_URL=https://us-south.ml.cloud.ibm.com

# IBM Cloud Object Storage
COS_ENDPOINT=https://s3.<region>.cloud-object-storage.appdomain.cloud
COS_API_KEY_ID=your-cos-api-key
COS_INSTANCE_CRN=your-cos-crn
COS_BUCKET_NAME=your-bucket-name

# App
PORT=3000
SESSION_SECRET=strong-random-secret
```

Start the server:

```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication

Powered by IBM Cloud App ID with support for email/password and social logins (Google, Facebook, etc.).

## 📤 How Report Processing Works

1. User uploads a medical document  
2. File is securely stored in IBM Cloud Object Storage  
3. Text is extracted (PDF/image → text)  
4. Content is sent to watsonx.ai with a medical-specific prompt  
5. AI returns a patient-friendly explanation  
6. Result is displayed and saved to user history

## 🚀 Deployment

### IBM Cloud Foundry
```bash
ibmcloud login
ibmcloud target --cf
cf push
```

### Kubernetes
```bash
kubectl apply -f kube_deployment.yml
```

## 🤝 Contributing

Contributions are very welcome! Feel free to:
- Report bugs or suggest features  
- Improve AI prompts or UI/UX  
- Add multilingual support  
- Submit pull requests

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

**MediSense** — Making healthcare understandable for everyone.

Star this repo if you believe in accessible health information! 🌟