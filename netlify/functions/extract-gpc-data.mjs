import Anthropic from '@anthropic-ai/sdk';

export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, filename } = JSON.parse(event.body);
    
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No text provided' })
      };
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Create the extraction prompt that finds ALL defendants
    const prompt = `You are extracting information from a Western Australian Magistrates Court GPC (General Procedure Claim) Form 3 document.

CRITICAL INSTRUCTIONS FOR CLAIMANT NAME:
The document has a table structure with these sections:
1. REGISTRY AT: (contains court address - IGNORE THIS)
2. Claimant section with "Legal Name:" field
3. Defendant section(s) with "Legal Name:" field
4. "Signature of Claimant or Lawyer:" field (may contain law firm names - IGNORE THIS)
5. "Claimant's address for service:" (contains law firm address - IGNORE THIS)

YOU MUST extract the claimant name from the FIRST "Legal Name:" field that appears AFTER the word "Claimant" and BEFORE any "Defendant" section.

LOOK FOR THIS EXACT PATTERN in the text:
"Claimant" ... "Legal Name:" ... [THE CLAIMANT NAME IS HERE]

DO NOT extract from:
- "Signature of Claimant or Lawyer:" (this might say "McCabes", "ROY GALVIN & CO", etc.)
- "Claimant's address for service:" (this contains law firm info)
- Any text in the REGISTRY AT section

The claimant can be a PERSON (e.g., "Geoffrey OGDEN") OR an ORGANIZATION (e.g., "IMMACULATE HEART COLLEGE").

IMPORTANT: This GPC may have MULTIPLE defendants. You must extract information for ALL defendants listed.

Extract the following information and return ONLY a valid JSON object with no additional text:

{
  "caseNumber": "the GCLM case number (e.g., GCLM/2763/2024)",
  "claimant": "the name from the FIRST 'Legal Name:' field after 'Claimant' (person OR organization name)",
  "defendants": [
    {
      "name": "First defendant's full name from 'Legal Name:' field",
      "address": "First defendant's full address from 'Address:' field"
    },
    {
      "name": "Second defendant's full name (if exists)",
      "address": "Second defendant's full address (if exists)"
    }
    // Include ALL defendants found in the document
  ]
}

EXAMPLES OF CORRECT EXTRACTION:

Example 1 - Individual claimant:
If the document shows:
Claimant | Legal Name: Geoffrey OGDEN
         | Address: C/- McCabes Level 16, 44 St Georges Terrace PERTH WA 6000
Then extract: "claimant": "Geoffrey OGDEN"

Example 2 - Organization claimant:
If the document shows:
Claimant | Legal Name: IMMACULATE HEART COLLEGE
         | Address: 34 Santa Gertrudis Drive LOWER CHITTERING WA 6084
Then extract: "claimant": "IMMACULATE HEART COLLEGE"

DO NOT extract:
- "claimant": "McCabes" (this is from signature or address for service)
- "claimant": "ROY GALVIN & CO" (this is from signature or address for service)

GPC Document Text:
${text}

Remember: 
- Return ONLY the JSON object, nothing else
- Extract claimant from the FIRST "Legal Name:" after "Claimant" section
- Ignore any law firm names in signature or address for service fields
- Include ALL defendants in the "defendants" array
- Each defendant should have "name" and "address" fields
- If there's only one defendant, the array will have one object
- If there are multiple defendants, include them all`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extract the response text
    const responseText = message.content[0].text;
    
    // Parse the JSON response
    let extractedData;
    try {
      // Try to parse directly
      extractedData = JSON.parse(responseText);
    } catch (e) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not parse JSON from response');
      }
    }

    // Validate that we have the expected structure
    if (!extractedData.caseNumber || !extractedData.claimant || !extractedData.defendants || !Array.isArray(extractedData.defendants)) {
      throw new Error('Invalid data structure returned from extraction');
    }

    // Add the filename for reference
    extractedData.filename = filename;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(extractedData)
    };

  } catch (error) {
    console.error('Error extracting GPC data:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to extract data from GPC',
        details: error.message 
      })
    };
  }
};
