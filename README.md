# Batch Affidavit Generator - Web Interface

## The Correct Workflow

This system matches your process server's actual workflow:

### Monday Morning - GPCs Arrive
1. Open the web app
2. Drag and drop all 20 GPC files
3. System automatically:
   - Extracts Registry, Case Number, Claimant, Defendants
   - Generates 20 Word documents with case data filled in
   - Leaves service detail fields BLANK
4. Download all 20 Word documents to laptop
5. **Done with computer** - takes 5-10 minutes

### Tuesday-Thursday - Physical Service
- Process server goes out and serves documents
- No computer needed

### Friday Afternoon - Complete Affidavits
- Open each Word document on laptop
- Fill in service details manually:
  - Date served
  - Time served
  - Place served
  - Method (check boxes)
- Save the completed affidavits
- **Done** - takes 15-20 minutes for 20 documents

---

## Simple 2-Step Web Process

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Upload GPCs                                    │
│  • Drag & drop 20 PDF files                             │
│  • Wait 5 minutes for automatic processing              │
│                                                          │
│  STEP 2: Download Affidavits                            │
│  • Download all Word documents                          │
│  • Fill in service details later in Word                │
└─────────────────────────────────────────────────────────┘
```

---

## What Gets Extracted Automatically

From each GPC, the system extracts:
- ✅ Registry (full address)
- ✅ Case Number
- ✅ Claimant name and address
- ✅ Defendant(s) name and address for service

---

## What Gets Left Blank (For Manual Entry in Word)

These fields are left empty for the process server to fill in later:
- ⬜ Service Date
- ⬜ Service Time
- ⬜ Place of Service
- ⬜ Method of Service (checkboxes)

---

## Time Savings

### Old Way (Completely Manual)
- Create each affidavit from scratch: 5 minutes
- 20 affidavits = **100 minutes total**

### New Way (This System)
- Upload and download: 10 minutes
- Fill in service details in Word: 20 minutes
- 20 affidavits = **30 minutes total**

### **Time Saved: 70 minutes per batch!**

---

## Files in This Package

```
batch_affidavit_web/
├── index.html                    ← Web interface
├── app.js                        ← Application logic
├── package.json                  ← Dependencies
├── netlify.toml                  ← Netlify config
│
├── netlify/functions/
│   ├── extract-gpc-data.js      ← Extracts data from GPCs
│   ├── generate-affidavit.js    ← Creates Word documents
│   └── affidavit-template.docx  ← YOUR TEMPLATE GOES HERE ⚠️
│
└── Documentation/
    ├── README.md                 ← This file
    ├── SETUP-GUIDE.md            ← Deployment instructions
    └── TEMPLATE-GUIDE.md         ← How to prepare your template
```

---

## Quick Start Deployment

### Prerequisites
- GitHub account (free at github.com)
- Netlify account (free at netlify.com)
- Anthropic API key (you already have this)
- Your affidavit Word template

### Step 1: Prepare Your Template (10 minutes)

Your Word template needs these variables:

**Case Data (filled automatically):**
```
{registry}
{caseNumber}
{claimant}
{claimantAddress}
{defendants}
  {number}    ← "First", "Second", etc.
  {name}
  {address}
