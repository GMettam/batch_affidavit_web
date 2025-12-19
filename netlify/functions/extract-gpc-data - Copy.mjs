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
    const prompt = `You are extracting information from a Western Australian Magistrates Court GPC (General Procedure Claim) document.

IMPORTANT: This GPC may have MULTIPLE defendants. You must extract information for ALL defendants listed.

Extract the following information and return ONLY a valid JSON object with no additional text:

{
  "caseNumber": "the GCLM case number (e.g., GCLM/2763/2024)",
  "claimant": "the claimant's full name",
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

GPC Document Text:
${text}

Remember: 
- Return ONLY the JSON object, nothing else
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
