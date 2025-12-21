import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Validate required fields
    const required = ['caseNumber', 'claimant', 'defendantName', 'allDefendants'];
    for (const field of required) {
      if (!data[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    // Load the template
    const templatePath = join(process.cwd(), 'netlify', 'functions', 'Form_11_-_Affidavit_of_Service.docx');
    const content = readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '[', end: ']' }
    });

    // Prepare template data
    const templateData = {
      'Case number': data.caseNumber || '',
      'Claimant': data.claimant || '',
      'Name': data.defendantName || '',
      'Date': '',
      'time am/pm': '',
      'Place': '',
      'Name of process': 'General Procedure Claim'
    };

    // Fill defendant slots (all 6)
    for (let i = 0; i < 6; i++) {
      const defNum = i + 1;
      templateData[`Defendant${defNum}`] = (i < data.allDefendants.length) ? data.allDefendants[i] : '';
    }
    
    // Determine ordinal (First, Second, etc.)
    const defendantIndex = data.allDefendants.findIndex(d => d === data.defendantName);
    const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
    templateData['Defendant'] = (defendantIndex >= 0) ? `${ordinals[defendantIndex]} Defendant` : 'Defendant';

    // Render the document
    doc.render(templateData);
    
    // Save to temporary file
    const tempPath = '/tmp/temp_affidavit.docx';
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    writeFileSync(tempPath, buf);
    
    // Use Python to remove empty defendant tables
    const defendantCount = data.allDefendants.length;
    const cleanedPath = '/tmp/cleaned_affidavit.docx';
    
    const pythonScript = `
from docx import Document

doc = Document('${tempPath}')
defendant_count = ${defendantCount}

# Identify tables to remove (empty defendants)
tables_to_remove = []

for idx in range(len(doc.tables)):
    table = doc.tables[idx]
    if len(table.rows) > 0:
        label = table.rows[0].cells[0].text.strip()
        
        # Check if this is an empty defendant table
        if 'Third Defendant' in label and defendant_count < 3:
            tables_to_remove.append(table._element)
        elif 'Fourth Defendant' in label and defendant_count < 4:
            tables_to_remove.append(table._element)
        elif 'Fifth Defendant' in label and defendant_count < 5:
            tables_to_remove.append(table._element)
        elif 'Sixth Defendant' in label and defendant_count < 6:
            tables_to_remove.append(table._element)

# Remove tables and their spacing paragraphs
for tbl_elem in tables_to_remove:
    parent = tbl_elem.getparent()
    # Also remove the paragraph after the table (spacing)
    tbl_pos = list(parent).index(tbl_elem)
    if tbl_pos + 1 < len(parent):
        next_elem = parent[tbl_pos + 1]
        if next_elem.tag.endswith('}p'):
            parent.remove(next_elem)
    parent.remove(tbl_elem)

doc.save('${cleanedPath}')
`;

    // Execute Python script to clean document
    await new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', pythonScript]);
      let stderr = '';
      
      python.stderr.on('data', (data) => { stderr += data.toString(); });
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python cleanup failed: ${stderr}`));
        }
      });
    });
    
    // Read the cleaned document
    const finalBuf = readFileSync(cleanedPath);

    // Create filename
    const safeDefendantName = data.defendantName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeCaseNumber = data.caseNumber.replace(/\//g, '-');
    const filename = `Affidavit_${safeCaseNumber}_${safeDefendantName}.docx`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: finalBuf.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error generating affidavit:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to generate affidavit',
        details: error.message 
      })
    };
  }
};