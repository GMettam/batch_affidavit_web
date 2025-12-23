import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Validate required fields
    const required = ['caseNumber', 'claimant', 'defendantName', 'allDefendants'];
    for (const field of required) {
      if (!data[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    const defendants = data.allDefendants;
    const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
    
    // Find which defendant this affidavit is for
    const defendantIndex = defendants.findIndex(d => d === data.defendantName);
    const defendantOrdinal = defendantIndex >= 0 ? ordinals[defendantIndex] : '';

    // Build defendant tables dynamically
    const defendantTables = [];
    for (let i = 0; i < defendants.length; i++) {
      defendantTables.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ text: `${ordinals[i]} Defendant`, bold: true })],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph(defendants[i])],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          ],
        }),
        new Paragraph('') // Spacing after each table
      );
    }

    // Create the document
    const doc = new Document({
      sections: [{
        children: [
          // Header table (Registry and Case Number)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Registry:', bold: true })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: 'MAGISTRATES COURT of WESTERN AUSTRALIA',
                        alignment: AlignmentType.CENTER,
                        bold: true,
                      }),
                      new Paragraph({
                        text: '(CIVIL JURISDICTION)',
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        text: 'AFFIDAVIT OF SERVICE',
                        alignment: AlignmentType.CENTER,
                        bold: true,
                      }),
                    ],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    columnSpan: 2,
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: 'Case number:', bold: true })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('')] }),
                  new TableCell({ children: [new Paragraph('')] }),
                  new TableCell({ children: [new Paragraph('')] }),
                  new TableCell({ children: [new Paragraph('')] }),
                  new TableCell({ children: [new Paragraph(data.caseNumber)] }),
                ],
              }),
            ],
          }),
          
          new Paragraph(''), // Spacing
          
          // Claimant table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: 'Claimant', bold: true })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph(data.claimant)],
                    width: { size: 70, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
            ],
          }),
          
          new Paragraph(''), // Spacing
          
          // Insert all defendant tables
          ...defendantTables,
          
          // Service statement
          new Paragraph({
            text: `I, IAN BRENT-WHITE, Process Server of 30 Ullinger Loop, Marangaroo WA 6064 say on oath as follows:`,
          }),
          
          new Paragraph(''), // Spacing
          
          new Paragraph({
            text: `I did on _______ at _______ at _______ duly serve ${data.defendantName}, the ${defendantOrdinal} Defendant in this case with a General Procedure Claim by:`,
          }),
          
          new Paragraph(''), // Spacing
          
          new Paragraph({
            text: '☐ By handing the document to the individual.',
          }),
          
          new Paragraph({
            text: "☐ By handing the document to someone at the person's usual or last known place of residence.",
          }),
          
          new Paragraph(''), // Spacing
          
          // Lodged by table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Lodged by', bold: true })] }),
                  new TableCell({ children: [new Paragraph('')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Address for service', bold: true })] }),
                  new TableCell({ children: [new Paragraph('')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Contact details', bold: true })] }),
                  new TableCell({ children: [new Paragraph('Tel:     Em:     Ref:')] }),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    // Generate the document
    const buffer = await Packer.toBuffer(doc);

    // Create filename
    const safeDefendantName = data.defendantName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeCaseNumber = data.caseNumber.replace(/\//g, '-');
    const filename = `Affidavit_${safeCaseNumber}_${safeDefendantName}.docx`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error generating affidavit:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to generate affidavit',
        details: error.message 
      })
    };
  }
};
