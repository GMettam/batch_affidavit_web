import PizZip from 'pizzip';
import { readFileSync } from 'fs';
import { join } from 'path';

export const handler = async (event) => {
  console.log('Function invoked');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    const required = ['caseNumber', 'claimant', 'defendantName', 'allDefendants'];
    for (const field of required) {
      if (!data[field]) {
        console.error(`Missing field: ${field}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    // Load template
    const templatePath = join(process.cwd(), 'Form_11_-_Affidavit_of_Service.docx');
    console.log('Loading template from:', templatePath);
    
    const content = readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // Get the main document XML
    let docXml = zip.file('word/document.xml').asText();
    console.log('Original XML length:', docXml.length);
    
    // Process the document
    docXml = processDocument(docXml, data);
    console.log('Processed XML length:', docXml.length);
    
    // Update the document
    zip.file('word/document.xml', docXml);
    
    // Generate output
    const buffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    console.log('Generated buffer size:', buffer.length);

    // Create filename
    const safeDefendantName = data.defendantName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeCaseNumber = data.caseNumber.replace(/\//g, '-');
    const filename = `Affidavit_${safeCaseNumber}_${safeDefendantName}.docx`;
    
    console.log('Returning document:', filename);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error generating affidavit:', error);
    console.error('Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to generate affidavit',
        details: error.message,
        stack: error.stack
      })
    };
  }
};

function processDocument(xml, data) {
  const defendants = data.allDefendants;
  const currentDefendant = data.defendantName;
  const defendantIndex = defendants.indexOf(currentDefendant);
  const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
  const defendantOrdinal = ordinals[defendantIndex] || 'First';
  
  console.log('Processing document for:', currentDefendant);
  console.log('Defendant index:', defendantIndex, 'Ordinal:', defendantOrdinal);
  console.log('All defendants:', defendants);
  
  let result = xml;
  
  // Step 1: Fill in case number
  // Look for the case number table (first table) and fill the appropriate cell
  result = fillTableValue(result, 0, data.caseNumber);
  
  // Step 2: Fill in claimant 
  // Second table
  result = fillTableValue(result, 1, data.claimant);
  
  // Step 3: Fill first defendant
  // Third table - update both the label and the value
  result = fillDefendantTable(result, 2, 'First Defendant', defendants[0]);
  
  // Step 4: Clone and fill additional defendant tables if needed
  if (defendants.length > 1) {
    result = addAdditionalDefendants(result, defendants);
  }
  
  // Step 5: Fill service statement
  result = fillServiceStatement(result, currentDefendant, defendantOrdinal);
  
  return result;
}

function fillTableValue(xml, tableIndex, value) {
  // Extract all tables
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tableIndex >= tables.length) {
    console.error(`Table ${tableIndex} not found`);
    return xml;
  }
  
  let table = tables[tableIndex];
  
  // Find the last cell that's empty or has minimal content
  const cells = table.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  if (!cells || cells.length < 2) {
    console.error(`Table ${tableIndex} doesn't have enough cells`);
    return xml;
  }
  
  // Usually the value goes in the last cell or second cell
  const targetCell = cells[cells.length - 1];
  
  // Check if the cell is empty or needs filling
  const newCell = targetCell.replace(
    /(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
    (match, start, content, end) => {
      // If the paragraph is empty or has no substantial text
      if (!content.includes('<w:t>') || content.match(/<w:t>\s*<\/w:t>/) || content.match(/<w:t xml:space="preserve">\s*<\/w:t>/)) {
        return `${start}<w:r><w:t>${escapeXml(value)}</w:t></w:r>${end}`;
      }
      // If there's already text, leave it unless it looks like a placeholder
      return match;
    }
  );
  
  // Replace the cell in the table
  const newTable = table.replace(targetCell, newCell);
  
  // Replace the table in the document
  return xml.replace(table, newTable);
}

function fillDefendantTable(xml, tableIndex, label, defendantName) {
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tableIndex >= tables.length) {
    return xml;
  }
  
  let table = tables[tableIndex];
  const cells = table.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  
  if (!cells || cells.length < 2) {
    return xml;
  }
  
  // Update the first cell (label)
  let firstCell = cells[0];
  firstCell = firstCell.replace(
    /<w:t>Defendant<\/w:t>/,
    `<w:t>${label}</w:t>`
  );
  
  // Update the second cell (value)
  let secondCell = cells[1];
  secondCell = secondCell.replace(
    /(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
    (match, start, content, end) => {
      return `${start}<w:r><w:t>${escapeXml(defendantName)}</w:t></w:r>${end}`;
    }
  );
  
  // Rebuild the table with updated cells
  let newTable = table;
  newTable = newTable.replace(cells[0], firstCell);
  newTable = newTable.replace(cells[1], secondCell);
  
  // Replace in document
  return xml.replace(table, newTable);
}

function addAdditionalDefendants(xml, defendants) {
  // For now, we'll use a simpler approach
  // Find the first defendant table and clone it
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tables.length < 3) {
    return xml;
  }
  
  const firstDefendantTable = tables[2];
  const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
  
  // Create spacing paragraph
  const spacing = '<w:p w14:paraId="57E6D511" w14:textId="77777777" w:rsidR="00AA0EB1" w:rsidRDefault="00AA0EB1"/>';
  
  // Build all defendant tables
  let allDefendantTables = [];
  
  for (let i = 0; i < defendants.length && i < 6; i++) {
    let newTable = firstDefendantTable;
    
    // Update label
    newTable = newTable.replace(
      /<w:t>Defendant<\/w:t>/,
      `<w:t>${ordinals[i]} Defendant</w:t>`
    );
    
    // Update value in second cell
    const cells = newTable.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
    if (cells && cells.length >= 2) {
      let secondCell = cells[1];
      secondCell = secondCell.replace(
        /(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
        (match, start, content, end) => {
          return `${start}<w:r><w:t>${escapeXml(defendants[i])}</w:t></w:r>${end}`;
        }
      );
      newTable = newTable.replace(cells[1], secondCell);
    }
    
    allDefendantTables.push(newTable);
  }
  
  // Join with spacing
  const defendantSection = allDefendantTables.join(spacing);
  
  // Replace the original defendant table with all defendant tables
  return xml.replace(firstDefendantTable, defendantSection);
}

function fillServiceStatement(xml, defendantName, defendantOrdinal) {
  let result = xml;
  
  // These replacements handle the service statement
  // The text is often split across multiple <w:t> elements, so we need to be clever
  
  // Replace [Name] with defendant name
  result = result.replace(/\[Name\]/g, escapeXml(defendantName));
  
  // Replace [Defendant...] pattern
  result = result.replace(/\[Defendant[^\]]*\]/g, `the ${defendantOrdinal} Defendant`);
  
  // Clear other placeholders
  result = result.replace(/\[Date\]/g, '');
  result = result.replace(/\[time[^\]]*\]/g, '');
  result = result.replace(/\[Place\]/g, '');
  result = result.replace(/\[Name of process\]/g, 'General Procedure Claim');
  
  return result;
}

function escapeXml(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
