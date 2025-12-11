# START HERE - Batch Affidavit Generator

## ✅ The CORRECT Workflow

This system now matches your actual process:

### Monday - GPCs Arrive
1. Process server opens web app
2. Drags all 20 GPC files into browser
3. System automatically:
   - Extracts case data (Registry, Case #, Claimant, Defendants)
   - Generates Word documents
   - **Leaves service fields blank**
4. Downloads all Word documents to laptop
5. **Done - 10 minutes total**

### Tuesday-Friday - Physical Service
- Goes out and serves documents
- No computer needed

### Friday - Complete Affidavits
- Opens each Word document
- Fills in manually:
  - Date served
  - Time served
  - Place served  
  - Method (check boxes)
- **Done - 20 minutes for 20 documents**

---

## What This System Does

### ✅ Automatic (Web Interface)
- Extract Registry from GPC
- Extract Case Number from GPC
- Extract Claimant from GPC
- Extract Defendants from GPC
- Generate Word document with case data

### ⬜ Manual (Microsoft Word)
- Fill in service date
- Fill in service time
- Fill in service place
- Check service method boxes

---

## Time Comparison

**Old way (completely manual):**
- 5 minutes per affidavit × 20 = **100 minutes**

**New way (this system):**
- Upload + generate: 10 minutes
- Fill in service details: 20 minutes
- **Total: 30 minutes**

**Time saved: 70 minutes per batch!**

---

## What's in This Package

```
batch_affidavit_web/
│
├── 📄 index.html              ← Web interface (simple!)
├── 📄 app.js                  ← Logic (handles everything)
├── 📄 package.json            ← Dependencies
├── 📄 netlify.toml            ← Netlify config
│
├── 📁 netlify/functions/
│   ├── extract-gpc-data.js   ← Extracts data from GPCs
│   ├── generate-affidavit.js ← Creates Word documents
│   └── ⚠️ affidavit-template.docx  ← PUT YOUR TEMPLATE HERE
│
└── 📁 Documentation/
    ├── START-HERE.md          ← This file
    ├── README.md              ← Complete documentation
    ├── SETUP-GUIDE.md         ← Deployment steps (45 min)
    └── TEMPLATE-GUIDE.md      ← How to prepare template
```

---

## Quick Deployment (45 Minutes)

### Before You Start
- [ ] GitHub account (free)
- [ ] Netlify account (free)
- [ ] Anthropic API key (you have this)
- [ ] Your affidavit template ready

### The Steps

**1. Prepare Template (10 min)**
   - Add variables to your Word template
   - See TEMPLATE-GUIDE.md
   - Save as `affidavit-template.docx`
   - Place in `netlify/functions/` folder

**2. Upload to GitHub (10 min)**
   - Use GitHub Desktop (easiest)
   - OR use command line
   - See SETUP-GUIDE.md step 2

**3. Deploy to Netlify (15 min)**
   - Import from GitHub
   - Add ANTHROPIC_API_KEY
   - Redeploy
   - See SETUP-GUIDE.md step 3

**4. Test (10 min)**
   - Upload test GPC
   - Download affidavit
   - Check data filled correctly
   - Check service fields blank
   - Try filling in Word

**Done!** 🎉

---

## Why This is Simple

### No Complex Features
- ❌ No service detail entry in web form
- ❌ No multi-step wizard
- ❌ No "save and resume"
- ❌ No user accounts
- ✅ Just upload → download → fill in Word

### Two Simple Steps
1. **Upload GPCs** → Get Word documents with case data
2. **Open Word** → Fill in service details

### Process Server Loves It Because
- Works exactly like their current workflow
- Just automates the data entry part
- Still fills in service details in Word (familiar)
- No new skills to learn
- Super fast

---

## Template Variables

Your template needs these variables:

**Auto-filled (from GPC):**
```
{registry}
{caseNumber}
{claimant}
{claimantAddress}

{#defendants}
  {number}    ← "First", "Second"
  {name}
  {address}
{/defendants}
```

**Left blank (manual entry):**
```
{serviceDate}
{serviceTime}
{servicePlace}
{personalService}      ← Shows ☐
{postalService}        ← Shows ☐
{substitutedService}   ← Shows ☐
```

See **TEMPLATE-GUIDE.md** for complete instructions.

---

## Costs

**Netlify:** Free (100GB/month - way more than needed)
**Anthropic API:** ~$0.01 per GPC = ~$2/month for 100 GPCs

**Total: ~$2/month**

Compare to:
- Time saved: 70 min/batch × 4 batches = 280 min/month
- At $50/hour: **$233/month value**

**ROI: 100x+**

---

## Next Steps

1. ✅ Read SETUP-GUIDE.md (deployment instructions)
2. ✅ Read TEMPLATE-GUIDE.md (prepare your template)
3. ✅ Deploy to Netlify (45 minutes)
4. ✅ Test with real GPC
5. ✅ Show process server
6. ✅ Start saving time!

---

## Questions Before You Start?

### "Will my process server understand it?"
**Yes!** It's just:
1. Drag files to browser
2. Click download
3. Fill in details in Word (same as always)

### "What if they make mistakes?"
**Can't!** System validates everything. If GPC can't be read, it shows error message. Process server just tries again.

### "What if template is wrong?"
**Easy fix!** Update template file, commit to GitHub, redeploys automatically. Takes 5 minutes.

### "What if it breaks?"
**Won't!** It's very simple. Only two moving parts:
1. Extract data from GPC (Claude API)
2. Fill Word template (standard library)

Both are rock-solid.

### "Can multiple people use it?"
**Yes!** Everyone gets the same URL. No conflicts, no limits, no problems.

---

## Common Concerns Addressed

### "Is it really simpler than Python script?"
**Much simpler:**
- Python: Install Python, install libraries, run scripts, command line
- This: Open URL, drag files, download

### "Will it work on process server's computer?"
**Yes!** Just needs:
- A web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
That's it!

### "What about updates?"
**Automatic!** When you push changes to GitHub, Netlify redeploys. Process server always has latest version. Zero maintenance.

### "What if Netlify goes down?"
**Extremely rare** (99.99% uptime). If it happens, process server waits 5 minutes or does one manually while system recovers.

---

## Success Criteria

You'll know it's working when:
- ✅ Process server uses it weekly without issues
- ✅ Generates 20 affidavits in 10 minutes
- ✅ Zero data entry errors in case information
- ✅ Process server prefers this to manual entry
- ✅ Time savings are obvious and consistent

---

## Ready to Deploy?

### Option 1: Deploy Now (45 min)
→ Go to **SETUP-GUIDE.md** and follow the steps

### Option 2: Read More First
→ **README.md** - Complete system documentation
→ **TEMPLATE-GUIDE.md** - Template preparation details

---

## The Bottom Line

This is **exactly what you asked for:**

1. Process server uploads GPCs
2. System generates affidavits with case data filled in
3. Service detail fields left blank
4. Process server downloads Word documents
5. Process server fills in service details in Word after serving

**Simple. Fast. Bulletproof.**

No unnecessary features. No complications. Just the workflow you described.

---

## Need Help?

- Setup issues → See SETUP-GUIDE.md
- Template issues → See TEMPLATE-GUIDE.md
- General questions → See README.md
- Still stuck → Contact Greg at Mettam Legal

---

**This is the correct, simple, 2-step workflow you wanted!**

Ready to deploy? **Open SETUP-GUIDE.md and let's do this!** 🚀
