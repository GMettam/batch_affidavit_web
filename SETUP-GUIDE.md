# Setup Guide - Deploy in 45 Minutes

## Overview

This guide will walk you through deploying the batch affidavit system to Netlify.

**Total Time: ~45 minutes**

---

## Prerequisites (10 minutes to set up)

### 1. GitHub Account
- Go to https://github.com
- Click "Sign up"
- Choose free plan
- Verify email

### 2. Netlify Account
- Go to https://netlify.com
- Click "Sign up"
- Sign up with GitHub (easiest)
- No credit card required

### 3. Anthropic API Key
- You should already have this
- Starts with `sk-ant-`
- Keep it handy

### 4. Your Affidavit Template
- Prepare your Word template
- See TEMPLATE-GUIDE.md for instructions
- Name it `affidavit-template.docx`

---

## Step 1: Prepare Template (10 minutes)

### Add Variables to Your Template

Open your affidavit Word document and replace specific values with variables:

**Replace with:**
- `{registry}` - Registry address
- `{caseNumber}` - Case number
- `{claimant}` - Claimant name
- `{claimantAddress}` - Claimant address

**For defendants:**
```
{#defendants}
{number} Defendant: {name}
Address: {address}
{/defendants}
```

**Leave blank (process server fills later):**
- `{serviceDate}`
- `{serviceTime}`
- `{servicePlace}`
- `{personalService}` (shows ☐)
- `{postalService}` (shows ☐)
- `{substitutedService}` (shows ☐)

### Save Template

1. Save as `affidavit-template.docx` (exactly this name)
2. Place in: `batch_affidavit_web/netlify/functions/`
3. Verify it's there

---

## Step 2: Upload to GitHub (10 minutes)

### Option A: Using GitHub Desktop (Easiest)

1. **Download GitHub Desktop**
   - Go to https://desktop.github.com
   - Download and install
   - Sign in with your GitHub account

2. **Add Repository**
   - Open GitHub Desktop
   - File → Add Local Repository
   - Browse to `batch_affidavit_web` folder
   - Click "Add Repository"

3. **Make Initial Commit**
   - You'll see all files listed
   - Add commit message: "Initial setup"
   - Click "Commit to main"

4. **Publish to GitHub**
   - Click "Publish repository"
   - Name: `batch-affidavit-generator`
   - Description: "Batch affidavit generator for process server"
   - Uncheck "Keep this code private" (or leave checked)
   - Click "Publish Repository"

### Option B: Using Command Line

```bash
cd batch_affidavit_web
git init
git add .
git commit -m "Initial setup"
git branch -M main

# Go to github.com and create new repository called "batch-affidavit-generator"
# Then:

git remote add origin https://github.com/YOUR_USERNAME/batch-affidavit-generator.git
git push -u origin main
```

---

## Step 3: Deploy to Netlify (15 minutes)

### 3.1 Connect GitHub Repository

1. **Go to Netlify**
   - Open https://app.netlify.com
   - Log in

2. **Add New Site**
   - Click "Add new site" button
   - Select "Import an existing project"

3. **Connect to Git Provider**
   - Click "GitHub"
   - Click "Authorize Netlify" if prompted
   - Grant access to your repositories

4. **Select Repository**
   - Find "batch-affidavit-generator"
   - Click on it

### 3.2 Configure Build Settings

**Site settings:**
- Branch to deploy: `main`
- Build command: (leave empty)
- Publish directory: `.` (just a period)
- Functions directory: `netlify/functions` (should auto-detect)

Click **"Deploy site"**

### 3.3 Wait for Initial Deploy

- Watch the deploy log
- Should take 1-2 minutes
- Will show "Site is live" when done
- ⚠️ **Won't work yet** - need to add API key

### 3.4 Add Environment Variables

1. **Go to Site Settings**
   - Click "Site settings" button
   - Find "Environment variables" in left sidebar

2. **Add API Key**
   - Click "Add a variable"
   - Click "Add a single variable"
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your actual API key)
   - Click "Create variable"

### 3.5 Redeploy with API Key

1. **Go to Deploys Tab**
   - Click "Deploys" at top

2. **Trigger New Deploy**
   - Click "Trigger deploy" dropdown
   - Select "Deploy site"
   - Wait 1-2 minutes

3. **Site is Ready!**
   - Click "Open production deploy"
   - You'll see your affidavit generator
   - Copy the URL

---

## Step 4: Customize Site Name (Optional - 2 minutes)

Your site URL is something like: `random-name-12345.netlify.app`

To make it memorable:

1. Go to **Site settings**
2. Click **Domain management**
3. Click **Options** → **Edit site name**
4. Enter: `mettam-affidavits` (or whatever you want)
5. Save
6. New URL: `https://mettam-affidavits.netlify.app`

---

## Step 5: Test the System (10 minutes)

### 5.1 Test with One GPC

