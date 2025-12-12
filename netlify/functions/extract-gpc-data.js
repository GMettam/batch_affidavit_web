const { Anthropic } = require('@anthropic-ai/sdk');
const busboy = require('busboy');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const pdfData = await parseMultipartForm(event);
        
        if (!pdfData) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No PDF file provided' }) };
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{
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
                        text: `Extract from this GPC Form 3 (first page only):
1. Registry full address
2. Case Number
3. Claimant name and address
4. All Defendants (name and address)

Return ONLY valid JSON:
{
  "registry": "full address",
  "caseNumber": "case number",
  "claimant": "name",
  "claimantAddress": "address",
  "defendants": [
    {"name": "name", "address": "address"}
  ]
}`
                    }
                ]
            }]
        });

        const responseText = message.content[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const extractedData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(extractedData)
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to extract data', details: error.message })
        };
    }
};

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
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => { pdfBuffer = Buffer.concat(chunks); });
        });

        bb.on('finish', () => resolve(pdfBuffer));
        bb.on('error', (error) => reject(error));

        const body = event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64')
            : event.body;
        
        bb.write(body);
        bb.end();
    });
}
