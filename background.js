// Background service worker
importScripts('screenshot-service.js');

let popupWindowId = null;
let screenshotService = null;

// Initialize screenshot service
try {
  screenshotService = new ScreenshotService();
} catch (error) {
  console.error('Failed to initialize screenshot service:', error);
}

// Open popup window when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  // Check if popup window already exists
  if (popupWindowId !== null) {
    try {
      const window = await chrome.windows.get(popupWindowId);
      // Window exists, focus it
      chrome.windows.update(popupWindowId, { focused: true });
      return;
    } catch (error) {
      // Window was closed, create a new one
      popupWindowId = null;
    }
  }

  // Create new popup window
  const window = await chrome.windows.create({
    url: chrome.runtime.getURL('sidepanel.html'),
    type: 'popup',
    width: 400,
    height: 600,
    left: 100,
    top: 100
  });
  
  popupWindowId = window.id;
});

// Listen for window removal to clear the stored window ID
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'URL_CHANGED') {
    // Forward URL changes to the popup window
    if (popupWindowId !== null) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_URL',
        url: message.url
      }).catch(() => {
        // Popup might not be ready or closed, that's okay
      });
    }
  }

  // Forward offscreen document messages (these come from screenshot-service via popup)
  if (message.type === 'STITCH_SCREENSHOTS' || message.type === 'RESIZE_IMAGE') {
    // Let the offscreen document handle these - don't process here
    // Return false to allow message to propagate to other listeners (offscreen doc)
    return false;
  }

  if (message.type === 'CAPTURE_SCREENSHOT') {
    // Handle screenshot capture request
    const fullPage = message.fullPage !== false; // Default to full page
    
    handleScreenshotCapture(message.tabId, fullPage, (progress) => {
      // Send progress updates to the popup
      chrome.runtime.sendMessage({
        type: 'SCREENSHOT_PROGRESS',
        ...progress
      }).catch(() => {
        // Popup might not be listening
      });
    })
      .then(dataUrl => {
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch(error => {
        console.error('Screenshot capture error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'NAVIGATE_TAB') {
    // Handle navigation request - navigate the active tab to a new URL
    handleNavigateTab(message.url)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Navigation error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

// Navigation handler - navigate the active tab to a new URL
async function handleNavigateTab(url) {
  try {
    // Get the active tab in the last focused window (excluding the popup)
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    
    // Find the most recently focused normal window
    let targetWindow = null;
    for (const win of windows) {
      if (win.id !== popupWindowId && win.focused) {
        targetWindow = win;
        break;
      }
    }
    
    // If no focused window, just get the first normal window
    if (!targetWindow) {
      targetWindow = windows.find(w => w.id !== popupWindowId);
    }
    
    if (!targetWindow) {
      throw new Error('No browser window found');
    }
    
    // Get the active tab in that window
    const [activeTab] = await chrome.tabs.query({ 
      active: true, 
      windowId: targetWindow.id 
    });
    
    if (!activeTab) {
      throw new Error('No active tab found');
    }
    
    // Navigate the tab
    await chrome.tabs.update(activeTab.id, { url: url });
    
    return { success: true };
  } catch (error) {
    console.error('Error in handleNavigateTab:', error);
    throw error;
  }
}

// Screenshot capture handler
async function handleScreenshotCapture(tabId, fullPage = true, onProgress = null) {
  try {
    if (!screenshotService) {
      screenshotService = new ScreenshotService();
    }
    
    // Make sure the tab is active in its window
    // (captureVisibleTab captures the active tab in the specified window)
    await chrome.tabs.update(tabId, { active: true });
    
    // Small delay to ensure tab is fully activated
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Use the screenshot service to capture
    let dataUrl;
    if (fullPage) {
      dataUrl = await screenshotService.captureFullPage(tabId, onProgress);
    } else {
      dataUrl = await screenshotService.captureViewport(tabId);
    }
    
    return dataUrl;
  } catch (error) {
    console.error('Error in handleScreenshotCapture:', error);
    throw error;
  }
}

// Listen for active tab changes to update the popup
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (popupWindowId !== null) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      chrome.runtime.sendMessage({
        type: 'UPDATE_URL',
        url: tab.url
      }).catch(() => {
        // Popup might not be ready, that's okay
      });
    } catch (error) {
      // Tab might not be accessible, that's okay
    }
  }
});

// Listen for tab updates (URL changes) to update the popup
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (popupWindowId !== null && changeInfo.url) {
    // Check if this is the active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id === tabId) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_URL',
        url: changeInfo.url
      }).catch(() => {
        // Popup might not be ready, that's okay
      });
    }
  }
});
