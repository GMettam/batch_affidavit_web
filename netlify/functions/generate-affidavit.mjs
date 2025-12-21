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
    const required = ['caseNumber', 'claimant', 'defendants', 'defendantName'];
    
    for (const field of required) {
      if (!data[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    // Validate defendants is an array
    if (!Array.isArray(data.defendants) || data.defendants.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'defendants must be a non-empty array' })
      };
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

    // Prepare the data for template
    const templateData = {
      'Case number': data.caseNumber,
      'Claimant': data.claimant,
      'Name': data.defendantName, // The specific defendant THIS affidavit is for
      'Date': '', // BLANK - to be filled in manually
      'time am/pm': '', // BLANK - to be filled in manually
      'Place': '', // BLANK - to be filled in manually
      'Name of process': 'General Procedure Claim'
    };

    // Add up to 6 defendants
    // Fill in the defendants we have, leave the rest blank
    for (let i = 0; i < 6; i++) {
      const defNum = i + 1;
      if (i < data.defendants.length) {
        // We have a defendant for this slot
        templateData[`Defendant${defNum}`] = data.defendants[i].name;
      } else {
        // No defendant for this slot - leave blank
        templateData[`Defendant${defNum}`] = '';
      }
    }

    // Also handle the old [Defendant, First Defendant, etc.] field if it exists
    templateData['Defendant, First Defendant, etc.'] = data.defendantName;
    
    // Determine which defendant this is (First, Second, etc.)
    const defendantIndex = data.defendants.findIndex(d => d.name === data.defendantName);
    const defendantOrdinal = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'][defendantIndex] || 'First';
    templateData['Defendant'] = `${defendantOrdinal} Defendant`;

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
