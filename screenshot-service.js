// Screenshot capture service for full-page and viewport captures

class ScreenshotService {
  constructor() {
    this.captureQuality = 0.9;
  }

  /**
   * Capture full scrolling page
   * Note: Currently simplified to viewport capture due to service worker limitations
   * Full-page stitching requires DOM APIs not available in service workers
   * @param {number} tabId - The tab ID to capture
   * @returns {Promise<string>} Base64 data URL of the screenshot
   */
  async captureFullPage(tabId) {
    try {
      // For now, just capture the viewport
      // Full-page capture with stitching requires moving this logic
      // to a context with DOM access (content script or popup)
      console.log('Capturing viewport (full-page stitching not yet supported in service worker)');
      return await this.captureViewport(tabId);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw error;
    }
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
        format: 'png'
      });
      return dataUrl;
    } catch (error) {
      console.error('Viewport capture failed:', error);
      throw error;
    }
  }

  /**
   * Stitch multiple screenshots together
   * @param {Array} captures - Array of {dataUrl, position} objects
   * @param {number} viewportHeight - Height of viewport
   * @param {number} viewportWidth - Width of viewport
   * @param {number} totalHeight - Total page height
   * @returns {Promise<string>} Base64 data URL of stitched image
   */
  async stitchImages(captures, viewportHeight, viewportWidth, totalHeight) {
    return new Promise((resolve, reject) => {
      // Create canvas
      const canvas = new OffscreenCanvas(viewportWidth, totalHeight);
      const ctx = canvas.getContext('2d');

      let loadedImages = 0;
      const images = [];

      // Load all images
      captures.forEach((capture, index) => {
        const img = new Image();
        img.onload = () => {
          images[index] = img;
          loadedImages++;

          // When all images loaded, draw them
          if (loadedImages === captures.length) {
            captures.forEach((capture, i) => {
              const img = images[i];
              const y = capture.position;
              ctx.drawImage(img, 0, y);
            });

            // Convert canvas to data URL
            canvas.convertToBlob({ type: 'image/jpeg', quality: this.captureQuality })
              .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              })
              .catch(reject);
          }
        };
        img.onerror = () => reject(new Error(`Failed to load capture ${index}`));
        img.src = capture.dataUrl;
      });
    });
  }

  /**
   * Compress image if it's too large
   * @param {string} dataUrl - Original data URL
   * @param {number} maxSize - Max size in bytes (default 5MB for OpenAI)
   * @returns {Promise<string>} Compressed data URL
   */
  async compressImage(dataUrl, maxSize = 5 * 1024 * 1024) {
    const sizeInBytes = Math.ceil((dataUrl.length * 3) / 4);
    
    if (sizeInBytes <= maxSize) {
      return dataUrl;
    }

    // Need to compress
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Try reducing quality
        let quality = 0.7;
        const attemptCompress = () => {
          canvas.convertToBlob({ type: 'image/jpeg', quality })
            .then(blob => {
              if (blob.size <= maxSize || quality <= 0.3) {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              } else {
                quality -= 0.1;
                attemptCompress();
              }
            })
            .catch(reject);
        };

        attemptCompress();
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotService;
}

