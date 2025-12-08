// Screenshot capture service for full-page and viewport captures
// Uses offscreen document for image stitching (DOM APIs not available in service workers)

class ScreenshotService {
  constructor() {
    this.captureQuality = 0.85;
    this.captureDelay = 400; // ms between captures (Chrome rate limit: 2/sec)
    this.offscreenDocumentPath = 'offscreen.html';
    this.hasOffscreenDocument = false;
    this.maxImageWidth = 2048; // Max width for API (keeps file size manageable)
    this.maxImageHeight = 4096; // Max height for full page
  }

  /**
   * Ensure offscreen document is created
   */
  async ensureOffscreenDocument() {
    if (this.hasOffscreenDocument) {
      return;
    }

    try {
      // Check if offscreen document already exists
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(this.offscreenDocumentPath)]
      });

      if (existingContexts.length > 0) {
        this.hasOffscreenDocument = true;
        return;
      }

      // Create offscreen document
      await chrome.offscreen.createDocument({
        url: this.offscreenDocumentPath,
        reasons: ['DOM_PARSER'], // Using DOM APIs for canvas/image manipulation
        justification: 'Stitching multiple viewport screenshots into a single full-page image'
      });

      this.hasOffscreenDocument = true;
      console.log('Offscreen document created for image stitching');
    } catch (error) {
      // Handle case where document already exists
      if (error.message.includes('Only a single offscreen')) {
        this.hasOffscreenDocument = true;
      } else {
        console.error('Failed to create offscreen document:', error);
        throw error;
      }
    }
  }

  /**
   * Close offscreen document to free resources
   */
  async closeOffscreenDocument() {
    if (!this.hasOffscreenDocument) return;

    try {
      await chrome.offscreen.closeDocument();
      this.hasOffscreenDocument = false;
      console.log('Offscreen document closed');
    } catch (error) {
      // Ignore errors if document doesn't exist
      console.log('Offscreen document close error (may not exist):', error.message);
    }
  }

  /**
   * Capture full scrolling page using offscreen document for stitching
   * @param {number} tabId - The tab ID to capture
   * @param {function} onProgress - Optional callback for progress updates
   * @returns {Promise<string>} Base64 data URL of the screenshot
   */
  async captureFullPage(tabId, onProgress = null) {
    try {
      console.log('Starting full-page capture for tab:', tabId);

      // Get page dimensions from content script
      const dimensions = await this.getPageDimensions(tabId);
      console.log('Page dimensions:', dimensions);

      // If page fits in viewport or is very short, just capture viewport
      if (dimensions.scrollHeight <= dimensions.viewportHeight * 1.2) {
        console.log('Page fits in viewport, using single capture');
        return await this.captureViewport(tabId);
      }

      // Ensure offscreen document is ready
      await this.ensureOffscreenDocument();

      // Calculate number of captures needed
      const viewportHeight = dimensions.viewportHeight;
      const viewportWidth = dimensions.viewportWidth;
      const totalHeight = dimensions.scrollHeight;
      const numCaptures = Math.ceil(totalHeight / viewportHeight);

      console.log(`Full-page capture: ${numCaptures} viewports needed`);

      // Capture each viewport section
      const screenshots = [];
      for (let i = 0; i < numCaptures; i++) {
        const yOffset = i * viewportHeight;
        const isLastCapture = i === numCaptures - 1;
        
        // Report progress
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: numCaptures,
            message: `Capturing section ${i + 1} of ${numCaptures}...`
          });
        }

        // Scroll to position
        await this.scrollToPosition(tabId, yOffset);

        // Wait for page to settle after scroll
        await this.delay(150);

        // Capture viewport
        const dataUrl = await this.captureViewport(tabId);

        // For the last capture, we might have overlap
        // Calculate actual yOffset for stitching
        let stitchYOffset = yOffset;
        if (isLastCapture && yOffset + viewportHeight > totalHeight) {
          // Adjust for partial last viewport
          stitchYOffset = totalHeight - viewportHeight;
        }

        screenshots.push({
          dataUrl,
          yOffset: stitchYOffset
        });

        // Wait between captures to avoid rate limiting
        if (i < numCaptures - 1) {
          await this.delay(this.captureDelay);
        }
      }

      // Restore original scroll position
      await this.scrollToPosition(tabId, dimensions.originalScrollY);

      // Report stitching progress
      if (onProgress) {
        onProgress({
          current: numCaptures,
          total: numCaptures,
          message: 'Stitching images...'
        });
      }

      // Send screenshots to offscreen document for stitching
      const stitchedResult = await chrome.runtime.sendMessage({
        type: 'STITCH_SCREENSHOTS',
        screenshots,
        totalWidth: viewportWidth,
        totalHeight: totalHeight,
        maxWidth: this.maxImageWidth,
        maxHeight: this.maxImageHeight
      });

      if (!stitchedResult.success) {
        throw new Error(stitchedResult.error || 'Failed to stitch screenshots');
      }

      console.log('Full-page capture complete');
      return stitchedResult.dataUrl;

    } catch (error) {
      console.error('Full-page capture failed:', error);
      // Fall back to viewport capture
      console.log('Falling back to viewport capture');
      return await this.captureViewport(tabId);
    }
  }

  /**
   * Get page dimensions from content script
   * @param {number} tabId - The tab ID
   * @returns {Promise<Object>} Page dimension info
   */
  async getPageDimensions(tabId) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return {
          scrollHeight: Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          ),
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
          originalScrollY: window.scrollY
        };
      }
    });

    if (!results || !results[0]) {
      throw new Error('Failed to get page dimensions');
    }

    return results[0].result;
  }

  /**
   * Scroll page to specific Y position
   * @param {number} tabId - The tab ID
   * @param {number} yPosition - Y position to scroll to
   */
  async scrollToPosition(tabId, yPosition) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (y) => {
        window.scrollTo({ top: y, behavior: 'instant' });
      },
      args: [yPosition]
    });
  }

  /**
   * Capture just the visible viewport
   * @param {number} tabId - The tab ID to capture
   * @returns {Promise<string>} Base64 data URL of the screenshot
   */
  async captureViewport(tabId) {
    try {
      // Get the tab to find its window ID
      const tab = await chrome.tabs.get(tabId);
      
      // Capture from the specific window that contains the tab
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'jpeg',
        quality: Math.round(this.captureQuality * 100)
      });
      return dataUrl;
    } catch (error) {
      console.error('Viewport capture failed:', error);
      throw error;
    }
  }

  /**
   * Helper to delay execution
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Compress image if it's too large for API
   * Uses offscreen document for image manipulation
   * @param {string} dataUrl - Original data URL
   * @param {number} maxSize - Max size in bytes (default 5MB for OpenAI)
   * @returns {Promise<string>} Compressed data URL
   */
  async compressImage(dataUrl, maxSize = 5 * 1024 * 1024) {
    const sizeInBytes = Math.ceil((dataUrl.length * 3) / 4);
    
    if (sizeInBytes <= maxSize) {
      return dataUrl;
    }

    console.log(`Image too large (${Math.round(sizeInBytes / 1024)}KB), compressing...`);

    // Ensure offscreen document is ready
    await this.ensureOffscreenDocument();

    // Send to offscreen document for resizing
    const result = await chrome.runtime.sendMessage({
      type: 'RESIZE_IMAGE',
      dataUrl,
      maxWidth: Math.round(this.maxImageWidth * 0.75),
      maxHeight: Math.round(this.maxImageHeight * 0.75)
    });

    if (!result.success) {
      console.warn('Compression failed, using original:', result.error);
      return dataUrl;
    }

    return result.dataUrl;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotService;
}
