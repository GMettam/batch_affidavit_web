import sys
import base64

if len(sys.argv) != 3:
    print('Usage: python embed-template.py <template.docx> <function.js>')
    sys.exit(1)

template_path = sys.argv[1]
function_path = sys.argv[2]

# Read template and convert to base64
with open(template_path, 'rb') as f:
    template_bytes = f.read()
    template_base64 = base64.b64encode(template_bytes).decode('utf-8')

# Create the new function code
function_code = f'''const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Template embedded as base64 - no file system access needed!
const TEMPLATE_BASE64 = '{template_base64}';

exports.handler = async (event) => {{
  if (event.httpMethod !== 'POST') {{
    return {{
      statusCode: 405,
      body: JSON.stringify({{ error: 'Method not allowed' }})
    }};
  }}

  try {{
    const data = JSON.parse(event.body);
    
    // Validate required fields from GPC extraction
    const required = ['registry', 'caseNumber', 'claimant', 'defendants'];
    
    for (const field of required) {{
      if (!data[field]) {{
        return {{
          statusCode: 400,
          body: JSON.stringify({{ error: `Missing required field: ${{field}}` }})
        }};
      }}
    }}

    // Decode the embedded template
    const content = Buffer.from(TEMPLATE_BASE64, 'base64');

    // Create a new document
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {{
      paragraphLoop: true,
      linebreaks: true
    }});

    // Prepare defendant data
    const defendantsData = data.defendants.map((defendant, index) => ({{
      number: index === 0 ? 'First' : index === 1 ? 'Second' : `${{index + 1}}th`,
      name: defendant.name,
      address: defendant.address
    }}));

    // Set the template variables
    doc.setData({{
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
    }});

    try {{
      doc.render();
    }} catch (error) {{
      console.error('Template render error:', error);
      return {{
        statusCode: 500,
        body: JSON.stringify({{ 
          error: 'Failed to render template',
          details: error.message
        }})
      }};
    }}

    // Generate the document
    const buffer = doc.getZip().generate({{
      type: 'nodebuffer',
      compression: 'DEFLATE'
    }});

    // Return the document
    return {{
      statusCode: 200,
      headers: {{
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Affidavit_${{data.caseNumber.replace(/\\//g, '-')}}.docx"`
      }},
      body: buffer.toString('base64'),
      isBase64Encoded: true
    }};

  }} catch (error) {{
    console.error('Error:', error);
    return {{
      statusCode: 500,
      body: JSON.stringify({{ 
        error: 'Failed to generate affidavit',
        details: error.message 
      }})
    }};
  }}
}};
'''

# Write the new function
with open(function_path, 'w', encoding='utf-8') as f:
    f.write(function_code)

print(f'✓ Created {function_path} with embedded template')
print(f'  Template size: {len(template_base64) // 1024}KB')
