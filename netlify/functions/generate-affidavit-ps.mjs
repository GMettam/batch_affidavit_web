import PizZip from 'pizzip';
import { readFileSync } from 'fs';
import { join } from 'path';

export const handler = async (event) => {
  console.log('★★★ FIXED VERSION - FORCE REPLACE CLAIMANT - JAN 15 2026 ★★★');
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
    
    // Log the claimant name being processed
    console.log('CLAIMANT NAME RECEIVED:', data.claimant);
    
    // Extract registry information from GPC text
    console.log('GPC text received, length:', data.gpcText ? data.gpcText.length : 0);
    
    const registryInfo = extractRegistryInfo(data.gpcText);
    console.log('Extracted registry info:', registryInfo);
    
    // Extract date lodged from GPC text
    const dateLodged = extractDateLodged(data.gpcText);
    console.log('Extracted date lodged:', dateLodged);
    
    // Extract law firm information from GPC text
    const lawFirmInfo = extractLawFirmInfo(data.gpcText);
    console.log('Extracted law firm info:', lawFirmInfo);

    // In Netlify, the template should be bundled with the function
    const templateFilename = 'Form_11_-_Affidavit_of_Service_PS.docx';
    let content;
    let foundPath = null;
    
    // Possible paths where the template might be
    const possiblePaths = [
      `./${templateFilename}`,
      `./netlify/functions/${templateFilename}`,
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
      return {
        statusCode: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Template file not found',
          details: 'Form_11_-_Affidavit_of_Service_PS.docx is not available'
        })
      };
    }
    
    console.log('Creating PizZip from template');
    const zip = new PizZip(content);
    
    // Get the main document XML
    let docXml = zip.file('word/document.xml').asText();
    console.log('Original XML length:', docXml.length);
    
    // Process the document
    docXml = processDocument(docXml, data, registryInfo, lawFirmInfo, dateLodged);
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

function processDocument(xml, data, registryInfo, lawFirmInfo, dateLodged) {
  const defendants = data.allDefendants;
  const currentDefendant = data.defendantName;
  const defendantIndex = defendants.indexOf(currentDefendant);
  const ordinals = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
  const defendantOrdinal = ordinals[defendantIndex] || 'First';
  
  console.log('Processing document for:', currentDefendant);
  console.log('Defendant index:', defendantIndex, 'Ordinal:', defendantOrdinal);
  console.log('All defendants:', defendants);
  console.log('Defendant address:', data.defendantAddress);
  console.log('Date lodged:', dateLodged);
  console.log('Registry info:', registryInfo);
  console.log('Law firm info:', lawFirmInfo);
  console.log('CLAIMANT TO BE FILLED:', data.claimant);
  
  let result = xml;
  
  // Step 0: Fill in registry information in header table
  result = fillRegistryInfo(result, registryInfo);
  
  // Step 1: Fill in case number
  result = fillTableValue(result, 0, data.caseNumber);
  
  // Step 2: Fill in claimant (uppercase) - FORCE REPLACE
  console.log('ABOUT TO FILL CLAIMANT TABLE WITH:', data.claimant.toUpperCase());
  result = fillTableValueForceReplace(result, 1, data.claimant.toUpperCase());
  
  // Step 3: Fill ALL defendants in ONE row (PS version)
  const formattedDefendants = defendants.map(d => formatDefendantName(d)).join(', ');
  result = fillDefendantTablePS(result, 2, 'Defendant', formattedDefendants);
  
  // Step 4: Fill service statement
  const formattedCurrentDefendant = formatDefendantName(currentDefendant);
  result = fillServiceStatementPS(result, formattedCurrentDefendant, data.defendantAddress, dateLodged);
  
  // Step 5: Fill law firm lodgement details at bottom
  result = fillLawFirmInfo(result, lawFirmInfo);
  
  return result;
}

// NEW FUNCTION: Force replace content in table cell
function fillTableValueForceReplace(xml, tableIndex, value) {
  console.log(`fillTableValueForceReplace called with tableIndex=${tableIndex}, value="${value}"`);
  
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
  
  const targetCell = cells[cells.length - 1];  // Get the last cell (should be the value cell)
  console.log('Target cell found, length:', targetCell.length);
  
  // FORCE REPLACE: Clear all paragraphs and create a new one with our value
  const newCell = targetCell.replace(
    /(<w:tc>[\s\S]*?<w:tcPr>[\s\S]*?<\/w:tcPr>)([\s\S]*?)(<\/w:tc>)/,
    (match, cellStart, cellContent, cellEnd) => {
      // Create a fresh paragraph with the new value
      const newParagraph = `<w:p><w:r><w:t>${escapeXml(value)}</w:t></w:r></w:p>`;
      console.log('Replacing cell content with:', newParagraph);
      return cellStart + newParagraph + cellEnd;
    }
  );
  
  const newTable = table.replace(targetCell, newCell);
  return xml.replace(table, newTable);
}

