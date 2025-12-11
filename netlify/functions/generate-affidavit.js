const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);

    // Validate required fields from GPC extraction
    const required = ['registry', 'caseNumber', 'claimant', 'defendants'];
    
    for (const field of required) {
      if (!data[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    // Load the template
    const templatePath = path.join(__dirname, 'affidavit-template.docx');
    
    if (!fs.existsSync(templatePath)) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Template file not found',
          details: 'affidavit-template.docx must be placed in netlify/functions/ folder'
        })
      };
    }

    const content = fs.readFileSync(templatePath, 'binary');

    // Create a new document
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    // Prepare defendant data
    const defendantsData = data.defendants.map((defendant, index) => ({
      number: index === 0 ? 'First' : index === 1 ? 'Second' : `${index + 1}th`,
      name: defendant.name,
      address: defendant.address
    }));

    // Set the template variables
    // IMPORTANT: Service detail fields are left EMPTY for manual entry later
    doc.setData({
      // Case data from GPC
      registry: data.registry,
      caseNumber: data.caseNumber,
      claimant: data.claimant,
      claimantAddress: data.claimantAddress || '',
      defendants: defendantsData,
      
      // Service details - ALL BLANK for manual entry in Word
      serviceDate: '',
      serviceTime: '',
      servicePlace: '',
      
      // Checkboxes - all unchecked
      personalService: '☐',
      postalService: '☐',
      substitutedService: '☐',
      
      // Additional fields that might be in template
      personalServiceChecked: false,
      postalServiceChecked: false,
      substitutedServiceChecked: false
    });

    try {
      doc.render();
    } catch (error) {
      console.error('Template render error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to render template',
          details: error.message,
          suggestion: 'Check that your template uses the correct variable names'
        })
      };
    }

    // Generate the document
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // Return the document
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Affidavit_${data.caseNumber.replace(/\//g, '-')}.docx"`
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to generate affidavit',
        details: error.message 
      })
    };
  }
};
