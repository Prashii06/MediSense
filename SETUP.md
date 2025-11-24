# Setup Guide for Report Analyzer

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

   This will install all required packages including:
   - `multer` - For file uploads
   - `uuid` - For generating unique report IDs
   - `pdf-parse` - For extracting text from PDF files

2. **Optional: Enhanced PDF Support**
   The PDF parsing is already included in package.json. If you want to add OCR for images, you can optionally install:
   ```bash
   npm install tesseract.js
   ```
   Then update the `extractTextFromFile` function in `app.js` to use Tesseract for image OCR.

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Open your browser to `http://localhost:3000`
   - Click "Login" to authenticate
   - Once logged in, you'll see the dashboard with the report analyzer

## Directory Structure

The application will automatically create these directories:
- `uploads/` - Temporary storage for uploaded files (auto-cleaned after processing)
- `reports/` - Permanent storage for analyzed reports (JSON format)

## Testing the Report Analyzer

1. **Upload a Text File**
   - Create a simple `.txt` file with medical report content
   - Upload it through the dashboard
   - Click "Analyze Report"

2. **Example Test Content**
   ```
   Patient: John Doe
   Date: 2024-01-15
   
   Lab Results:
   Hemoglobin: 14.5 g/dL
   Glucose: 95 mg/dL
   Cholesterol: 210 mg/dL (high)
   WBC: 7,500 cells/μL
   
   Diagnosis: No abnormalities detected.
   ```

3. **View Results**
   - The analyzer will extract findings
   - Explain medical terms
   - Provide recommendations
   - Save to your report history

## Features to Try

- **Drag and Drop**: Try dragging a file onto the upload area
- **Report History**: Analyze multiple reports and view them in the history section
- **Download Reports**: Click the download button to save reports as text files
- **Medical Terms**: Upload reports with medical terminology to see explanations

## Troubleshooting

### PDF Files Not Working
- Ensure `pdf-parse` is installed: `npm install pdf-parse`
- Check that the PDF contains extractable text (not just images)

### Image Files
- Currently, images show a placeholder message
- To enable OCR, install Tesseract.js and update the extraction function

### File Upload Errors
- Check file size (max 10MB)
- Ensure file type is supported: PDF, PNG, JPG, JPEG, TXT
- Check that the `uploads/` directory has write permissions

### Authentication Issues
- Ensure your App ID configuration is set up correctly
- Check `localdev-config.json` for local development
- Verify environment variables for cloud deployment

## Next Steps

- Customize the medical terminology database in `reportAnalyzer.js`
- Add more file format support
- Integrate with IBM Watson services for advanced analysis
- Add email notifications for report analysis completion
- Implement report sharing functionality

