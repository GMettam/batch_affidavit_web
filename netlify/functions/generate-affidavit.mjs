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
    
    // Validate required fields
    const required = ['caseNumber', 'claimant', 'defendant', 'defendantAddress', 
                     'serviceDate', 'serviceTime', 'servicePlace', 'serviceMethod'];
    
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

    // Format the date
    const formattedDate = new Date(data.serviceDate).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Prepare the data for template
    const templateData = {
      'Case number': data.caseNumber,
      'Claimant': data.claimant,
      'Defendant': data.defendant,
      'Name': data.defendant, // The defendant name field
      'Date': formattedDate,
      'time am/pm': data.serviceTime,
      'Place': data.servicePlace,
      'Name of process': 'General Procedure Claim'
    };

    // Render the document
    doc.render(templateData);
    
    // Generate the document as a buffer
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // Return the document
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Affidavit_${data.caseNumber}_${data.defendant.replace(/[^a-zA-Z0-9]/g, '_')}.docx"`
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
