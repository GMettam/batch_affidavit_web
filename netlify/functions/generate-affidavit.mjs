import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { readFileSync } from 'fs';
import { join } from 'path';

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
    
    // Get the rendered zip
    const renderedZip = doc.getZip();
    
    // Remove empty defendant tables using XML manipulation
    const defendantCount = data.allDefendants.length;
    
    if (defendantCount < 6) {
      // Get the document XML
      let documentXml = renderedZip.file('word/document.xml').asText();
      
      // Remove tables for defendants we don't need
      const defendantsToRemove = [];
      if (defendantCount < 3) defendantsToRemove.push('Third Defendant');
      if (defendantCount < 4) defendantsToRemove.push('Fourth Defendant');
      if (defendantCount < 5) defendantsToRemove.push('Fifth Defendant');
      if (defendantCount < 6) defendantsToRemove.push('Sixth Defendant');
      
      for (const defendantLabel of defendantsToRemove) {
        // Find and remove the table containing this defendant label
        // Pattern: <w:tbl>...defendantLabel...</w:tbl> followed by optional spacing paragraph
        const tablePattern = new RegExp(
          `<w:tbl>([\\s\\S]*?)<w:t>${defendantLabel}</w:t>([\\s\\S]*?)</w:tbl>(?:\\s*<w:p[^>]*>\\s*<w:pPr/>\\s*</w:p>)?`,
          'g'
        );
        
        documentXml = documentXml.replace(tablePattern, '');
      }
      
      // Update the XML in the zip
      renderedZip.file('word/document.xml', documentXml);
    }
    
    // Generate the final buffer
    const buf = renderedZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

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
      body: buf.toString('base64'),
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