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
    const required = ['caseNumber', 'claimant', 'defendantName', 'allDefendants', 'gpcText'];
    for (const field of required) {
      if (!data[field]) {
        console.error(`Missing field: ${field}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }
    
    // Extract registry information from GPC text
    const registryInfo = extractRegistryInfo(data.gpcText);
    console.log('Extracted registry info:', registryInfo);
    
    // Extract law firm information from GPC text
    const lawFirmInfo = extractLawFirmInfo(data.gpcText);
    console.log('Extracted law firm info:', lawFirmInfo);

    // In Netlify, the template should be bundled with the function
    // Try multiple possible paths
    const templateFilename = 'Form_11_-_Affidavit_of_Service.docx';
    let content;
    let foundPath = null;
    
    // Possible paths where the template might be
    const possiblePaths = [
      // Same directory as the function (most likely after bundling)
      `./${templateFilename}`,
      // In the function directory
      `./netlify/functions/${templateFilename}`,
      // At the root
      `./${templateFilename}`,
      // Absolute path
      `/var/task/${templateFilename}`,
      `/var/task/netlify/functions/${templateFilename}`
    ];
    
    console.log('Trying to load template from possible paths:');
    
    for (const path of possiblePaths) {
      try {
        console.log(`  Trying: ${path}`);
        content = readFileSync(path, 'binary');
        foundPath = path;
        console.log(`  ✓ Found template at: ${path}`);
        break;
      } catch (err) {
        console.log(`  ✗ Not found: ${err.message}`);
      }
    }
    
    if (!foundPath) {
      console.error('Template file not found in any location');
      console.error('Current working directory:', process.cwd());
      
      // Try to list what files are available
      try {
        const fs = await import('fs');
        const files = fs.readdirSync('.');
        console.log('Files in current directory:', files);
      } catch (e) {
        console.log('Could not list directory');
      }
      
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Template file not found',
          details: 'Form_11_-_Affidavit_of_Service.docx is not available in the function bundle',
          searchedPaths: possiblePaths,
          cwd: process.cwd()
        })
      };
    }
    
    console.log('Creating PizZip from template');
    const zip = new PizZip(content);
    
    // Get the main document XML
    let docXml = zip.file('word/document.xml').asText();
    console.log('Original XML length:', docXml.length);
    
    // Process the document
    docXml = processDocument(docXml, data, registryInfo, lawFirmInfo);
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

function processDocument(xml, data, registryInfo, lawFirmInfo) {
  const defendants = data.allDefendants;
  const currentDefendant = data.defendantName;
  const defendantIndex = defendants.indexOf(currentDefendant);
  const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
  const defendantOrdinal = ordinals[defendantIndex] || 'First';
  
  console.log('Processing document for:', currentDefendant);
  console.log('Defendant index:', defendantIndex, 'Ordinal:', defendantOrdinal);
  console.log('All defendants:', defendants);
  console.log('Registry info:', registryInfo);
  console.log('Law firm info:', lawFirmInfo);
  
  let result = xml;
  
  // Step 0: Fill in registry information in header table
  result = fillRegistryInfo(result, registryInfo);
  
  // Step 1: Fill in case number
  result = fillTableValue(result, 0, data.caseNumber);
  
  // Step 2: Fill in claimant 
  result = fillTableValue(result, 1, data.claimant);
  
  // Step 3: Fill first defendant
  result = fillDefendantTable(result, 2, 'First Defendant', defendants[0]);
  
  // Step 4: Clone and fill additional defendant tables if needed
  if (defendants.length > 1) {
    result = addAdditionalDefendants(result, defendants);
  }
  
  // Step 5: Fill service statement
  result = fillServiceStatement(result, currentDefendant, defendantOrdinal);
  
  // Step 6: Fill law firm lodgement details at bottom
  result = fillLawFirmInfo(result, lawFirmInfo);
  
  return result;
}

function fillTableValue(xml, tableIndex, value) {
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tableIndex >= tables.length) {
    console.error(`Table ${tableIndex} not found`);
    return xml;
  }
  
  let table = tables[tableIndex];
  const cells = table.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  
  if (!cells || cells.length < 2) {
    console.error(`Table ${tableIndex} doesn't have enough cells`);
    return xml;
  }
  
  const targetCell = cells[cells.length - 1];
  
  const newCell = targetCell.replace(
    /(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
    (match, start, content, end) => {
      if (!content.includes('<w:t>') || content.match(/<w:t>\s*<\/w:t>/) || content.match(/<w:t xml:space="preserve">\s*<\/w:t>/)) {
        return `${start}<w:r><w:t>${escapeXml(value)}</w:t></w:r>${end}`;
      }
      return match;
    }
  );
  
  const newTable = table.replace(targetCell, newCell);
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
  
  let firstCell = cells[0];
  firstCell = firstCell.replace(
    /<w:t>Defendant<\/w:t>/,
    `<w:t>${label}</w:t>`
  );
  
  let secondCell = cells[1];
  secondCell = secondCell.replace(
    /(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
    (match, start, content, end) => {
      return `${start}<w:r><w:t>${escapeXml(defendantName.toUpperCase())}</w:t></w:r>${end}`;
    }
  );
  
  let newTable = table;
  newTable = newTable.replace(cells[0], firstCell);
  newTable = newTable.replace(cells[1], secondCell);
  
  return xml.replace(table, newTable);
}

function addAdditionalDefendants(xml, defendants) {
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tables.length < 3) {
    return xml;
  }
  
  const firstDefendantTable = tables[2];
  const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
  
  // Use smaller spacing to match claimant spacing
  const spacing = '<w:p w14:paraId="57E6D511" w14:textId="77777777" w:rsidR="009E5709" w:rsidRDefault="009E5709" w:rsidP="007A4244"><w:pPr><w:spacing w:before="60"/><w:rPr><w:sz w:val="4"/></w:rPr></w:pPr></w:p>';
  
  let allDefendantTables = [];
  
  for (let i = 0; i < defendants.length && i < 6; i++) {
    let newTable = firstDefendantTable;
    
    // Replace any text containing "Defendant" in the first cell
    newTable = newTable.replace(
      /<w:t>([^<]*Defendant[^<]*)<\/w:t>/,
      `<w:t>${ordinals[i]} Defendant</w:t>`
    );
    
    const cells = newTable.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
    if (cells && cells.length >= 2) {
      let secondCell = cells[1];
      secondCell = secondCell.replace(
        /(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
        (match, start, content, end) => {
          return `${start}<w:r><w:t>${escapeXml(defendants[i].toUpperCase())}</w:t></w:r>${end}`;
        }
      );
      newTable = newTable.replace(cells[1], secondCell);
    }
    
    allDefendantTables.push(newTable);
  }
  
  const defendantSection = allDefendantTables.join(spacing);
  return xml.replace(firstDefendantTable, defendantSection);
}

function fillServiceStatement(xml, defendantName, defendantOrdinal) {
  let result = xml;
  
  result = result.replace(/\[Name\]/g, escapeXml(defendantName));
  result = result.replace(/\[Defendant[^\]]*\]/g, `the ${defendantOrdinal} Defendant`);
  result = result.replace(/\[Date\]/g, '');
  result = result.replace(/\[time[^\]]*\]/g, '');
  result = result.replace(/\[Place\]/g, '');
  result = result.replace(/\[Name of process\]/g, 'General Procedure Claim');
  
  return result;
}

function extractRegistryInfo(gpcText) {
  // Extract registry information from GPC text
  // The registry appears in the format:
  // REGISTRY AT:
  // Central Law Courts
  // 501 Hay Street
  // PERTH WA 6000
  // Ph: 9425 2222
  
  const registryInfo = {
    name: '',
    street: '',
    cityStatePostcode: ''
  };
  
  // Find the REGISTRY AT: section
  const lines = gpcText.split('\n');
  let registryStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('REGISTRY AT:')) {
      registryStart = i;
      break;
    }
  }
  
  if (registryStart === -1) {
    console.error('REGISTRY AT: not found in GPC text');
    return registryInfo;
  }
  
  // The format from PDF extraction is messy, so we need to extract carefully
  // Line with REGISTRY AT: might have the name on the same line or next
  let currentLine = lines[registryStart];
  
  // Check if name is on same line as REGISTRY AT:
  if (currentLine.includes('REGISTRY AT:')) {
    const afterRegistry = currentLine.substring(currentLine.indexOf('REGISTRY AT:') + 12).trim();
    // Sometimes the name is on this line before other content
    const nameParts = afterRegistry.split(/\s+(MAGISTRATES|Case|Ph:)/);
    if (nameParts[0].trim()) {
      registryInfo.name = nameParts[0].trim();
    }
  }
  
  // Look at next few lines for registry details
  for (let i = registryStart + 1; i < Math.min(registryStart + 6, lines.length); i++) {
    const line = lines[i].trim();
    
    // Registry name (e.g., "Central Law Courts")
    if (!registryInfo.name && line && !line.includes('Ph:') && !line.match(/\d{3,4}/)) {
      // Extract registry name before any court type info
      const nameMatch = line.match(/^([^(]+?)(?:\s+\(|$)/);
      if (nameMatch) {
        registryInfo.name = nameMatch[1].trim();
      }
    }
    
    // Street address (contains number and street name)
    if (!registryInfo.street && line.match(/^\d+\s+/)) {
      const streetMatch = line.match(/^(\d+\s+[A-Za-z\s]+?)(?=\s+Date|$)/);
      if (streetMatch) {
        registryInfo.street = streetMatch[1].trim();
      }
    }
    
    // City/State/Postcode (e.g., "PERTH WA 6000")
    if (!registryInfo.cityStatePostcode && line.match(/[A-Z]{2,}\s+WA\s+\d{4}/)) {
      const cityMatch = line.match(/([A-Z\s]+?\s+WA\s+\d{4})/);
      if (cityMatch) {
        registryInfo.cityStatePostcode = cityMatch[1].trim();
      }
    }
  }
  
  console.log('Extracted registry:', registryInfo);
  return registryInfo;
}

function extractLawFirmInfo(gpcText) {
  // Extract law firm information from GPC text
  // Looking for "Claimant's address for service" or "Defendant's address for service"
  
  console.log('=== STARTING LAW FIRM EXTRACTION ===');
  console.log('GPC text length:', gpcText.length);
  console.log('First 500 chars:', gpcText.substring(0, 500));
  
  const lawFirmInfo = {
    name: '',
    address: '',
    telephone: '',
    email: '',
    reference: '',
    lodgedBy: "Claimant's Lawyer" // Default, will update if we find Defendant
  };
  
  const lines = gpcText.split('\n');
  
  // Determine if this is Claimant's or Defendant's lawyer
  // Check if we find "Defendant's address for service" or "Defendant details"
  const isDefendant = gpcText.includes("Defendant's address") || 
                      gpcText.includes("Defendant details") ||
                      gpcText.toLowerCase().includes("defendant ref:");
  
  if (isDefendant) {
    lawFirmInfo.lodgedBy = "Defendant's Lawyer";
  }
  
  // Find "address for service" or "Claimant details" or "Defendant details"
  let serviceAddressStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('address for service') || 
        lines[i].includes('Claimant details') ||
        lines[i].includes('Defendant details')) {
      serviceAddressStart = i;
      break;
    }
  }
  
  if (serviceAddressStart === -1) {
    console.error('Claimant address for service not found in GPC text');
    return lawFirmInfo;
  }
  
  // Collect all text from the next several lines to build complete info
  let addressLines = [];
  
  for (let i = serviceAddressStart; i < Math.min(serviceAddressStart + 10, lines.length); i++) {
    const line = lines[i].trim();
    
    // Stop when we hit "Description of Claim" or similar
    if (line.includes('Description of Claim') || line.includes('AND THE CLAIM')) {
      break;
    }
    
    // Extract firm name - it appears on the line with "address for service" or the next line
    // Format: "Claimant's address McCabes" or just "McCabes"
    if (!lawFirmInfo.name && line.includes('address') && !line.includes('for service:')) {
      // Extract everything after "address" that looks like a firm name
      const nameMatch = line.match(/address\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/i);
      if (nameMatch) {
        lawFirmInfo.name = nameMatch[1].trim();
      }
    } else if (!lawFirmInfo.name && i === serviceAddressStart + 1 && line && !line.includes(':')) {
      // Fallback: firm name might be on its own line
      const nameMatch = line.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)/);
      if (nameMatch) {
        lawFirmInfo.name = nameMatch[1].trim();
      }
    }
    
    // Collect address lines (Level, Suite, street addresses with numbers, city/state/postcode)
    if (line.match(/^(Level|Suite|\d+\s+[A-Z]|for\s+service:)/i) && !line.includes('Claimant')) {
      let addrLine = line.replace(/^for\s+service:?\s*/i, '').trim();
      if (addrLine) {
        addressLines.push(addrLine);
      }
    }
    
    // City/State/Postcode - always collect this
    if (line.match(/^[A-Z]{2,}\s+WA\s+\d{4}/)) {
      if (!addressLines.some(l => l.includes(line.trim()))) {
        addressLines.push(line.trim());
      }
    }
    
    // Claimant ref
    if (line.includes('ref:')) {
      const refMatch = line.match(/ref:\s*(\d+)/i);
      if (refMatch) {
        lawFirmInfo.reference = refMatch[1].trim();
      }
    }
    
    // Claimant email
    if (line.includes('email:')) {
      const emailMatch = line.match(/email:\s*(\S+@\S+)/i);
      if (emailMatch) {
        lawFirmInfo.email = emailMatch[1].trim();
      }
    }
    
    // Claimant telephone
    if (line.includes('telephone:')) {
      const telMatch = line.match(/telephone:\s*(\d+)/i);
      if (telMatch) {
        lawFirmInfo.telephone = telMatch[1].trim();
      }
    }
  }
  
  // Build full address from collected lines
  lawFirmInfo.address = addressLines.join(', ');
  
  console.log('Extracted law firm - Name:', lawFirmInfo.name);
  console.log('Extracted law firm - Address:', lawFirmInfo.address);
  console.log('Extracted law firm - Tel:', lawFirmInfo.telephone);
  console.log('Extracted law firm - Email:', lawFirmInfo.email);
  console.log('Extracted law firm - Ref:', lawFirmInfo.reference);
  return lawFirmInfo;
}

