# 📋 Report Upload Guide - What Reports Work Best

## ✅ **Best Report Types to Upload**

The analyzer works best with reports that contain **text-based medical information**. Here are the types that will give you the most detailed and accurate analysis:

### 1. **Lab Test Reports** ⭐⭐⭐⭐⭐ (BEST)
**Why it works great:**
- Contains specific test values and numbers
- Analyzer can extract and explain lab results
- Can identify abnormal values

**Example format:**
```
LABORATORY REPORT
Patient: John Doe
Date: 2024-01-15

Complete Blood Count (CBC):
Hemoglobin: 14.5 g/dL
WBC: 7,500 cells/μL
RBC: 4.8 million/μL
Platelets: 250,000/μL

Blood Chemistry:
Glucose: 95 mg/dL
Cholesterol: 210 mg/dL (high)
LDL: 130 mg/dL
HDL: 45 mg/dL
Creatinine: 1.0 mg/dL

Diagnosis: High cholesterol levels detected.
```

### 2. **Prescription Reports** ⭐⭐⭐⭐⭐ (BEST)
**Why it works great:**
- Contains medication names and dosages
- Analyzer can extract medications and provide instructions
- Can suggest alternatives

**Example format:**
```
PRESCRIPTION
Patient: Jane Smith
Date: 2024-01-20

Diagnosis: Bacterial infection

Medications Prescribed:
1. Amoxicillin 500mg - Take twice daily after meals
2. Ibuprofen 400mg - Take every 6 hours as needed for pain
3. Paracetamol 500mg - Take every 4-6 hours for fever

Instructions: Complete the full course of antibiotics.
```

### 3. **Doctor's Consultation Reports** ⭐⭐⭐⭐
**Why it works:**
- Contains diagnosis information
- May include medications
- Has findings and recommendations

**Example format:**
```
CONSULTATION REPORT
Date: 2024-01-18
Doctor: Dr. Smith

Patient presenting with: High blood pressure and elevated cholesterol

Diagnosis: Hypertension and Hyperlipidemia

Findings:
- Blood pressure: 145/95 mmHg (high)
- Total cholesterol: 220 mg/dL (elevated)
- LDL: 150 mg/dL (high)

Prescribed Medications:
- Lisinopril 10mg - Take once daily
- Atorvastatin 20mg - Take once daily in the evening

Recommendations: Follow up in 2 weeks, maintain low-sodium diet.
```

### 4. **Blood Test Results** ⭐⭐⭐⭐
**Example format:**
```
BLOOD TEST RESULTS
Date: 2024-01-10

Test Results:
Hemoglobin: 12.5 g/dL
Hematocrit: 38%
WBC: 8,200 cells/μL
Glucose: 88 mg/dL
Cholesterol: 195 mg/dL
Triglycerides: 140 mg/dL

All values within normal range.
```

### 5. **Diagnostic Reports** ⭐⭐⭐⭐
**Example format:**
```
DIAGNOSTIC REPORT
Patient: Patient Name
Date: 2024-01-12

Clinical Impression: Type 2 Diabetes

Findings:
- Fasting glucose: 125 mg/dL (elevated)
- HbA1c: 7.2% (high)

Prescribed:
Metformin 500mg - Take twice daily with meals

Follow-up: Monitor blood sugar levels regularly.
```

## 📄 **File Format Requirements**

### ✅ **Supported Formats (Best to Good):**

1. **Text Files (.txt)** ⭐⭐⭐⭐⭐
   - **BEST OPTION** - Works perfectly
   - Just copy-paste your report text into a .txt file
   - No special formatting needed

2. **PDF Files (.pdf)** ⭐⭐⭐⭐
   - Works if `pdf-parse` library is installed
   - Text must be extractable (not scanned images)
   - If you get an error, install: `npm install pdf-parse`

3. **Image Files (.jpg, .png)** ⚠️
   - Currently shows a message that OCR is needed
   - For best results, convert image to text first

## 🎯 **What Makes a Report Work Well**

### ✅ **Include These Elements:**

1. **Test Values with Numbers**
   - Example: "Hemoglobin: 14.5 g/dL"
   - Example: "Glucose: 95 mg/dL"
   - Example: "Cholesterol: 210 mg/dL"

2. **Medication Names with Dosages**
   - Example: "Amoxicillin 500mg"
   - Example: "Lisinopril 10mg"
   - Example: "Take Metformin 500mg twice daily"

3. **Diagnosis Statements**
   - Example: "Diagnosis: Hypertension"
   - Example: "Diagnosed with: Type 2 Diabetes"
   - Example: "Condition: Bacterial infection"

4. **Clear Structure**
   - Use line breaks between sections
   - Label sections clearly (Test Results, Medications, Diagnosis)

### ❌ **What Doesn't Work Well:**

- Scanned images without text extraction
- Handwritten reports (unless typed out)
- Reports with only images/charts (no text)
- Very short reports with minimal information
- Reports in languages other than English

## 📝 **Sample Report Templates**

### Template 1: Lab Report
```
LABORATORY REPORT
Patient: [Name]
Date: [Date]

TEST RESULTS:
Hemoglobin: [value] g/dL
WBC: [value] cells/μL
Glucose: [value] mg/dL
Cholesterol: [value] mg/dL

DIAGNOSIS: [Condition if any]

MEDICATIONS: [If any]
```

### Template 2: Prescription
```
PRESCRIPTION
Date: [Date]

DIAGNOSIS: [Condition]

PRESCRIBED MEDICATIONS:
1. [Medication Name] [Dosage] - [Instructions]
2. [Medication Name] [Dosage] - [Instructions]

FOLLOW-UP: [Any recommendations]
```

### Template 3: Consultation Report
```
CONSULTATION REPORT
Date: [Date]
Doctor: [Name]

CHIEF COMPLAINT: [Symptoms]

DIAGNOSIS: [Condition]

FINDINGS:
- [Finding 1]
- [Finding 2]

PRESCRIBED:
- [Medication 1]
- [Medication 2]

RECOMMENDATIONS: [Advice]
```

## 💡 **Tips for Best Results**

1. **Use Text Files**: Convert PDFs or images to .txt for best results
2. **Include Numbers**: Reports with actual test values work best
3. **Be Specific**: Include medication names, dosages, and diagnosis
4. **Clear Formatting**: Use line breaks and clear labels
5. **Complete Information**: Include all relevant medical information

## 🔍 **What the Analyzer Can Extract**

✅ **Lab Values**: Hemoglobin, Glucose, Cholesterol, WBC, etc.
✅ **Medications**: Names, dosages, and instructions
✅ **Diagnosis**: Conditions and problems identified
✅ **Recommendations**: Based on findings
✅ **Medical Terms**: Explained in simple language
✅ **Alternative Medications**: Suggestions for similar conditions

## 📊 **Example: What You'll Get**

**If you upload a report with:**
- Diagnosis: "Bacterial infection"
- Medication: "Amoxicillin 500mg"
- Lab value: "WBC: 12,000 (high)"

**You'll receive:**
- ✅ Clear explanation of the diagnosis
- ✅ Medication instructions (how to take Amoxicillin)
- ✅ Explanation of high WBC count
- ✅ Alternative medication suggestions
- ✅ Recommendations for follow-up

## 🚀 **Quick Start**

1. **Create a text file** (.txt)
2. **Copy your medical report** into it
3. **Make sure it includes**:
   - Test values OR
   - Medications OR
   - Diagnosis
4. **Upload and analyze!**

---

**Remember**: The more detailed and structured your report, the better the analysis will be!

