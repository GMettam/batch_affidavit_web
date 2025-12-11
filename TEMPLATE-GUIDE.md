# Template Preparation Guide

## Understanding Template Variables

Your Word template needs **merge fields** (variables) that the system will replace with data.

---

## Two Types of Fields

### 1. **Auto-Filled Fields** (from GPC extraction)
These are filled automatically when affidavits are generated:
- Registry
- Case Number
- Claimant information
- Defendant information

### 2. **Blank Fields** (for manual entry in Word)
These are left empty for process server to fill in later:
- Service Date
- Service Time
- Place of Service
- Method checkboxes

---

## How to Add Variables to Your Template

### Method 1: Type Directly (Simplest)

Just type the variable names with curly braces:

```
Registry: {registry}
Case No: {caseNumber}
Claimant: {claimant}

Service Date: {serviceDate}
Service Time: {serviceTime}
```

### Method 2: Use Word Fields (More Complex)

This is the traditional mail merge approach, but Method 1 is simpler and works fine.

---

## Complete Variable List

### Case Data Variables (Auto-Filled)

```
{registry}          - Full registry address
                      Example: "Central Law Courts, 501 Hay Street, PERTH WA 6000"

{caseNumber}        - Case number
                      Example: "1148/2023"

{claimant}          - Claimant name
                      Example: "ROY GALVIN & CO. PTY. LTD."

{claimantAddress}   - Claimant address
                      Example: "3-5 Sundercombe Street, OSBORNE PARK WA 6017"
```

### Defendant Loop (Auto-Filled)

For multiple defendants, use a loop:

```
{#defendants}
  {number} Defendant: {name}
  Address for service: {address}
{/defendants}
```

This will generate:
```
First Defendant: Gregory James MOYNIHAN
Address for service: 59 Goddard Street, LATHLAIN WA 6100

Second Defendant: John SMITH
Address for service: 123 Main Street, PERTH WA 6000
```

### Service Detail Variables (Blank)

```
{serviceDate}           - Blank (process server fills in)
{serviceTime}           - Blank (process server fills in)
{servicePlace}          - Blank (process server fills in)
{personalService}       - Shows ☐ (unchecked box)
{postalService}         - Shows ☐ (unchecked box)
{substitutedService}    - Shows ☐ (unchecked box)
```

---

## Example Template

Here's a complete example showing correct variable usage:

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

_____________________________________________________________________________

AFFIDAVIT OF SERVICE

_____________________________________________________________________________

I, [NAME], of [ADDRESS], [OCCUPATION], make oath and say:

1. I am a Licensed Process Server operating in Western Australia.

2. On {serviceDate} at {serviceTime}, I attended at {servicePlace}.

3. I served the following documents:
   • General Procedure Claim
   • Statement of Claim

