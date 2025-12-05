// OpenAI API integration service

class AIService {
  constructor() {
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-4o'; // GPT-4o supports vision
    this.maxTokens = 1500;
  }

  /**
   * Generate talk track from screenshot
   * @param {string} imageData - Base64 data URL of screenshot
   * @param {Object} persona - Persona object with name and description
   * @param {string} currentUrl - Current page URL
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<Object>} Generated talk track with title and content
   */
  async generateTalkTrack(imageData, persona, currentUrl, apiKey) {
    try {
      // Construct the prompt
      const prompt = this.buildPrompt(persona, currentUrl);

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
          max_tokens: this.maxTokens,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in API response');
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
   * @returns {string} Formatted prompt
   */
  buildPrompt(persona, currentUrl) {
    return `You are a ${persona.name} analyzing a Datadog monitoring page.

${persona.description}

Based on the screenshot provided, create a concise, engaging talk track for this page.

Requirements:
- Use markdown formatting (headings, bold, bullets, etc.)
- Keep it practical and demo-focused (2-3 minutes to present)
- Include specific UI elements visible in the screenshot
- Highlight 3-5 key points or features
- Add transition suggestions for demo flow
- Make it persona-appropriate: ${persona.description}

Current page URL: ${currentUrl}

For a technical audience, view the screenshot and generate a bulleted list of what you see and what is noteworthy to highlight in a dmonstration.

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

