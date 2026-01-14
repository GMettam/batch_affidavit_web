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
- The claimant's name appears in a table under the "Claimant" row, in a field labeled "Legal Name:"
- Extract ONLY the person's actual name from the "Legal Name:" field
- DO NOT extract law firm names, addresses, or "C/-" (care of) information
- The claimant is a PERSON, not a law firm or company

IMPORTANT: This GPC may have MULTIPLE defendants. You must extract information for ALL defendants listed.

Extract the following information and return ONLY a valid JSON object with no additional text:

{
  "caseNumber": "the GCLM case number (e.g., GCLM/2763/2024)",
  "claimant": "the claimant's full name from the 'Legal Name:' field ONLY (e.g., 'Geoffrey OGDEN', NOT law firm names)",
  "defendants": [
    {
      "name": "First defendant's full name",
      "address": "First defendant's full address"
    },
    {
      "name": "Second defendant's full name (if exists)",
      "address": "Second defendant's full address (if exists)"
    }
    // Include ALL defendants found in the document
  ]
}

EXAMPLE OF CORRECT EXTRACTION:
If the document shows:
Claimant | Legal Name: Geoffrey OGDEN
         | Address: C/- McCabes Level 16, 44 St Georges Terrace PERTH WA 6000

Then extract: "claimant": "Geoffrey OGDEN"
DO NOT extract: "claimant": "McCabes" or "ROY GALVIN & CO"

GPC Document Text:
${text}

Remember: 
- Return ONLY the JSON object, nothing else
- The claimant is the PERSON's name from "Legal Name:" field
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
