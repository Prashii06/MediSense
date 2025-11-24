/*
 Copyright 2019 IBM Corp.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const appID = require("ibmcloud-appid");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const WebAppStrategy = appID.WebAppStrategy;
const ReportAnalyzer = require("./reportAnalyzer");

const app = express();
const reportAnalyzer = new ReportAnalyzer();

const CALLBACK_URL = "/ibm/cloud/appid/callback";

const port = process.env.PORT || 3000;

// Setup express application to use express-session middleware
app.use(session({
	secret: "123456",
	resave: true,
	saveUninitialized: true,
	proxy: true
}));

// Configure express application to use passportjs
app.use(passport.initialize());
app.use(passport.session());

let webAppStrategy = new WebAppStrategy(getAppIDConfig());
passport.use(webAppStrategy);

// Configure passportjs with user serialization/deserialization
passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((obj, cb) => cb(null, obj));

// Configure multer for file uploads
const upload = multer({
	dest: "uploads/",
	limits: {
		fileSize: 10 * 1024 * 1024 // 10MB limit
	},
	fileFilter: (req, file, cb) => {
		const allowedTypes = /\.(pdf|png|jpg|jpeg|txt)$/i;
		if (allowedTypes.test(file.originalname)) {
			cb(null, true);
		} else {
			cb(new Error("Invalid file type. Only PDF, PNG, JPG, JPEG, and TXT files are allowed."));
		}
	}
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Callback to finish the authorization process
app.get(CALLBACK_URL, passport.authenticate(WebAppStrategy.STRATEGY_NAME, { failureRedirect: '/error', session: false }));

// Protect everything under /protected
app.use("/protected", passport.authenticate(WebAppStrategy.STRATEGY_NAME, { session: false }));

// This will statically serve pages:
app.use(express.static("public"));

// This will statically serve the protected page
app.use('/protected', express.static("protected"));

app.get("/logout", (req, res) => {
	req._sessionManager = false;
	WebAppStrategy.logout(req);
	res.clearCookie("refreshToken");
	res.redirect("/");
});

//Serves the identity token payload
app.get("/protected/api/idPayload", (req, res) => {
	res.send(req.session[WebAppStrategy.AUTH_CONTEXT].identityTokenPayload);
});

// Helper function to get user ID from session
function getUserId(req) {
	try {
		const authContext = req.session[WebAppStrategy.AUTH_CONTEXT];
		if (authContext && authContext.identityTokenPayload) {
			return authContext.identityTokenPayload.sub || 
			       authContext.identityTokenPayload.email || 
			       authContext.identityTokenPayload.name || 
			       "anonymous";
		}
	} catch (e) {
		console.error("Error getting user ID:", e);
	}
	return "anonymous";
}

// Helper function to extract text from files with better error handling
const ENABLE_OCR = process.env.ENABLE_OCR === 'true';
const OCR_LANG = process.env.OCR_LANG || 'eng';

async function extractTextFromFile(filePath, mimetype) {
	const fileExtension = path.extname(filePath).toLowerCase();
	
	console.log(`Extracting text from ${fileExtension} file: ${filePath}`);

	// Handle text files directly
	if (fileExtension === '.txt') {
		try {
			const text = fs.readFileSync(filePath, 'utf8');
			if (text && text.trim().length > 0) {
				console.log(`Successfully extracted ${text.length} characters from text file`);
				return text;
			}
		} catch (e) {
			console.error('Error reading text file:', e);
			throw new Error('Failed to read text file');
		}
	}

	// Handle PDF files
	if (fileExtension === '.pdf') {
		try {
			// Try pdf-parse with better error handling
			const pdfParse = require('pdf-parse');
			const buffer = fs.readFileSync(filePath);
			
			console.log('Attempting to parse PDF with pdf-parse...');
			const parsed = await pdfParse(buffer, {
				// Disable canvas to avoid WebAssembly issues
				max: 0,
				version: 'default'
			}).catch(err => {
				console.warn('pdf-parse failed:', err.message);
				return null;
			});

			if (parsed && parsed.text && parsed.text.trim().length > 0) {
				console.log(`Successfully extracted ${parsed.text.length} characters from PDF`);
				return parsed.text;
			}

			console.log('No text extracted from PDF, attempting OCR fallback...');
		} catch (e) {
			console.warn('PDF parsing error:', e.message);
		}

		// Try OCR fallback for PDFs
		if (ENABLE_OCR) {
			try {
				const { extractTextFromFile: extractWithOcr } = require('./services/ocr');
				const ocrText = await extractWithOcr(filePath, { lang: OCR_LANG });
				if (ocrText && ocrText.trim().length > 0) {
					console.log(`Successfully extracted ${ocrText.length} characters via OCR`);
					return ocrText;
				}
			} catch (err) {
				console.warn('OCR fallback failed:', err.message);
			}
		}

		throw new Error('Unable to extract text from PDF. The file may be scanned or image-based. Please enable OCR or upload a searchable PDF.');
	}

	// Handle image files
	if (['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp'].includes(fileExtension)) {
		if (!ENABLE_OCR) {
			throw new Error('Image files require OCR to be enabled. Please set ENABLE_OCR=true in your environment or upload a text-based file.');
		}

		try {
			const { extractTextFromFile: extractWithOcr } = require('./services/ocr');
			const ocrText = await extractWithOcr(filePath, { lang: OCR_LANG });
			if (ocrText && ocrText.trim().length > 0) {
				console.log(`Successfully extracted ${ocrText.length} characters from image via OCR`);
				return ocrText;
			}
			throw new Error('OCR did not extract any text from the image');
		} catch (err) {
			console.error('OCR extraction failed:', err);
			throw new Error(`Failed to extract text from image: ${err.message}`);
		}
	}

	throw new Error(`Unsupported file type: ${fileExtension}`);
}

// API endpoint to analyze a report
app.post("/protected/api/analyze", upload.single("report"), async (req, res) => {
	let filePath = null;
	
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, error: "No file uploaded" });
		}

		const userId = getUserId(req);
		filePath = req.file.path;
		const filename = req.file.originalname;

		console.log(`Processing file: ${filename} for user: ${userId}`);

		// Extract text from file with better error handling
		let text = '';
		let extractionError = null;

		try {
			text = await extractTextFromFile(filePath, req.file.mimetype);
			console.log(`Text extraction successful: ${text.length} characters`);
		} catch (error) {
			console.error('Text extraction error:', error);
			extractionError = error.message;
			text = `Unable to extract text from file: ${error.message}`;
		}

		// Extract patient metadata from text if available
		const patientMeta = extractPatientMetadata(text);
		console.log('Patient metadata extracted:', patientMeta);

		// Analyze the report (includes Watson lab analysis when available)
		console.log('Analyzing report with Watson integration...');
		const analysis = await reportAnalyzer.analyzeReportWithLabs(text, filename, patientMeta);

		if (extractionError) {
			analysis.extractionError = extractionError;
		}

		// Generate report ID
		const reportId = uuidv4();

		// Optionally persist original uploaded file for re-processing later
		if (process.env.PERSIST_ORIGINALS === 'true') {
			try {
				const originalsDir = path.join(__dirname, 'uploads', 'originals');
				if (!fs.existsSync(originalsDir)) {
					fs.mkdirSync(originalsDir, { recursive: true });
				}
				const destName = `${reportId}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
				const destPath = path.join(originalsDir, destName);
				fs.renameSync(filePath, destPath);
				analysis.originalFilePath = destPath;
				filePath = null; // Don't clean up since we moved it
			} catch (e) {
				console.warn('Failed to persist original upload:', e.message);
			}
		}

		// Save the report (this will persist analysis and upload to COS if enabled)
		console.log('Saving report...');
		const savedReport = await reportAnalyzer.saveReport(userId, analysis, reportId);

		console.log(`Report saved successfully: ${reportId}`);

		res.json({
			success: true,
			reportId: reportId,
			analysis: analysis
		});
	} catch (error) {
		console.error("Error analyzing report:", error);
		res.status(500).json({ 
			success: false, 
			error: "Failed to analyze report: " + error.message 
		});
	} finally {
		// Clean up uploaded file if it still exists
		if (filePath && fs.existsSync(filePath)) {
			try {
				fs.unlinkSync(filePath);
			} catch (e) {
				console.warn('Failed to clean up uploaded file:', e.message);
			}
		}
	}
});

// Helper function to extract patient metadata
function extractPatientMetadata(text) {
	const meta = {};
	
	if (!text || typeof text !== 'string') return meta;

	const reName = /Patient Name:\s*(.+?)(?:\n|$)/i;
	const reDob = /Date of Birth:\s*(.+?)(?:\n|$)/i;
	const reSex = /Sex:\s*(Male|Female|Other)/i;
	const reAge = /\((\d+)\s+years?\)/i;

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

// API endpoint to get report history
app.get("/protected/api/history", (req, res) => {
	try {
		const userId = getUserId(req);
		const reports = reportAnalyzer.getUserReports(userId);
		res.json(reports);
	} catch (error) {
		console.error("Error getting report history:", error);
		res.status(500).json({ success: false, error: "Failed to retrieve report history" });
	}
});

// API endpoint to get a specific report
app.get("/protected/api/report/:reportId", (req, res) => {
	try {
		const userId = getUserId(req);
		const reportId = req.params.reportId;
		const report = reportAnalyzer.loadReport(reportId);

		if (!report) {
			return res.status(404).json({ success: false, error: "Report not found" });
		}

		// Verify the report belongs to the user
		if (report.userId !== userId) {
			return res.status(403).json({ success: false, error: "Access denied" });
		}

		res.json({ success: true, analysis: report.analysis });
	} catch (error) {
		console.error("Error getting report:", error);
		res.status(500).json({ success: false, error: "Failed to retrieve report" });
	}
});

// Re-run OCR / reprocess original file for a saved report
app.post('/protected/api/rerun-ocr/:reportId', async (req, res) => {
	try {
		const userId = getUserId(req);
		const reportId = req.params.reportId;
		const report = reportAnalyzer.loadReport(reportId);
		
		if (!report) {
			return res.status(404).json({ success: false, error: 'Report not found' });
		}
		
		if (report.userId !== userId) {
			return res.status(403).json({ success: false, error: 'Access denied' });
		}

		const originalPath = report.analysis && report.analysis.originalFilePath;
		if (!originalPath || !fs.existsSync(originalPath)) {
			return res.status(400).json({ 
				success: false, 
				error: 'Original file not available for reprocessing' 
			});
		}

		if (!ENABLE_OCR) {
			return res.status(400).json({ 
				success: false, 
				error: 'OCR is not enabled. Set ENABLE_OCR=true to enable reprocessing.' 
			});
		}

		// Reprocess the file
		const text = await extractTextFromFile(originalPath, '');
		const patientMeta = extractPatientMetadata(text);
		const analysis = await reportAnalyzer.analyzeReportWithLabs(
			text, 
			report.filename, 
			patientMeta
		);
		
		analysis.originalFilePath = originalPath;
		
		// Save updated report
		await reportAnalyzer.saveReport(userId, analysis, reportId);

		res.json({ success: true, analysis });
	} catch (e) {
		console.error('Error reprocessing OCR:', e);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to reprocess: ' + e.message 
		});
	}
});

// API endpoint to download a report
app.get("/protected/api/download/:reportId", (req, res) => {
	try {
		const userId = getUserId(req);
		const reportId = req.params.reportId;
		const report = reportAnalyzer.loadReport(reportId);

		if (!report) {
			return res.status(404).send("Report not found");
		}

		// Verify the report belongs to the user
		if (report.userId !== userId) {
			return res.status(403).send("Access denied");
		}

		// Generate downloadable report
		const reportText = reportAnalyzer.generateDownloadableReport(report);

		// Set headers for download
		res.setHeader("Content-Type", "text/plain");
		res.setHeader("Content-Disposition", `attachment; filename="report_${reportId}.txt"`);
		res.send(reportText);
	} catch (error) {
		console.error("Error downloading report:", error);
		res.status(500).send("Failed to download report");
	}
});

app.get('/error', (req, res) => {
	res.send('Authentication Error');
});

app.listen(port, () => {
	console.log("Listening on http://localhost:" + port);
	console.log("OCR enabled:", ENABLE_OCR);
	console.log("COS upload enabled:", process.env.ENABLE_COS_UPLOAD === 'true');
});

function getAppIDConfig() {
	let config;

	try {
		// if running locally we'll have the local config file
		config = require('./localdev-config.json');
	} catch (e) {
		if (process.env.APPID_SERVICE_BINDING) {
			config = JSON.parse(process.env.APPID_SERVICE_BINDING);
			config.redirectUri = process.env.redirectUri;
		} else {
			let vcapApplication = JSON.parse(process.env["VCAP_APPLICATION"]);
			return { "redirectUri": "https://" + vcapApplication["application_uris"][0] + CALLBACK_URL };
		}
	}
	return config;
}