/*
 * Report Analyzer Module
 * Analyzes medical reports and extracts key information
 */

const fs = require('fs');
const path = require('path');
const { analyzeLabReport } = require('./services/labAnalyzer');

// [Previous medicalTerms, medicalAbbreviations, medicationDatabase, etc. remain the same]
// ... (keeping all the existing dictionaries and data structures)

class ReportAnalyzer {
    constructor() {
        this.reportsDir = path.join(__dirname, 'reports');
        this.ensureReportsDirectory();
    }

    ensureReportsDirectory() {
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    /**
     * Async: analyze report and run lab-specific analysis (watsonx.ai)
     */
    async analyzeReportWithLabs(text, filename, patientMeta = {}) {
        console.log('Starting report analysis with Watson integration...');
        
        // Get base analysis first
        const base = this.analyzeReport(text, filename);
        base.patientMeta = patientMeta;
        
        // Try Watson lab analysis
        try {
            console.log('Calling Watson lab analyzer...');
            const labResult = await analyzeLabReport(text, patientMeta);
            
            console.log('Watson lab analysis result:', JSON.stringify(labResult, null, 2));
            
            if (labResult && labResult.result) {
                base.labAnalysis = labResult;
                
                // Merge insights into main sections
                this.mergeLabInsightsIntoSections(base);
                
                // Build narrative
                const labNarrative = this.buildLabNarrative(labResult);
                if (labNarrative) {
                    base.labNarrative = labNarrative;
                }
                
                console.log('Watson analysis successfully integrated');
            } else {
                console.warn('Watson returned empty result');
                base.labAnalysis = { 
                    error: 'Watson analysis returned no results',
                    rawResponse: labResult 
                };
            }
        } catch (e) {
            console.error('Watson lab analysis failed:', e);
            base.labAnalysis = { 
                error: e && e.message ? e.message : String(e),
                stack: e && e.stack ? e.stack : undefined
            };
        }
        
        return base;
    }

    /**
     * Analyze a medical report text (base analysis without Watson)
     */
    analyzeReport(text, filename) {
        const lowerText = text.toLowerCase();

        // Check for extraction failures
        const extractionFailure = /unable to extract text/i.test(text) || 
                                 /ocr is disabled/i.test(text) || 
                                 /unable to extract/i.test(text);
        
        if (extractionFailure) {
            const summary = `📋 **Report Overview**\n\nUnable to extract text from the uploaded file. This may be a scanned image or an unsupported file type.\n\n🔍 **Key Points**\n\n• No textual content could be extracted from this file.\n\n💡 **What You Should Do**\n\n1. Re-upload a machine-readable (searchable) PDF if available.\n2. If this is a scanned document, enable OCR and try again.\n3. Contact support for help if needed.`;

            return {
                summary,
                findings: '• No text could be extracted from this file.',
                recommendations: '• Please re-upload a readable document or enable OCR.',
                terms: 'No medical terminology could be identified.',
                diagnosis: null,
                medications: null,
                medicationInstructions: 'No medication information could be extracted.',
                alternativeMedications: null,
                originalText: text,
                filename
            };
        }
        
        // Extract components
        const diagnosis = this.extractDiagnosis(text, lowerText);
        const medications = this.extractMedications(text, lowerText);
        const findings = this.extractFindings(text, lowerText);
        const summary = this.generateEasySummary(text, findings, diagnosis, medications);
        const terms = this.extractMedicalTerms(text, lowerText);
        const medicationInstructions = this.generateMedicationInstructions(medications);
        const alternativeMedications = this.suggestAlternativeMedications(diagnosis, medications);
        const recommendations = this.generateRecommendations(findings, terms, diagnosis, medications);
        
        return {
            summary,
            findings,
            recommendations,
            terms,
            diagnosis: diagnosis || 'No specific diagnosis mentioned in the report.',
            medications: medications.length > 0 ? medications : null,
            medicationInstructions,
            alternativeMedications,
            originalText: text.substring(0, 500) + '...',
            filename
        };
    }

    /**
     * Merge Watson lab insights into the main sections
     */
    mergeLabInsightsIntoSections(analysis) {
        if (!analysis || !analysis.labAnalysis || !analysis.labAnalysis.result) {
            return;
        }

        const result = analysis.labAnalysis.result;
        const explanations = Array.isArray(result.explanations) ? result.explanations : [];
        const actionItems = Array.isArray(result.action_items) ? result.action_items : [];

        // Add explanations to findings
        if (explanations.length > 0) {
            const explanationBullets = explanations.slice(0, 3).map(exp => {
                const label = exp.key ? exp.key.replace(/_/g, ' ').toUpperCase() : 'LAB RESULT';
                const severity = exp.severity ? ` (${exp.severity})` : '';
                const detail = exp.explanation || exp.raw_assistant || '';
                return `• ${label}${severity}: ${detail}`.trim();
            }).join('\n');

            if (analysis.summary && !analysis.summary.includes('Watson Lab Highlights')) {
                analysis.summary += `\n\n🔬 **Watson AI Lab Analysis**\n${explanationBullets}`;
            }

            if (!analysis.findings || /No text could be extracted/i.test(analysis.findings)) {
                const prefix = analysis.findings ? `${analysis.findings}\n\n` : '';
                analysis.findings = `${prefix}**AI-Powered Lab Analysis:**\n${explanationBullets}`.trim();
            } else if (!analysis.findings.includes('Watson Lab')) {
                analysis.findings += `\n\n**Watson AI Insights:**\n${explanationBullets}`;
            }
        }

        // Add action items to recommendations
        if (actionItems.length > 0 && analysis.recommendations && 
            !analysis.recommendations.includes('AI Lab Follow-ups')) {
            const actionList = actionItems.map(item => `• ${item}`).join('\n');
            analysis.recommendations += `\n\n🤖 **AI-Recommended Actions**\n${actionList}`;
        }
    }

    /**
     * Build a narrative from Watson lab analysis
     */
    buildLabNarrative(labAnalysis) {
        if (!labAnalysis || !labAnalysis.result) {
            return null;
        }

        const sentences = [];
        const result = labAnalysis.result;

        if (Array.isArray(result.explanations)) {
            result.explanations.forEach(item => {
                const key = item.key ? item.key.replace(/_/g, ' ').trim() : 'This result';
                const severity = item.severity ? ` (severity: ${String(item.severity).trim()})` : '';
                const text = item.explanation || item.raw_assistant || '';
                if (text) {
                    sentences.push(`${key}: ${text}${severity}.`);
                }
            });
        }

        if (Array.isArray(result.action_items) && result.action_items.length > 0) {
            sentences.push(`Recommended actions: ${result.action_items.join('; ')}.`);
        }

        if (Array.isArray(result.questions) && result.questions.length > 0) {
            sentences.push(`Questions to discuss with your doctor: ${result.questions.join('; ')}.`);
        }

        return sentences.length > 0 ? sentences.join(' ') : null;
    }

    // ... [Keep all other existing methods like extractFindings, extractDiagnosis, etc.]

    /**
     * Save analyzed report with COS upload support
     */
    async saveReport(userId, analysis, reportId) {
        const reportData = {
            id: reportId,
            userId: userId,
            timestamp: new Date().toISOString(),
            filename: analysis.filename,
            analysis: {
                summary: analysis.summary,
                findings: analysis.findings,
                recommendations: analysis.recommendations,
                terms: analysis.terms,
                diagnosis: analysis.diagnosis,
                medications: analysis.medications,
                medicationInstructions: analysis.medicationInstructions,
                alternativeMedications: analysis.alternativeMedications,
                labAnalysis: analysis.labAnalysis || null,
                labNarrative: analysis.labNarrative || null,
                patientMeta: analysis.patientMeta || null,
                originalText: analysis.originalText || null,
                extractionError: analysis.extractionError || null,
                originalFilePath: analysis.originalFilePath || null
            }
        };
        
        const filePath = path.join(this.reportsDir, `${reportId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));

        console.log(`Report saved locally: ${filePath}`);

        // Upload to COS if enabled
        if (process.env.ENABLE_COS_UPLOAD === 'true') {
            try {
                const bucket = process.env.COS_BUCKET;
                if (bucket) {
                    console.log('Uploading report to IBM Cloud Object Storage...');
                    const cos = require('./services/cos');
                    const key = `reports/${reportId}.json`;
                    const body = fs.readFileSync(filePath);
                    await cos.uploadObject(bucket, key, body, 'application/json');
                    console.log(`Report uploaded to COS: ${bucket}/${key}`);
                } else {
                    console.warn('COS upload enabled but COS_BUCKET not configured');
                }
            } catch (e) {
                console.error('Failed to upload report to COS:', e.message || e);
                // Don't fail the save operation
            }
        }

        return reportData;
    }

    /**
     * Load a saved report
     */
    loadReport(reportId) {
        const filePath = path.join(this.reportsDir, `${reportId}.json`);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return null;
    }

    /**
     * Get user's report history
     */
    getUserReports(userId) {
        const reports = [];
        
        if (!fs.existsSync(this.reportsDir)) {
            return reports;
        }
        
        const files = fs.readdirSync(this.reportsDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                try {
                    const reportData = JSON.parse(
                        fs.readFileSync(path.join(this.reportsDir, file), 'utf8')
                    );
                    if (reportData.userId === userId) {
                        reports.push({
                            id: reportData.id,
                            filename: reportData.filename,
                            timestamp: reportData.timestamp
                        });
                    }
                } catch (e) {
                    console.error(`Error reading report file ${file}:`, e);
                }
            }
        });
        
        return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Generate downloadable report
     */
    generateDownloadableReport(reportData) {
        let report = '='.repeat(60) + '\n';
        report += 'MEDICAL REPORT ANALYSIS\n';
        report += '='.repeat(60) + '\n\n';
        report += `Report ID: ${reportData.id}\n`;
        report += `Original File: ${reportData.filename}\n`;
        report += `Analysis Date: ${new Date(reportData.timestamp).toLocaleString()}\n\n`;
        
        report += '='.repeat(60) + '\n';
        report += 'SUMMARY\n';
        report += '='.repeat(60) + '\n\n';
        report += reportData.analysis.summary + '\n\n';
        
        report += '='.repeat(60) + '\n';
        report += 'KEY FINDINGS\n';
        report += '='.repeat(60) + '\n\n';
        report += reportData.analysis.findings + '\n\n';
        
        if (reportData.analysis.labNarrative) {
            report += '='.repeat(60) + '\n';
            report += 'AI LAB ANALYSIS\n';
            report += '='.repeat(60) + '\n\n';
            report += reportData.analysis.labNarrative + '\n\n';
        }
        
        report += '='.repeat(60) + '\n';
        report += 'RECOMMENDATIONS\n';
        report += '='.repeat(60) + '\n\n';
        report += reportData.analysis.recommendations + '\n\n';
        
        report += '='.repeat(60) + '\n';
        report += 'MEDICAL TERMS EXPLAINED\n';
        report += '='.repeat(60) + '\n\n';
        report += reportData.analysis.terms + '\n\n';
        
        report += '='.repeat(60) + '\n';
        report += 'IMPORTANT DISCLAIMER\n';
        report += '='.repeat(60) + '\n\n';
        report += 'This analysis is for informational purposes only and should not replace professional medical advice, diagnosis or treatment. Always consult with qualified doctors for proper interpretation of medical reports and any health concerns.\n\n';
        report += 'Generated by MedExplain AI with Watson Integration\n';
        report += '='.repeat(60) + '\n';
        
        return report;
    }

    // ... [Keep all other helper methods unchanged]
}

module.exports = ReportAnalyzer;