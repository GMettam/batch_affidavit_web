import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { readFileSync } from 'fs';
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
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '[',
        end: ']'
      }
    });

    // Prepare the data for template - BLANK service details
    const templateData = {
      'Case number': data.caseNumber,
      'Claimant': data.claimant,
      'Defendant': data.defendantName,
      'Name': data.defendantName,
      'Date': '',
      'time am/pm': '',
      'Place': '',
      'Name of process': 'General Procedure Claim'
    };

    // Render the document
    doc.render(templateData);
    
    // Generate the document as a buffer
    const buf = doc.getZip().generate({
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