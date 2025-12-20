import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Validate required fields - NO SERVICE DETAILS REQUIRED
    const required = ['caseNumber', 'claimant', 'defendantName', 'defendantAddress'];
    
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
    
    // Create a new zip file from the template
    const zip = new PizZip(content);
    
    // First, handle the bracket fields with docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '[',
        end: ']'
      }
    });

    // Prepare the data for bracket fields - BLANK service details
    const templateData = {
      'Name': data.defendantName,
      'Date': '', // BLANK - to be filled in manually
      'time am/pm': '', // BLANK - to be filled in manually
      'Place': '', // BLANK - to be filled in manually
      'Name of process': 'General Procedure Claim',
      'Defendant, First Defendant, etc.': data.defendantName
    };

    // Render the bracket fields
    doc.render(templateData);
    
    // Get the rendered document as a buffer
    const renderedZip = doc.getZip();
    
    // Now we need to manually insert case number, claimant, and defendant into table cells
    // Extract the document.xml
    let documentXml = renderedZip.file('word/document.xml').asText();
    
    // Find and replace empty cells in the table structure
    // This is a simplified approach - we're looking for the table structure and inserting text
    
    // For Case number (in Table 0, after "Case number:" label)
    // Looking for pattern: <w:tc>...</w:tc> that comes after "Case number:"
    const caseNumberPattern = /(Case number:[\s\S]*?<w:tc>[\s\S]*?<w:p>)([\s\S]*?)(<\/w:p>)/;
    documentXml = documentXml.replace(caseNumberPattern, (match, before, content, after) => {
      // If the cell is empty or just whitespace, insert the case number
      if (!content.trim() || content.includes('<w:t></w:t>') || !content.includes('<w:t>')) {
        return before + `<w:r><w:t>${data.caseNumber}</w:t></w:r>` + after;
      }
      return match;
    });
    
    // For Claimant (in Table 1, cell after "Claimant" label)
    const claimantPattern = /(Claimant<\/w:t>[\s\S]*?<w:tc>[\s\S]*?<w:p>)([\s\S]*?)(<\/w:p>)/;
    documentXml = documentXml.replace(claimantPattern, (match, before, content, after) => {
      if (!content.trim() || content.includes('<w:t></w:t>') || !content.includes('<w:t>')) {
        return before + `<w:r><w:t>${data.claimant}</w:t></w:r>` + after;
      }
      return match;
    });
    
    // For Defendant (in Table 2, cell after "Defendant" label)
    const defendantPattern = /(Defendant<\/w:t>[\s\S]*?<w:tc>[\s\S]*?<w:p>)([\s\S]*?)(<\/w:p>)/;
    documentXml = documentXml.replace(defendantPattern, (match, before, content, after) => {
      if (!content.trim() || content.includes('<w:t></w:t>') || !content.includes('<w:t>')) {
        return before + `<w:r><w:t>${data.defendantName}</w:t></w:r>` + after;
      }
      return match;
    });
    
    // Put the modified XML back into the zip
    renderedZip.file('word/document.xml', documentXml);
    
    // Generate the final document as a buffer
    const buf = renderedZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // Create a safe filename
    const safeDefendantName = data.defendantName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeCaseNumber = data.caseNumber.replace(/\//g, '-');
    const filename = `Affidavit_${safeCaseNumber}_${safeDefendantName}.docx`;

    // Return the document
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to generate affidavit',
        details: error.message 
      })
    };
  }
};