function fillRegistryInfo(xml, registryInfo) {
  // Find the first table (header table with registry)
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tables.length === 0) {
    console.error('No tables found in document');
    return xml;
  }
  
  let headerTable = tables[0];
  
  // Find the cell that contains "Registry:" text
  // This is in the second row, first cell
  const rows = headerTable.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  
  if (!rows || rows.length < 2) {
    console.error('Header table does not have enough rows');
    return xml;
  }
  
  // The registry information goes in the second row, first cell (after "Registry:")
  let registryRow = rows[1];
  const cells = registryRow.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  
  if (!cells || cells.length === 0) {
    console.error('Registry row does not have cells');
    return xml;
  }
  
  let registryCell = cells[0];
  
  // Build the registry text with proper formatting (3 lines, Calibri 22pt, NOT bold, NOT underlined)
  const registryLines = [
    registryInfo.name,
    registryInfo.street,
    registryInfo.cityStatePostcode
  ].filter(line => line); // Remove empty lines
  
  // Create paragraph XML for each line - without Heading2 style to avoid bold
  const registryParagraphsXml = registryLines.map((line, index) => {
    return `<w:p>
      <w:pPr>
        <w:spacing w:after="60" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b w:val="0"/>
          <w:sz w:val="22"/>
          <w:u w:val="none"/>
        </w:rPr>
        <w:t>${escapeXml(line)}</w:t>
      </w:r>
    </w:p>`;
  }).join('');
  
  // Replace the paragraph in the registry cell (keep cell structure, just replace paragraphs)
  registryCell = registryCell.replace(
    /(<w:tc>[\s\S]*?<w:tcPr>[\s\S]*?<\/w:tcPr>)([\s\S]*?)(<\/w:tc>)/,
    (match, cellStart, cellContent, cellEnd) => {
      return cellStart + registryParagraphsXml + cellEnd;
    }
  );
  
  // Replace the cell in the row
  const newRow = registryRow.replace(cells[0], registryCell);
  
  // Replace the row in the table
  const newTable = headerTable.replace(rows[1], newRow);
  
  // Replace the table in the document
  return xml.replace(headerTable, newTable);
}