// Keep the original function for other uses
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

function extractRegistryInfo(gpcText) {
  const registryInfo = {
    name: '',
    street: '',
    cityStatePostcode: ''
  };
  
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
  
  let currentLine = lines[registryStart];
  
  if (currentLine.includes('REGISTRY AT:')) {
    const afterRegistry = currentLine.substring(currentLine.indexOf('REGISTRY AT:') + 12).trim();
    
    const streetMatch = afterRegistry.match(/(\d+\s+[A-Za-z\s]+?)(?=\s+Date|\s+[A-Z]{2,}\s+WA)/);
    if (streetMatch) {
      registryInfo.street = streetMatch[1].trim();
    }
    
    const cityMatch = afterRegistry.match(/([A-Z\s]+?\s+WA\s+\d{4})/);
    if (cityMatch) {
      registryInfo.cityStatePostcode = cityMatch[1].trim();
    }
    
    let nameOnly = afterRegistry;
    if (registryInfo.street) {
      nameOnly = afterRegistry.substring(0, afterRegistry.indexOf(registryInfo.street)).trim();
    }
    const nameParts = nameOnly.split(/\s+(MAGISTRATES|Case|Ph:)/);
    if (nameParts[0].trim()) {
      registryInfo.name = nameParts[0].trim();
    }
  }
  
  for (let i = registryStart + 1; i < Math.min(registryStart + 6, lines.length); i++) {
    const line = lines[i].trim();
    
    if (i === registryStart + 1 && line && line.length < 100 && 
        !line.includes('Ph:') && !line.match(/^\d/) && !line.includes('Date lodged') &&
        !line.includes('PART') && !line.includes('PLEASE READ')) {
      const nameMatch = line.match(/^([^(]+?)(?:\s+\(|$)/);
      if (nameMatch && nameMatch[1].trim()) {
        registryInfo.name = nameMatch[1].trim();
      }
    }
    
    if (!registryInfo.street && line.match(/^\d+\s+/)) {
      const streetMatch = line.match(/^(\d+\s+[A-Za-z\s]+?)(?=\s+Date|$)/);
      if (streetMatch) {
        registryInfo.street = streetMatch[1].trim();
      }
    }
    
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

function extractDateLodged(gpcText) {
  const dateMatch = gpcText.match(/Date lodged:\s*(\d{2}\/\d{2}\/\d{4})/i);
  
  if (dateMatch) {
    console.log('Extracted date lodged:', dateMatch[1]);
    return dateMatch[1];
  }
  
  console.log('Date lodged not found in GPC');
  return '';
}

function extractLawFirmInfo(gpcText) {
  console.log('=== STARTING LAW FIRM EXTRACTION ===');
  
  const lawFirmInfo = {
    name: '',
    address: '',
    telephone: '',
    email: '',
    reference: '',
    lodgedBy: "Claimant's Lawyer"
  };
  
  const isDefendant = gpcText.includes("Defendant's address") || 
                      gpcText.includes("Defendant details") ||
                      gpcText.toLowerCase().includes("defendant ref:");
  
  if (isDefendant) {
    lawFirmInfo.lodgedBy = "Defendant's Lawyer";
  }
  
  const addressPattern = /address for service:\s+(.+?)(?=\s+Claimant ref:|Description of Claim)/i;
  const addressMatch = gpcText.match(addressPattern);
  
  if (addressMatch) {
    const fullLine = addressMatch[1].trim();
    console.log('Found address line:', fullLine.substring(0, 100));
    
    const parts = fullLine.match(/^(.+?)\s+(Level|Suite|\d+)\s+(.+)$/i);
    
    if (parts) {
      lawFirmInfo.name = parts[1].trim();
      lawFirmInfo.address = (parts[2] + ' ' + parts[3]).trim();
      
      console.log('Extracted firm name:', lawFirmInfo.name);
      console.log('Extracted address:', lawFirmInfo.address);
    }
  }
  
  const refMatch = gpcText.match(/Claimant ref:\s*([^\s]+(?:\s+[^\s]+)*?)(?=\s+Claimant email:|Claimant telephone:|Description of Claim)/i);
  if (refMatch) {
    lawFirmInfo.reference = refMatch[1].trim();
  }
  
  const emailMatch = gpcText.match(/Claimant email:\s*(\S+@\S+)/i);
  if (emailMatch) {
    lawFirmInfo.email = emailMatch[1].trim();
  }
  
  let telMatch = gpcText.match(/Claimant telephone:\s*([0-9()\s-]+?)(?=\s+Claimant mobile:|Claimant email:|Description of Claim)/i);
  if (telMatch) {
    const rawPhone = telMatch[1].trim();
    lawFirmInfo.telephone = formatPhoneNumber(rawPhone);
  }
  
  console.log('Extracted law firm info:', lawFirmInfo);
  
  return lawFirmInfo;
}

function fillRegistryInfo(xml, registryInfo) {
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tables.length === 0) {
    console.error('No tables found in document');
    return xml;
  }
  
  let headerTable = tables[0];
  const rows = headerTable.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  
  if (!rows || rows.length < 2) {
    console.error('Header table does not have enough rows');
    return xml;
  }
  
  let registryRow = rows[1];
  const cells = registryRow.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  
  if (!cells || cells.length === 0) {
    console.error('Registry row does not have cells');
    return xml;
  }
  
  let registryCell = cells[0];
  
  const registryLines = [
    registryInfo.name,
    registryInfo.street,
    registryInfo.cityStatePostcode
  ].filter(line => line);
  
  const registryParagraphsXml = registryLines.map((line, index) => {
    return `<w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
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
  
  registryCell = registryCell.replace(
    /(<w:tc>[\s\S]*?<w:tcPr>[\s\S]*?<\/w:tcPr>)([\s\S]*?)(<\/w:tc>)/,
    (match, cellStart, cellContent, cellEnd) => {
      return cellStart + registryParagraphsXml + cellEnd;
    }
  );
  
  const newRow = registryRow.replace(cells[0], registryCell);
  const newTable = headerTable.replace(rows[1], newRow);
  
  return xml.replace(headerTable, newTable);
}

function fillLawFirmInfo(xml, lawFirmInfo) {
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tables.length === 0) {
    console.error('No tables found in document');
    return xml;
  }
  
  let lawFirmTable = tables[tables.length - 1];
  const rows = lawFirmTable.match(/<w:tr[\s\S]*?<\/w:tr>/g);
  
  if (!rows || rows.length < 3) {
    console.error('Law firm table does not have enough rows');
    return xml;
  }
  
  console.log('Filling law firm table with:', lawFirmInfo);
  
  let row0 = rows[0];
  const row0Cells = row0.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  if (row0Cells && row0Cells.length >= 2) {
    let lawyerCell = row0Cells[1];
    
    lawyerCell = lawyerCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(lawFirmInfo.lodgedBy)}</w:t></w:r>` + pEnd;
      }
    );
    
    row0 = row0.replace(row0Cells[1], lawyerCell);
  }
  
  let row1 = rows[1];
  const row1Cells = row1.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  if (row1Cells && row1Cells.length >= 2) {
    let addressCell = row1Cells[1];
    
    const fullAddress = `${lawFirmInfo.name}, ${lawFirmInfo.address}`;
    console.log('Inserting address:', fullAddress);
    
    addressCell = addressCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(fullAddress)}</w:t></w:r>` + pEnd;
      }
    );
    
    row1 = row1.replace(row1Cells[1], addressCell);
  }
  
  let row2 = rows[2];
  const row2Cells = row2.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  
  if (row2Cells && row2Cells.length >= 7) {
    let telCell = row2Cells[2];
    telCell = telCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(lawFirmInfo.telephone)}</w:t></w:r>` + pEnd;
      }
    );
    
    let emailCell = row2Cells[4];
    emailCell = emailCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(lawFirmInfo.email)}</w:t></w:r>` + pEnd;
      }
    );
    
    let refCell = row2Cells[6];
    refCell = refCell.replace(
      /(<w:tc>[\s\S]*?)(<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/,
      (match, cellStart, pStart, pContent, pEnd) => {
        return cellStart + pStart + `<w:r><w:t>${escapeXml(lawFirmInfo.reference)}</w:t></w:r>` + pEnd;
      }
    );
    
    row2 = row2.replace(row2Cells[2], telCell);
    row2 = row2.replace(row2Cells[4], emailCell);
    row2 = row2.replace(row2Cells[6], refCell);
  }
  
  let newTable = lawFirmTable;
  newTable = newTable.replace(rows[0], row0);
  newTable = newTable.replace(rows[1], row1);
  newTable = newTable.replace(rows[2], row2);
  
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

function formatDefendantName(name) {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  
  if (parts.length === 1) {
    return parts[0].toUpperCase();
  }
  
  const surname = parts[parts.length - 1].toUpperCase();
  const givenNames = parts.slice(0, -1).map(part => {
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(' ');
  
  return `${givenNames} ${surname}`;
}

function formatAddress(address) {
  if (!address) return '';
  
  const streetTypes = [
    'Street', 'St', 'Road', 'Rd', 'Drive', 'Dr', 'Avenue', 'Ave', 
    'Court', 'Ct', 'Place', 'Pl', 'Crescent', 'Cres', 'Lane', 'La',
    'Way', 'Terrace', 'Tce', 'Circuit', 'Cct', 'Close', 'Cl',
    'Boulevard', 'Blvd', 'Parade', 'Pde', 'Highway', 'Hwy',
    'Grove', 'Gr', 'Rise', 'Mews', 'Walk', 'Gardens', 'Gdns'
  ];
  
  const streetTypePattern = streetTypes.join('|');
  const regex = new RegExp(`\\b(${streetTypePattern})\\b(?!,)`, 'i');
  
  let formatted = address;
  formatted = formatted.replace(regex, '$1,');
  
  formatted = formatted.replace(/,\s+([A-Z\s]+)\s+(WA|NSW|VIC|QLD|SA|TAS|NT|ACT)\s+(\d{4})/g, 
    (match, suburb, state, postcode) => {
      const titleCaseSuburb = suburb.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join(' ');
      
      return `, ${titleCaseSuburb} ${state} ${postcode}`;
    }
  );
  
  return formatted;
}

function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
    const areaCode = digitsOnly.substring(0, 2);
    const firstPart = digitsOnly.substring(2, 6);
    const secondPart = digitsOnly.substring(6, 10);
    return `(${areaCode}) ${firstPart} ${secondPart}`;
  }
  
  if (digitsOnly.length === 10 && digitsOnly.startsWith('04')) {
    const prefix = digitsOnly.substring(0, 4);
    const firstPart = digitsOnly.substring(4, 7);
    const secondPart = digitsOnly.substring(7, 10);
    return `${prefix} ${firstPart} ${secondPart}`;
  }
  
  return phone;
}

function fillDefendantTablePS(xml, tableIndex, label, allDefendants) {
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g);
  
  if (!tables || tableIndex >= tables.length) {
    return xml;
  }
  
  let table = tables[tableIndex];
  const cells = table.match(/<w:tc>[\s\S]*?<\/w:tc>/g);
  
  if (!cells || cells.length < 2) {
    return xml;
  }
  
  let labelCell = cells[0];
  labelCell = labelCell.replace(
    /<w:t>.*?<\/w:t>/,
    `<w:t>${escapeXml(label)}</w:t>`
  );
  
  let valueCell = cells[1];
  valueCell = valueCell.replace(
    /<w:t>.*?<\/w:t>/,
    `<w:t>${escapeXml(allDefendants)}</w:t>`
  );
  
  const newTable = table.replace(cells[0], labelCell).replace(cells[1], valueCell);
  return xml.replace(table, newTable);
}

function fillServiceStatementPS(xml, formattedDefendantName, defendantAddress, dateLodged) {
  let result = xml;
  
  result = result.replace(
    /the\s+(First|Second|Third|Fourth|Fifth|Sixth)\s+Defendant/g,
    `${formattedDefendantName}`
  );
  
  result = result.replace(
    /Joe BLOGGS/g,
    formattedDefendantName
  );
  
  if (defendantAddress) {
    const formattedAddress = formatAddress(defendantAddress);
    result = result.replace(
      /\[Place\]/g,
      formattedAddress
    );
  }
  
  if (dateLodged) {
    result = result.replace(
      /\[date\]/g,
      dateLodged
    );
  }
  
  return result;
}
