const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const data = JSON.parse(event.body);

        // Validate required fields
        const required = ['registry', 'caseNumber', 'claimant', 'defendants'];
        for (const field of required) {
            if (!data[field]) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: `Missing required field: ${field}` })
                };
            }
        }

        // Read template file - it's in the root directory
        const templatePath = path.join(__dirname, '..', '..', 'affidavit-template.docx');
        const content = fs.readFileSync(templatePath);

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true
        });

        // Prepare defendants array
        const defendantsData = data.defendants.map((defendant, index) => ({
            number: index === 0 ? 'First' : index === 1 ? 'Second' : `${index + 1}th`,
            name: defendant.name,
            address: defendant.address
        }));

        // Set template data
        doc.setData({
            registry: data.registry,
            caseNumber: data.caseNumber,
            claimant: data.claimant,
            claimantAddress: data.claimantAddress || '',
            defendants: defendantsData,
            serviceDate: '',
            serviceTime: '',
            servicePlace: '',
            personalService: '☐',
            postalService: '☐',
            substitutedService: '☐',
            personalServiceChecked: false,
            postalServiceChecked: false,
            substitutedServiceChecked: false
        });

        doc.render();

        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

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
            body: JSON.stringify({ error: 'Failed to generate affidavit', details: error.message })
        };
    }
};