1. **Open your site** (the Netlify URL)
2. **Upload one test GPC**
   - Drag and drop or click to browse
   - Wait for "Affidavit generated successfully"
3. **Download the affidavit**
   - Click download button
   - Opens in your Downloads folder

### 5.2 Verify Generated Affidavit

Open the downloaded Word document and check:

- ✅ Registry filled in correctly
- ✅ Case number filled in correctly
- ✅ Claimant filled in correctly
- ✅ Defendant(s) filled in correctly
- ✅ Service date field is blank
- ✅ Service time field is blank
- ✅ Service place field is blank
- ✅ Checkboxes show ☐ (unchecked)

### 5.3 Test Manual Entry

In the Word document:
1. Try typing in the service date field
2. Try typing in the service time field
3. Try typing in the service place field
4. Try checking the checkboxes
5. Save the document

Everything should work smoothly!

### 5.4 Test with Multiple GPCs

1. Upload 2-3 GPCs at once
2. Wait for all to process
3. Click "Download All Affidavits"
4. Check each generated document
5. Verify all data is correct

---

## Step 6: Train Your Process Server (10 minutes)

### Show Them:

1. **The URL** - Have them bookmark it
2. **Upload process** - Drag and drop demo
3. **Download process** - Show download button
4. **Where files go** - Show Downloads folder
5. **How to fill in service details** - Open Word doc and demonstrate

### Give Them:

- The URL (bookmarked)
- This guide (print or email)
- Contact info if issues arise

---

## Deployment Checklist

Before considering deployment complete:

- [ ] GitHub repository created
- [ ] All files uploaded (including template)
- [ ] Netlify site deployed
- [ ] ANTHROPIC_API_KEY added
- [ ] Site redeployed after adding key
- [ ] Tested with 1 GPC
- [ ] Tested with multiple GPCs
- [ ] Verified case data fills correctly
- [ ] Verified service fields are blank
- [ ] Site URL bookmarked
- [ ] Process server trained
- [ ] Contact info shared for support

---

## Troubleshooting

### "Template file not found"

**Problem:** Template not in correct location

**Fix:**
1. Check `affidavit-template.docx` is in `netlify/functions/` folder
2. Commit the file to GitHub
3. GitHub Desktop: "Commit to main" → "Push origin"
4. Redeploy on Netlify

### "Failed to extract data"

**Problem:** PDF couldn't be read by Claude

**Fix:**
- Try different GPC
- Check PDF is real PDF (not scanned image)
- Check PDF isn't password-protected
- Try re-scanning if scanned document

### "Failed to render template"

**Problem:** Template variables incorrect

**Fix:**
- Check variable names match exactly
- See TEMPLATE-GUIDE.md
- Verify using curly braces: `{variable}`
- Check defendant loop syntax

### API Key Error

**Problem:** API key not set or incorrect

**Fix:**
1. Go to Netlify → Site settings → Environment variables
2. Check `ANTHROPIC_API_KEY` exists
3. Check value is correct (starts with `sk-ant-`)
4. Redeploy site after fixing

### Site Won't Load

**Problem:** Deployment failed

**Fix:**
1. Check Netlify deploy logs
2. Look for error messages
3. Verify all files present in GitHub
4. Try deploying again

---

## Updating the System

### To Update Template:

1. Edit `affidavit-template.docx` locally
2. Save changes
3. In GitHub Desktop:
   - Changes will appear
   - Add commit message: "Updated template"
   - Click "Commit to main"
   - Click "Push origin"
4. Netlify auto-deploys (watch deploy log)
5. Test with new template

### To Update Code:

Same process as updating template - commit and push changes.

---

## Monitoring Usage

### Check API Usage:

1. Go to https://console.anthropic.com
2. View API usage
3. Should be ~$0.01-0.02 per GPC
4. Monthly cost should be under $5

### Check Netlify Usage:

1. Go to Netlify dashboard
2. Check bandwidth usage
3. Should be well under free tier limits
4. No charges unless you upgrade

---

## Support Resources

### Netlify Issues:
- Docs: https://docs.netlify.com
- Support: https://answers.netlify.com
- Check deploy logs in dashboard

### Anthropic API Issues:
- Docs: https://docs.anthropic.com
- Check API key validity
- Monitor usage and limits

### Template Issues:
- See TEMPLATE-GUIDE.md
- Test with simple template first
- Check variable names match

### General Issues:
- Check browser console (F12)
- Try different browser
- Contact Greg at Mettam Legal

---

## What's Next?

After successful deployment:

1. ✅ Use it with real work
2. ✅ Gather feedback from process server
3. ✅ Refine template if needed
4. ✅ Track time savings
5. ✅ Consider enhancements

---

## Success!

If you've completed all steps and testing passed, you're done!

**Your process server can now:**
- Upload multiple GPCs
- Get affidavits in minutes
- Fill in service details in Word
- Save significant time

**Time saved per batch of 20:** ~70 minutes

**Congratulations on deploying the system!** 🎉