```

**Service Details (left blank):**
```
{serviceDate}
{serviceTime}
{servicePlace}
{personalService}    ← Shows ☐
{postalService}      ← Shows ☐
{substitutedService} ← Shows ☐
```

Save your template as: `affidavit-template.docx`
Place it in: `netlify/functions/` folder

### Step 2: Upload to GitHub (10 minutes)

**Using GitHub Desktop (Easiest):**
1. Download from desktop.github.com
2. Open GitHub Desktop
3. File → Add Local Repository
4. Select `batch_affidavit_web` folder
5. Publish repository

### Step 3: Deploy to Netlify (15 minutes)

1. Go to netlify.com
2. Log in (or sign up)
3. "Add new site" → "Import an existing project"
4. Choose GitHub
5. Select your repository
6. Build settings:
   - Build command: (leave empty)
   - Publish directory: `.`
7. Deploy!

### Step 4: Add API Key (2 minutes)

1. In Netlify, go to Site settings
2. Environment variables
3. Add variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your API key
4. Save

### Step 5: Redeploy (2 minutes)

1. Go to Deploys tab
2. Trigger deploy → Deploy site
3. Wait for completion

### Step 6: Test (5 minutes)

1. Open your site URL
2. Upload one test GPC
3. Download the generated affidavit
4. Check it has case data filled in
5. Check service fields are blank
6. Try filling in service details in Word

### Done! 🎉

Total deployment time: ~45 minutes

---

## Using the System

### For Process Server

**When GPCs arrive:**
1. Open the URL (bookmark it!)
2. Drag all GPC files into the upload box
3. Wait for "Affidavit generated successfully" messages
4. Click "Download All Affidavits"
5. Save to laptop
6. Close browser

**After serving documents:**
1. Open each Word document
2. Fill in:
   - Date: [the date you served]
   - Time: [the time you served]
   - Place: [the address where served]
   - Method: [check appropriate boxes]
3. Save the document
4. Done!

---

## Template Variable Reference

### Required Variables (Must be in your template)

**Case Information:**
- `{registry}` - Full registry address
- `{caseNumber}` - Case number
- `{claimant}` - Claimant name
- `{claimantAddress}` - Claimant address

**Defendants (Loop):**
```
{#defendants}
  {number} Defendant: {name}
  Address for service: {address}
{/defendants}
```

**Service Details (Left Blank):**
- `{serviceDate}` - Empty string ""
- `{serviceTime}` - Empty string ""
- `{servicePlace}` - Empty string ""
- `{personalService}` - Shows ☐
- `{postalService}` - Shows ☐
- `{substitutedService}` - Shows ☐

### Example Template Structure

```
MAGISTRATES COURT OF WESTERN AUSTRALIA

Registry: {registry}
Case No: {caseNumber}

BETWEEN:
{claimant}
Claimant

AND:
{#defendants}
{name}
{number} Defendant
{/defendants}

AFFIDAVIT OF SERVICE

I, [process server name], of [address], make oath and say:

1. On {serviceDate} at {serviceTime}, I served the following documents at {servicePlace}:
   - General Procedure Claim

2. The documents were served upon:
   {#defendants}
   {name} at {address}
   {/defendants}

3. Method of service:
   {personalService} Personal service
   {postalService} Postal service
   {substitutedService} Substituted service
```

---

## Troubleshooting

### "Failed to extract data"
**Problem:** PDF couldn't be read
**Solution:** 
- Check file is a real PDF (not scanned image)
- Try re-scanning with higher quality
- Check file isn't password-protected

### "Template file not found"
**Problem:** Template not in correct location
**Solution:**
- Place `affidavit-template.docx` in `netlify/functions/` folder
- Commit and push to GitHub
- Redeploy on Netlify

### "Failed to render template"
**Problem:** Template has incorrect variable names
**Solution:**
- Check variable names match exactly
- Use `{variable}` not `{variable}` (curly braces)
- See TEMPLATE-GUIDE.md for details

### Downloaded file won't open in Word
**Problem:** File might be corrupted
**Solution:**
- Try downloading again
- Check you're using recent version of Word
- Try opening in LibreOffice first

### Service fields show weird characters
**Problem:** Template encoding issue
**Solution:**
- Make sure template is saved as .docx (not .doc)
- Re-save template in Word 2016 or later
- Check no special fonts are used

---

## Cost Analysis

### Netlify Hosting
- **Free tier:** 100GB bandwidth, 300 build minutes
- **Usage:** ~1MB per session, ~10 builds/month
- **Cost:** $0/month

### Anthropic API
- **Per GPC:** ~$0.01-0.02
- **20 GPCs:** ~$0.20-0.40
- **100 GPCs/month:** ~$1-2/month

### **Total: ~$1-2/month**

Compare to time saved:
- 70 minutes saved per batch of 20
- 4 batches/month = 280 minutes saved
- At $50/hour = **$233/month value**

**ROI: 100x+**

---

## Security

- ✅ SSL encryption for all transfers
- ✅ API key stored securely (not in code)
- ✅ No permanent data storage
- ✅ Files processed and deleted
- ✅ Hosted on Netlify's secure infrastructure

---

## Browser Support

Works on all modern browsers:
- ✅ Chrome
- ✅ Firefox  
- ✅ Safari
- ✅ Edge

Also works on:
- ✅ Desktop/Laptop (best)
- ✅ Tablets (good)
- ✅ Phones (works but less convenient)

---

## Advantages Over Python Script

| Feature | Python Script | Web Interface |
|---------|---------------|---------------|
| Installation | Complex | Zero |
| Updates | Manual | Automatic |
| Works anywhere | No | Yes |
| Multiple users | No | Yes |
| Training needed | Significant | Minimal |
| Maintenance | Regular | Zero |

---

## Future Enhancements

Easy to add later:
- Automatic email to law firm when done
- Save and resume later feature
- Integration with case management systems
- Batch download as ZIP
- Print all function

---

## Support

**Setup Issues:**
- Check SETUP-GUIDE.md
- Check Netlify function logs
- Check browser console (F12)

**Template Issues:**
- Check TEMPLATE-GUIDE.md
- Verify variable names match exactly
- Test with simple template first

**General Questions:**
- Contact Greg at Mettam Legal
- Check Anthropic docs for API issues
- Check Netlify docs for deployment issues

---

## Success Metrics

You'll know it's working when:
- ✅ Process server uses it without help
- ✅ Generates 20 affidavits in 10 minutes
- ✅ All case data filled in correctly
- ✅ Service fields properly blank
- ✅ Process server prefers it to manual entry
- ✅ Zero data entry errors

---

## Maintenance

**Required:** None! System runs itself.

**Optional:**
- Update template occasionally if format changes
- Check API usage monthly (should be <$5)
- Test occasionally to ensure working

---

## Next Steps

1. ✅ Read SETUP-GUIDE.md
2. ✅ Prepare your template (see TEMPLATE-GUIDE.md)
3. ✅ Deploy to Netlify (45 minutes)
4. ✅ Test with real GPC
5. ✅ Show process server
6. ✅ Start saving time!

---

## Questions?

See other documentation files or contact Greg at Mettam Legal.

**This is the correct, simple workflow - no service detail entry in web interface!**
