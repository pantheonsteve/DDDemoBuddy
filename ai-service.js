// OpenAI API integration service

class AIService {
  constructor() {
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-5-mini'; // GPT-5-mini supports vision (reasoning model)
    this.maxTokens = 8000; // Reasoning models need more tokens (reasoning + output)
  }

  /**
   * Generate talk track from screenshot
   * @param {string} imageData - Base64 data URL of screenshot
   * @param {Object} persona - Persona object with name and description
   * @param {string} currentUrl - Current page URL
   * @param {string} apiKey - OpenAI API key
   * @param {Object} customerContext - Optional customer context object
   * @param {Object} docContext - Optional documentation context {referenceText, docUrls}
   * @returns {Promise<Object>} Generated talk track with title and content
   */
  async generateTalkTrack(imageData, persona, currentUrl, apiKey, customerContext = null, docContext = null) {
    try {
      // Construct the prompt with optional customer and documentation context
      const prompt = this.buildPrompt(persona, currentUrl, customerContext, docContext);

      // Prepare the request
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_completion_tokens: this.maxTokens
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('OpenAI API response:', JSON.stringify(data, null, 2));
      
      const content = data.choices?.[0]?.message?.content;
      const refusal = data.choices?.[0]?.message?.refusal;
      const finishReason = data.choices?.[0]?.finish_reason;

      if (refusal) {
        throw new Error(`AI refused to generate: ${refusal}`);
      }

      if (!content) {
        console.error('No content found. Full response:', data);
        console.error('Finish reason:', finishReason);
        throw new Error(`No content in API response. Finish reason: ${finishReason || 'unknown'}`);
      }

      // Extract title and content
      const parsed = this.parseGeneratedContent(content, currentUrl);
      
      return {
        title: parsed.title,
        content: parsed.content,
        rawContent: content
      };
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  }

  /**
   * Build the prompt for OpenAI
   * @param {Object} persona - Persona with name and description
   * @param {string} currentUrl - Current page URL
   * @param {Object} customerContext - Optional customer context with name and discoveryNotes
   * @param {Object} docContext - Optional documentation context {referenceText, docUrls}
   * @returns {string} Formatted prompt
   */
  buildPrompt(persona, currentUrl, customerContext = null, docContext = null) {
    let customerSection = '';
    let docSection = '';
    let docUrlsSection = '';
    
    if (customerContext && customerContext.discoveryNotes) {
      customerSection = `
## Customer Context: ${customerContext.name}
${customerContext.industry ? `Industry: ${customerContext.industry}` : ''}

Discovery Notes (what this customer cares about):
${customerContext.discoveryNotes}

IMPORTANT: Tailor your talk track to address the customer's specific interests and concerns mentioned in the discovery notes above. Make the demo relevant to their use case and pain points.

`;
    }

    if (docContext && docContext.referenceText) {
      docSection = `
## Reference Documentation

Use the terminology, feature names, and concepts from the following documentation when creating the talk track:

---
${docContext.referenceText}
---

IMPORTANT: Incorporate accurate terminology and language from the documentation above. Use official feature names and descriptions where applicable.

`;
    }

    if (docContext && docContext.docUrls && docContext.docUrls.length > 0) {
      docUrlsSection = `
## Documentation Links to Include

At the end of the talk track, include a "📚 Learn More" section with the following documentation links:
${docContext.docUrls.map(url => `- ${url}`).join('\n')}

`;
    }

    return `You are a ${persona.name} analyzing a Datadog monitoring page.

${persona.description}
${customerSection}${docSection}${docUrlsSection}Based on the screenshot provided, create a concise, engaging talk track for this page. Where possible, the narrative should be framed as a story about the customer's business and how Datadog can help the target persona of ${persona.name}. It should be concise and contain the following:

- An overview statement that ties it all together and introduces it to the customer at the very top of the talk track.
- A bulleted list of prioritized page sections to highlight in the demonstration. The section should start with the title of the section as it appears on the screen. Each point should describe what the feature is, why it's valuable${customerContext ? ' for this customer' : ''}, and what it can help the business do.${customerContext ? ' Focus on features that align with the customer\'s discovery notes.' : ''}
- A transition suggestion for the demo flow
- An in-demo discovery question (based on the Command of the Message framework) to ask the customer based on the content of the page and the customer's discovery notes.
- A recommended tell-show-tell flow for the demonstration, based on the Demo2Win framework.

Requirements:
- Highlight value points using this exact format: [[VALUE]]text here[[/VALUE]] - these will appear in dark green
- Highlight business outcomes using this exact format: [[OUTCOME]]text here[[/OUTCOME]] - these will appear in dark blue
- Use markdown formatting (headings, bold, bullets, etc.)
- Keep it practical and demo-focused (2-3 minutes to present)
- Focus on specific UI elements visible in the screenshot, especially the groupings of graphs and the display of data in the main portion of the page.
- Highlight key points or features
- Make it scannable during a demonstration. New sentences should be introduced with a new bulletpoint. 

Example formatting for individual feature bullet points:

**{Short description of visual feature and what it does. Example: Core Configuration Tasks banner (blue/purple strip near the top)}**

- **Why it matters:** [[VALUE]]confirms essential setup steps are complete for secure, compliant monitoring of clinical systems before we rely on alerts[[/VALUE]]
- **Business outcome:** [[OUTCOME]]reduces onboarding time for key log sources (EHR frontends, Apache workers, k8s) so SREs and SecOps can trust detections and avoid blind spots[[/OUTCOME]]

- Make it persona-appropriate: ${persona.description}${customerContext ? `
- Make it customer-specific: Address ${customerContext.name}'s needs and interests` : ''}
- Tailor talking points where appropriate to the customer's industry and discovery notes.

At the bottom of the talk track, include a recommendation for the next page to visit based on the content of the current page${customerContext ? ` and the customer's interests` : ''}.

Current page URL: ${currentUrl}

Generate the talk track now:`;
  }

  /**
   * Parse generated content to extract title and body
   * @param {string} content - Raw generated content
   * @param {string} fallbackUrl - URL to use if title extraction fails
   * @returns {Object} {title, content}
   */
  parseGeneratedContent(content, fallbackUrl) {
    // Try to extract title from first heading
    const lines = content.trim().split('\n');
    let title = '';
    let contentBody = content;

    // Look for first h1 heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
      // Remove the title from content
      contentBody = content.replace(h1Match[0], '').trim();
    } else {
      // Try to generate title from URL
      try {
        const url = new URL(fallbackUrl);
        const pathParts = url.pathname.split('/').filter(p => p);
        title = pathParts[pathParts.length - 1] || 'AI Generated Talk Track';
        title = title.replace(/-/g, ' ').replace(/_/g, ' ');
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      } catch {
        title = 'AI Generated Talk Track';
      }
    }

    return {
      title: title || 'AI Generated Talk Track',
      content: contentBody || content
    };
  }

  /**
   * Validate API key
   * @param {string} apiKey - OpenAI API key to validate
   * @returns {Promise<boolean>} True if valid
   */
  async validateApiKey(apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }

  /**
   * Get error message for user
   * @param {Error} error - The error object
   * @returns {string} User-friendly error message
   */
  getUserErrorMessage(error) {
    const message = error.message.toLowerCase();

    if (message.includes('api key')) {
      return 'Invalid API key. Please check your OpenAI API key in settings.';
    }

    if (message.includes('rate limit')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }

    if (message.includes('quota')) {
      return 'API quota exceeded. Please check your OpenAI account billing.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }

    if (message.includes('timeout')) {
      return 'Request timed out. The page may be too large. Try again or use a smaller screenshot.';
    }

    return `Error generating talk track: ${error.message}`;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}

