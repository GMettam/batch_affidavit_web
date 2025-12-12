const fs = require('fs');
const path = require('path');

// Read the template file
const templatePath = process.argv[2];
const functionPath = process.argv[3];

if (!templatePath || !functionPath) {
  console.error('Usage: node embed-template.js <template.docx> <function.js>');
  process.exit(1);
}

// Read template and convert to base64
const templateBuffer = fs.readFileSync(templatePath);
const templateBase64 = templateBuffer.toString('base64');

// Create the new function code
const functionCode = `const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Template embedded as base64 - no file system access needed!
const TEMPLATE_BASE64 = '${templateBase64}';

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
          body: JSON.stringify({ error: \`Missing required field: \${field}\` })
        };
      }
    }

    // Decode the embedded template
    const content = Buffer.from(TEMPLATE_BASE64, 'base64');

    // Create a new document
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });

    // Prepare defendant data
    const defendantsData = data.defendants.map((defendant, index) => ({
      number: index === 0 ? 'First' : index === 1 ? 'Second' : \`\${index + 1}th\`,
      name: defendant.name,
      address: defendant.address
    }));

    // Set the template variables
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
      
      // Additional fields
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
          details: error.message
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
        'Content-Disposition': \`attachment; filename="Affidavit_\${data.caseNumber.replace(/\\//g, '-')}.docx"\`
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
`;

// Write the new function
fs.writeFileSync(functionPath, functionCode);
console.log(`✓ Created ${functionPath} with embedded template`);
console.log(`  Template size: ${Math.round(templateBase64.length / 1024)}KB`);
