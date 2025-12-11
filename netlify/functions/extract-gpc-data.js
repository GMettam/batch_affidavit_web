const { Anthropic } = require('@anthropic-ai/sdk');
const busboy = require('busboy');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the multipart form data
    const pdfData = await parseMultipartForm(event);
    
    if (!pdfData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No PDF file provided' })
      };
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Send PDF to Claude for extraction
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfData.toString('base64')
              }
            },
            {
              type: 'text',
              text: `Extract the following information from this General Procedure Claim (GPC) Form 3. Only examine the FIRST PAGE.

Extract:
1. Registry (full address)
2. Case Number
3. Claimant name and address
4. All Defendants (name and address for service for each)

Return ONLY a JSON object in this exact format:
{
  "registry": "full registry address",
  "caseNumber": "case number",
  "claimant": "claimant name",
  "claimantAddress": "claimant address",
  "defendants": [
    {
      "name": "defendant name",
      "address": "address for service"
    }
  ]
}

Do not include any other text, explanations, or markdown formatting. Return only the JSON object.`
            }
          ]
        }
      ]
    });

    // Extract the text response
    const responseText = message.content[0].text;
    
    // Parse JSON from response
    let extractedData;
    try {
      // Try to extract JSON if Claude added any extra text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      extractedData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to parse extracted data' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(extractedData)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to extract data',
        details: error.message 
      })
    };
  }
};

// Helper function to parse multipart form data
function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      reject(new Error('Content type must be multipart/form-data'));
      return;
    }

    const bb = busboy({ headers: { 'content-type': contentType } });
    let pdfBuffer = null;

    bb.on('file', (fieldname, file, info) => {
      const chunks = [];
      file.on('data', (data) => {
        chunks.push(data);
      });
      file.on('end', () => {
        pdfBuffer = Buffer.concat(chunks);
      });
    });

    bb.on('finish', () => {
      resolve(pdfBuffer);
    });

    bb.on('error', (error) => {
      reject(error);
    });

    // Decode base64 if needed
    const body = event.isBase64Encoded 
      ? Buffer.from(event.body, 'base64')
      : event.body;

    bb.write(body);
    bb.end();
  });
}