4. The documents were served upon:
{#defendants}
   • {name}
     Address for service: {address}
{/defendants}

5. Method of service:
   {personalService} Personal service (handed directly to defendant)
   {postalService} Postal service (sent by registered post)
   {substitutedService} Substituted service (as per court order)

6. I am a licensed process server and familiar with the requirements for service under the Magistrates Court (Civil Proceedings) Rules 2005.


SWORN by [NAME]
at [PLACE] this [DATE]


_________________________
Signature


Before me:

_________________________
Justice of the Peace / Lawyer
```

---

## Important Template Rules

### ✅ DO:
- Use curly braces: `{variable}`
- Use exact variable names as listed above
- Keep consistent formatting
- Leave space for manual entry fields
- Use the defendant loop for multiple defendants
- Save as .docx format (not .doc)

### ❌ DON'T:
- Use square brackets: `[variable]`
- Use different variable names
- Use special fonts or formatting on variables
- Put variables inside text boxes or shapes
- Use old .doc format
- Merge cells in tables containing variables

---

## Defendant Loop Explained

The system can handle 1-2+ defendants automatically.

**Template code:**
```
{#defendants}
{number} Defendant: {name}
Address for service: {address}
{/defendants}
```

**With 1 defendant, generates:**
```
First Defendant: Gregory James MOYNIHAN
Address for service: 59 Goddard Street, LATHLAIN WA 6100
```

**With 2 defendants, generates:**
```
First Defendant: Gregory James MOYNIHAN
Address for service: 59 Goddard Street, LATHLAIN WA 6100

Second Defendant: Mary SMITH
Address for service: 45 Example Road, PERTH WA 6000
```

The `{number}` automatically becomes "First", "Second", etc.

---

## Testing Your Template

### Step 1: Create Template
1. Open Word
2. Add your standard affidavit text
3. Replace specific values with variables
4. Save as `affidavit-template.docx`

### Step 2: Check Variables
Make sure you have:
- ✅ All case data variables
- ✅ Defendant loop with correct syntax
- ✅ All service detail variables
- ✅ Correct curly brace format

### Step 3: Test Generation
1. Upload template to Netlify functions folder
2. Redeploy site
3. Upload a test GPC
4. Download generated affidavit
5. Check all data filled correctly
6. Check service fields are blank

### Step 4: Manual Entry Test
1. Open generated affidavit in Word
2. Try filling in service details manually
3. Make sure there's enough space
4. Check formatting looks good
5. Save and review

---

## Common Template Problems

### Problem: Variable shows as {registry} in output

**Cause:** Variable name is wrong or template engine couldn't parse it

**Fix:**
- Check spelling exactly matches
- Check using curly braces `{` not special characters
- Check no extra spaces: `{registry}` not `{ registry }`

### Problem: Defendants don't show up

**Cause:** Loop syntax incorrect

**Fix:**
Must use exact format:
```
{#defendants}
  content here with {name}, {address}, etc.
{/defendants}
```

### Problem: Checkboxes show weird characters

**Cause:** Font doesn't support Unicode checkbox characters

**Fix:**
- Use standard fonts (Arial, Times New Roman)
- Don't use custom fonts
- The system will insert ☐ automatically

### Problem: Template won't load

**Cause:** File corrupt or wrong format

**Fix:**
- Save as .docx (not .doc)
- Open in Word and re-save
- Create new template from scratch if needed

---

## Advanced Template Features

### Conditional Text

If you want text to appear only when certain conditions are met:

```
{#personalService}
The documents were personally handed to the defendant.
{/personalService}
```

But for this simple system, it's easier to just leave checkboxes and have the process server describe the service method in a text field.

### Multiple Service Methods

If defendant served by multiple methods:

```
Service method(s):
{personalService} Personal service
{postalService} Postal service  
{substitutedService} Substituted service
```

Process server checks multiple boxes if applicable.

---

## Template Checklist

Before deploying, verify:

- [ ] File named exactly `affidavit-template.docx`
- [ ] Saved as .docx (not .doc)
- [ ] All variables use `{variable}` format
- [ ] Defendant loop uses correct syntax
- [ ] Service fields are placeholders (will be blank)
- [ ] No special fonts or formatting on variables
- [ ] Tested opening in Word
- [ ] Template looks professional
- [ ] Spacing appropriate for manual entry
- [ ] Complies with court formatting requirements

---

## Getting Help

If your template isn't working:

1. **Check variable names** - Must match exactly
2. **Check syntax** - Curly braces and defendant loop
3. **Test with simple template** - Remove complexity and test
4. **Check Netlify logs** - See error messages
5. **Contact Greg** - For template-specific issues

---

## Template Tips

### For Best Results:

1. **Keep it simple** - Don't use complex Word features
2. **Standard fonts** - Arial, Times New Roman, Calibri
3. **Clear spacing** - Room for manual entry
4. **Test early** - Upload and test before going live
5. **Multiple versions** - Keep backups as you refine

### Making Changes:

1. Edit template locally
2. Save as `affidavit-template.docx`
3. Replace file in `netlify/functions/` folder
4. Commit to GitHub
5. Redeploy on Netlify
6. Test with sample GPC

---

## Example: Minimal Working Template

The simplest possible template:

```
AFFIDAVIT OF SERVICE

Case: {caseNumber}
Registry: {registry}

Claimant: {claimant}

Defendant(s):
{#defendants}
- {name}
{/defendants}

Served on: {serviceDate}
At: {serviceTime}
Location: {servicePlace}

Method:
{personalService} Personal
{postalService} Postal
{substitutedService} Substituted


_________________
Process Server
```

Start with something simple like this, then add your formatting and legal requirements.

---

## Ready to Deploy?

Once your template is ready:

1. ✅ Save as `affidavit-template.docx`
2. ✅ Place in `netlify/functions/` folder
3. ✅ Commit to GitHub
4. ✅ Deploy to Netlify
5. ✅ Test with real GPC
6. ✅ Refine as needed

See SETUP-GUIDE.md for deployment instructions!
