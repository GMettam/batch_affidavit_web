# Process Server Affidavit Generator - Deployment Guide

## What's Different in the PS Version?

1. **All defendants in ONE row** - instead of separate rows for each defendant
2. **Name formatting** - FirstName LASTNAME (given names in Title Case, surname in UPPER CASE)
3. **Service statement** - uses formatted defendant name

## Files You Need to Deploy

### 1. Netlify Functions (in your `netlify/functions/` folder)

- **generate-affidavit.mjs** (your existing standard version - keep this!)
- **generate-affidavit-ps.mjs** (NEW - the process server version)

### 2. Word Templates (in your `netlify/functions/` folder)

- **Form_11_-_Affidavit_of_Service.docx** (your existing standard template)
- **Form_11_-_Affidavit_of_Service_PS.docx** (NEW - the IBW template you uploaded)

## Deployment Steps

### Step 1: Upload the PS Function

1. Take the `generate-affidavit-ps.mjs` file I've created
2. Upload it to your `netlify/functions/` folder in your GitHub repository
3. Make sure it's in the SAME folder as your existing `generate-affidavit.mjs`

### Step 2: Upload the PS Template

1. Take the Word template you sent me: `Form_11_-_Affidavit_of_Service__IBW_version_.docx`
2. Rename it to: `Form_11_-_Affidavit_of_Service_PS.docx`
3. Upload it to your `netlify/functions/` folder (same location as the other template)

### Step 3: Update Your HTML Form

Add the second button to your form. See the `button-example.html` file for the code.

The key changes:
- Two buttons instead of one
- Each button calls a different endpoint:
  - Standard: `/.netlify/functions/generate-affidavit`
  - Process Server: `/.netlify/functions/generate-affidavit-ps`

### Step 4: Deploy to Netlify

1. Commit and push your changes to GitHub
2. Netlify will automatically deploy
3. Check the deploy logs to make sure both functions are built

## Testing

After deployment, test both versions:

1. **Standard version** - should work exactly as before
2. **Process Server version** - check that:
   - All defendants appear in ONE row
   - Names are formatted correctly (e.g., "Michael SMITH" not "MICHAEL SMITH")
   - Service statement looks correct

## Example Output

### Standard Version:
```
First Defendant: MICHAEL VICTOR SATIE
Second Defendant: JOHN WILLIAM JONES
```

### Process Server Version:
```
Defendant: Michael Victor SATIE, John William JONES
```

## Future Changes

When your process server provides additional requirements:

1. Only modify `generate-affidavit-ps.mjs` (leave standard version alone)
2. Or update `Form_11_-_Affidavit_of_Service_PS.docx` template
3. Redeploy to Netlify

## Troubleshooting

**If PS version doesn't work:**

1. Check Netlify function logs (Functions tab in Netlify dashboard)
2. Look for the log line: `★★★ PROCESS SERVER VERSION - DEC 29 2025 ★★★`
3. Check that the template file is in the correct location
4. Verify the template filename is exactly: `Form_11_-_Affidavit_of_Service_PS.docx`

**If names aren't formatting correctly:**

The `formatDefendantName()` function assumes:
- Last word = surname (will be UPPERCASE)
- All other words = given names (will be Title Case)

Example: "MICHAEL VICTOR SATIE" becomes "Michael Victor SATIE"
