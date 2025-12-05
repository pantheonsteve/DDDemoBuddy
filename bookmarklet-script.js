// Datadog Demo Buddy - Bookmarklet Script
// This script is loaded by the bookmarklet and handles all the popup logic

(function() {
  'use strict';
  
  console.log('[TalkTrack] Script loaded');
  
  const STORAGE_KEY = 'talkTrackHelper_tracks';
  
  // Check if clicked from popup window
  if (window.name === 'TalkTrackHelper') {
    console.error('[TalkTrack] ERROR: Clicked from popup window');
    alert('Please click the bookmarklet from the page you want to track, not from this popup.');
    return;
  }
  
  const sourceWindow = window;
  console.log('[TalkTrack] Source window:', sourceWindow.location.href);
  
  // Load tracks from localStorage
  function getTracks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const tracks = JSON.parse(stored || '[]');
      console.log('[TalkTrack] Loaded tracks:', tracks.length, 'tracks');
      if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
        console.warn('[TalkTrack] No tracks configured. Please add tracks in the configuration page.');
      }
      return tracks;
    } catch (e) {
      console.error('[TalkTrack] Error loading tracks:', e);
      return [];
    }
  }
  
  // Check if URL matches pattern (with wildcard support)
  function urlMatches(url, pattern) {
    if (pattern.includes('*')) {
      // Convert wildcard pattern to regex
      const parts = pattern.split('*');
      let regexStr = '^';
      for (let i = 0; i < parts.length; i++) {
        regexStr += parts[i].replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        if (i < parts.length - 1) regexStr += '.*';
      }
      regexStr += '$';
      const result = new RegExp(regexStr).test(url);
      console.log('[TalkTrack] Pattern match:', pattern, '->', result);
      return result;
    }
    return url.includes(pattern);
  }
  
  // Find matching track for current URL
  function findMatchingTrack(url) {
    console.log('[TalkTrack] Finding match for:', url);
    const tracks = getTracks();
    
    for (const track of tracks) {
      const patterns = track.urlPattern.split('\n').map(p => p.trim()).filter(p => p);
      console.log('[TalkTrack] Checking track with patterns:', patterns);
      
      for (const pattern of patterns) {
        if (urlMatches(url, pattern)) {
          console.log('[TalkTrack] MATCH FOUND for pattern:', pattern);
          return track;
        }
      }
    }
    
    console.log('[TalkTrack] No match found');
    return null;
  }
  
  // Escape HTML for safe display
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Get content for current URL
  function getContent() {
    try {
      const fullUrl = sourceWindow.location.href;
      const displayUrl = sourceWindow.location.pathname + sourceWindow.location.search;
      console.log('[TalkTrack] Getting content for URL:', fullUrl);
      
      const track = findMatchingTrack(fullUrl);
      console.log('[TalkTrack] Track result:', track ? 'Found' : 'Not found');
      
      return {
        track: track,
        fullUrl: fullUrl,
        displayUrl: displayUrl
      };
    } catch (e) {
      console.error('[TalkTrack] Error in getContent:', e);
      return {
        track: null,
        fullUrl: 'Error: ' + e.message,
        displayUrl: 'Error'
      };
    }
  }
  
  // Update popup content
  function updatePopupContent(popup) {
    try {
      if (popup.closed) {
        console.log('[TalkTrack] Popup closed');
        return false;
      }
      
      const data = getContent();
      
      if (popup.document.getElementById('fullUrl')) {
        popup.document.getElementById('displayUrl').textContent = data.displayUrl;
        popup.document.getElementById('fullUrl').textContent = data.fullUrl;
        popup.document.getElementById('content').innerHTML = data.track 
          ? `<div class="talk-track">${escapeHtml(data.track.content)}</div>`
          : `<div class="no-match"><p>No talk track configured for this page.</p><p style="font-size:12px;margin-top:16px">Go to the configuration page to add talk tracks.</p></div>`;
        console.log('[TalkTrack] Popup updated successfully');
      }
      
      return true;
    } catch (e) {
      console.error('[TalkTrack] Error updating popup:', e);
      return false;
    }
  }
  
  // Render popup window
  function renderPopup(popup) {
    try {
      console.log('[TalkTrack] Rendering popup');
      const data = getContent();
      const doc = popup.document;
      
      // Clear and set up document
      doc.open();
      doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Datadog Demo Buddy</title></head><body><div id="root"></div></body></html>');
      doc.close();
      
      // Add styles
      const style = doc.createElement('style');
      style.textContent = `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f5f5f5;
        }
        .header {
          background-color: #632ca6;
          color: white;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }
        .current-url {
          font-size: 11px;
          opacity: 0.9;
          word-break: break-all;
          margin-top: 4px;
        }
        .url-label {
          font-size: 10px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: white;
        }
        .talk-track {
          white-space: pre-wrap;
          line-height: 1.8;
          font-size: 16px;
          color: #333;
        }
        .no-match {
          color: #c00;
          font-style: italic;
          text-align: center;
          padding: 60px 20px;
          font-weight: bold;
        }
      `;
      doc.head.appendChild(style);
      
      // Render content
      const root = doc.getElementById('root');
      let noTracksMsg = '';
      if (!data.track) {
        noTracksMsg = `<div class="no-match"><p>No talk track configured for this page.</p><p style="font-size:12px;margin-top:16px">Go to the configuration page to add talk tracks.</p><p style="color:#c00;font-weight:bold;margin-top:20px">[ERROR] No matching track found. Check your patterns in the config page.</p></div>`;
      }
      
      root.innerHTML = `
        <div class="header">
          <h1>🎯 Datadog Demo Buddy</h1>
          <div class="url-label">Current Page:</div>
          <div class="current-url" id="displayUrl">${escapeHtml(data.displayUrl)}</div>
          <div class="url-label" style="margin-top:8px">Matching Against:</div>
          <div class="current-url" id="fullUrl">${escapeHtml(data.fullUrl)}</div>
        </div>
        <div class="content" id="content">
          ${data.track ? `<div class="talk-track">${escapeHtml(data.track.content)}</div>` : noTracksMsg}
        </div>
      `;
      
      console.log('[TalkTrack] Popup rendered successfully');
    } catch (e) {
      console.error('[TalkTrack] Error rendering popup:', e);
    }
  }
  
  // Main execution
  try {
    console.log('[TalkTrack] Attempting to open popup window...');
    let popup = window.open('', 'TalkTrackHelper', 'width=500,height=600,left=100,top=100,resizable=yes,scrollbars=yes');
    
    if (popup) {
      console.log('[TalkTrack] Popup opened');
      popup.opener = sourceWindow;
      renderPopup(popup);
      
      // Set up auto-update interval
      if (!sourceWindow._talkTrackInterval) {
        console.log('[TalkTrack] Starting update interval');
        sourceWindow._talkTrackInterval = setInterval(function() {
          if (!popup || popup.closed) {
            console.log('[TalkTrack] Popup closed, stopping interval');
            clearInterval(sourceWindow._talkTrackInterval);
            sourceWindow._talkTrackInterval = null;
          } else {
            updatePopupContent(popup);
          }
        }, 500);
      }
      
      popup.focus();
    } else {
      console.error('[TalkTrack] Failed to open popup');
      alert('[TalkTrack] ERROR: Popup window could not be opened. Please allow popups for this site.');
    }
  } catch (e) {
    console.error('[TalkTrack] Fatal error:', e);
    alert('[TalkTrack] Fatal error: ' + e.message);
  }
})();