function fillLawFirmInfo(xml, lawFirmInfo) {
  // Find all tables in the document
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tables.length === 0) {
    console.error('No tables found in document');
    return xml;
  }
  
  // The law firm lodgement table is the LAST table in the document
  let lawFirmTable = tables[tables.length - 1];
  
  // The table has 3 rows:
  // Row 0: "Lodged by" | "Claimant's Lawyer" (should span remaining cells)
  // Row 1: "Address for service" | full address (should span remaining cells)
  // Row 2: "Contact details" | "Tel:" | phone | "Em:" | email | "Ref:" | reference
  
  const rows = lawFirmTable.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  
  if (!rows || rows.length < 3) {
    console.error('Law firm table does not have enough rows');
    return xml;
  }
  
  console.log('Filling law firm table with:', lawFirmInfo);
  
  // Row 0: Fill in "Claimant's Lawyer" or "Defendant's Lawyer" in second cell
  let row0 = rows[0];
  const row0Cells = row0.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  if (row0Cells && row0Cells.length >= 2) {
    let lawyerCell = row0Cells[1];
    
    // Find the first paragraph and add text
    lawyerCell = lawyerCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(lawFirmInfo.lodgedBy)}</w:t></w:r>` + pEnd;
      }
    );
    
    row0 = row0.replace(row0Cells[1], lawyerCell);
  }
  
  // Row 1: Fill in address in second cell
  let row1 = rows[1];
  const row1Cells = row1.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  if (row1Cells && row1Cells.length >= 2) {
    let addressCell = row1Cells[1];
    
    // Build full address string
    const fullAddress = `${lawFirmInfo.name}, ${lawFirmInfo.address}`;
    console.log('Inserting address:', fullAddress);
    
    // Find the first paragraph and add text
    addressCell = addressCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(fullAddress)}</w:t></w:r>` + pEnd;
      }
    );
    
    row1 = row1.replace(row1Cells[1], addressCell);
  }
  
  // Row 2: Fill in contact details (Tel in cell 2, Email in cell 4, Ref in cell 6)
  let row2 = rows[2];
  const row2Cells = row2.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  
  if (row2Cells && row2Cells.length >= 7) {
    console.log('Filling contact details - Tel:', lawFirmInfo.telephone, 'Email:', lawFirmInfo.email, 'Ref:', lawFirmInfo.reference);
    
    // Cell 2 (3rd cell) contains telephone
    let telCell = row2Cells[2];
    telCell = telCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(lawFirmInfo.telephone)}</w:t></w:r>` + pEnd;
      }
    );
    
    // Cell 4 (5th cell) contains email
    let emailCell = row2Cells[4];
    emailCell = emailCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(lawFirmInfo.email)}</w:t></w:r>` + pEnd;
      }
    );
    
    // Cell 6 (7th cell) contains reference
    let refCell = row2Cells[6];
    refCell = refCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(lawFirmInfo.reference)}</w:t></w:r>` + pEnd;
      }
    );
    
    // Replace cells in row
    row2 = row2.replace(row2Cells[2], telCell);
    row2 = row2.replace(row2Cells[4], emailCell);
    row2 = row2.replace(row2Cells[6], refCell);
  }
  
  // Replace rows in table
  let newTable = lawFirmTable;
  newTable = newTable.replace(rows[0], row0);
  newTable = newTable.replace(rows[1], row1);
  newTable = newTable.replace(rows[2], row2);
  
  // Replace table in document
  return xml.replace(lawFirmTable, newTable);
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
