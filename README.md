# Batch Affidavit Generator

Web-based system for generating affidavits of service from WA Magistrates Court GPC documents.

## Files Included

- `index.html` - Main web interface
- `netlify/functions/generate-affidavit.mjs` - Serverless function to generate affidavits
- `Form_11_-_Affidavit_of_Service.docx` - Word template for affidavits
- `package.json` - Node.js dependencies
- `netlify.toml` - Netlify configuration

## Deployment Instructions

### Option 1: Deploy to Existing Netlify Site

1. **Replace files in your existing project:**
   - Copy `netlify/functions/generate-affidavit.mjs` to your project's `netlify/functions/` directory
   - Copy `index.html` to your project root (if needed)
   - Copy `Form_11_-_Affidavit_of_Service.docx` to your project root
   - Ensure your `package.json` includes the dependencies listed in this package.json

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Update affidavit generator with working solution"
   git push
   ```

3. **Netlify will automatically deploy** the changes

### Option 2: Deploy as New Netlify Site

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Netlify:**
   - Log into Netlify
   - Click "Add new site" → "Import an existing project"
   - Connect to your GitHub repository
   - Netlify will detect the configuration automatically
   - Click "Deploy site"

## How It Works

1. User uploads PDF documents (GPC claims)
2. System extracts text from PDFs using pdf.js
3. Calls `extract-gpc-data` function to parse case details
4. For each defendant, calls `generate-affidavit` function
5. Function manipulates Word template XML using pizzip
6. Returns completed affidavit as downloadable .docx file

## Technical Details

- **Frontend:** Pure HTML/CSS/JavaScript with pdf.js
- **Backend:** Netlify serverless functions (Node.js)
- **Document Processing:** pizzip for Word document XML manipulation
- **No Python required:** All processing done in JavaScript

## Troubleshooting

If affidavits aren't generating:

1. Check Netlify function logs (Functions → generate-affidavit → Logs)
2. Check browser console for errors (F12)
3. Verify the Word template is in the project root
4. Ensure all dependencies are installed (`npm install`)

## Notes

- The extract-gpc-data function is NOT included in this package
- Make sure you have that function in your netlify/functions directory as well
- Template file MUST be named exactly `Form_11_-_Affidavit_of_Service.docx`
- Template MUST be in the project root directory
