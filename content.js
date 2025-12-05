// Content script to detect URL changes
let lastUrl = location.href;

// Send initial URL
chrome.runtime.sendMessage({
  type: 'URL_CHANGED',
  url: location.href
});

// Detect URL changes (for SPAs like Datadog)
const observer = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    chrome.runtime.sendMessage({
      type: 'URL_CHANGED',
      url: currentUrl
    });
  }
});

// Observe the document for changes
observer.observe(document, {
  subtree: true,
  childList: true
});

// Also listen for popstate events
window.addEventListener('popstate', () => {
  chrome.runtime.sendMessage({
    type: 'URL_CHANGED',
    url: location.href
  });
});
