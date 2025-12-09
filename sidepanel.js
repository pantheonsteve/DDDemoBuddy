// Initialize Datadog RUM (loaded via CDN in sidepanel.html)
window.DD_RUM && window.DD_RUM.init({
    applicationId: '936722d5-37e8-4cd4-a5ae-68f46c76a6f7',
    clientToken: 'pub6073faa971d344833e0b3bacd3e2dc2e',
    site: 'datadoghq.com',
    service: 'demobuddy',
    env: 'localhost',
    // Specify a version number to identify the deployed version of your application in Datadog
    // version: '1.0.0',
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackBfcacheViews: true,
    defaultPrivacyLevel: 'allow',
});

// Side panel logic
class TalkTrackApp {
  constructor() {
    this.currentUrl = '';
    this.talkTracks = [];
    this.aiMode = false;
    this.editMode = false;
    this.editingTrack = null; // Track being edited/created
    this.selectedPersona = null;
    this.generatedContent = null;
    this.categories = [];
    this.customers = []; // Customer profiles
    this.selectedCustomer = null; // Currently selected customer for demo
    this.baseUrl = 'https://app.datadoghq.com'; // Default base URL
    this.quillEditor = null; // Quill editor instance
    this.aiService = new AIService();
    this.screenshotService = new ScreenshotService();
    this.storageManager = null; // Will be initialized in initCloudSync
    this.syncStatus = { configured: false, lastSync: null, pendingChanges: false };
    this.docContextText = ''; // Documentation text for AI context
    this.docUrls = ''; // Documentation URLs for "Learn More" section
    this.init();
  }

  async init() {
    this.render();
    await this.loadSettings();
    await this.loadTalkTracks();
    await this.loadCategories();
    await this.loadPersonas();
    await this.loadCustomers();
    await this.initCloudSync();
    await this.getCurrentTabUrl();
    this.setupListeners();
  }

  async initCloudSync() {
    try {
      // Use the new StorageManagerV2 singleton (IndexedDB-based)
      if (typeof storageManager === 'undefined') {
        console.warn('StorageManagerV2 not available');
        this.storageManager = null;
        return;
      }
      
      this.storageManager = storageManager;
      await this.storageManager.init();
      await this.updateSyncStatus();
      
      // Listen for storage events
      this.storageManager.addListener((eventType, data) => {
        this.handleSyncEvent(eventType, data);
      });
      
      console.log('[TalkTrackApp] Storage initialized with IndexedDB');
    } catch (error) {
      console.error('Storage init error:', error);
      // Don't let storage errors break the app
      this.storageManager = null;
    }
  }

  handleSyncEvent(eventType, data) {
    switch (eventType) {
      case 'syncCompleted':
      case 'syncError':
      case 'pendingSync':
      case 'configured':
      case 'disconnected':
      case 'syncEnabled':
      case 'syncDisabled':
        this.updateSyncStatus();
        break;
      case 'migrationComplete':
        console.log('[TalkTrackApp] Migration complete:', data);
        this.showNotification(data.message || 'Data migrated successfully');
        this.loadTalkTracks();
        break;
      case 'saved':
      case 'trackSaved':
      case 'trackDeleted':
        // Refresh tracks display
        this.loadTalkTracks();
        break;
    }
  }

  async updateSyncStatus() {
    try {
      if (!this.storageManager) {
        this.syncStatus = { configured: false, lastSync: null, pendingChanges: false };
        this.renderSyncIndicator();
        return;
      }
      
      const status = await this.storageManager.getSyncStatus();
      this.syncStatus = {
        configured: status.isConfigured,
        lastSync: status.lastSync,
        pendingChanges: status.pendingChanges,
        syncInProgress: status.syncInProgress
      };
      this.renderSyncIndicator();
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  renderSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;

    if (!this.syncStatus.configured) {
      indicator.innerHTML = '';
      indicator.title = 'Cloud sync not configured';
      return;
    }

    let icon = '☁️';
    let statusClass = 'synced';
    let title = 'Synced to cloud';

    if (this.syncStatus.syncInProgress) {
      icon = '🔄';
      statusClass = 'syncing';
      title = 'Syncing...';
    } else if (this.syncStatus.pendingChanges) {
      icon = '⏳';
      statusClass = 'pending';
      title = 'Changes pending sync';
    } else if (this.syncStatus.lastSync) {
      const lastSyncDate = new Date(this.syncStatus.lastSync);
      title = `Last synced: ${lastSyncDate.toLocaleString()}`;
    }

    indicator.innerHTML = `<span class="sync-icon ${statusClass}">${icon}</span>`;
    indicator.title = title;
  }

  /**
   * Save tracks using IndexedDB storage
   */
  async saveTracksWithSync(reason = 'Manual save') {
    try {
      console.log(`[SAVE] Starting save: ${reason}`);
      console.log(`[SAVE] Tracks to save:`, JSON.stringify(this.talkTracks.map(t => ({ id: t.id, title: t.title }))));
      
      if (this.storageManager) {
        // Use IndexedDB via StorageManagerV2
        await this.storageManager.saveTracks(this.talkTracks, { reason });
        console.log(`[SAVE] Saved ${this.talkTracks.length} tracks to IndexedDB`);
      } else {
        // Fallback to chrome.storage.local
        await chrome.storage.local.set({ talkTracks: this.talkTracks });
        console.log(`[SAVE] Saved ${this.talkTracks.length} tracks to chrome.storage.local (fallback)`);
      }
      
      // Verify the save worked
      const verification = this.storageManager 
        ? await this.storageManager.loadTracks()
        : (await chrome.storage.local.get(['talkTracks'])).talkTracks || [];
      
      console.log(`[SAVE] Verification - stored ${verification.length} tracks`);
      
      if (verification.length !== this.talkTracks.length) {
        console.error('[SAVE] MISMATCH: Save verification failed!');
      }
      
      this.updateSyncStatus();
    } catch (error) {
      console.error('[SAVE] Error saving tracks:', error);
      alert('Error saving track: ' + error.message);
      throw error;
    }
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['baseUrl']);
    this.baseUrl = result.baseUrl || 'https://app.datadoghq.com';
  }

  async loadCategories() {
    const defaultCategories = [
      'Dashboards', 'APM', 'Logs', 'Infrastructure',
      'RUM', 'Synthetics', 'Security', 'Monitors', 'Other'
    ];
    
    const result = await chrome.storage.local.get(['customCategories']);
    const customCategories = result.customCategories || [];
    
    this.categories = [...defaultCategories, ...customCategories];
  }

  async loadCustomers() {
    try {
      if (this.storageManager) {
        this.customers = await this.storageManager.getCustomers();
        const selectedId = await this.storageManager.getSetting('selectedCustomerId');
        if (selectedId) {
          this.selectedCustomer = this.customers.find(c => c.id === selectedId) || null;
        }
      } else {
        // Fallback
        const result = await chrome.storage.local.get(['customers', 'selectedCustomerId']);
        this.customers = result.customers || [];
        if (result.selectedCustomerId) {
          this.selectedCustomer = this.customers.find(c => c.id === result.selectedCustomerId) || null;
        }
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      this.customers = [];
    }
  }

  async setSelectedCustomer(customerId) {
    this.selectedCustomer = customerId ? this.customers.find(c => c.id === customerId) : null;
    if (this.storageManager) {
      await this.storageManager.setSetting('selectedCustomerId', customerId || null);
    } else {
      await chrome.storage.local.set({ selectedCustomerId: customerId || null });
    }
    this.render();
  }

  getCustomerById(id) {
    return this.customers.find(c => c.id === id);
  }

  isMatchingBaseUrl(url) {
    if (!url || !this.baseUrl) return false;
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(this.baseUrl);
      return urlObj.hostname.includes(baseObj.hostname.replace('www.', ''));
    } catch {
      return url.includes(this.baseUrl);
    }
  }

  async loadPersonas() {
    const defaultPersonas = [
      {
        id: 'sales-engineer',
        name: 'Sales Engineer',
        description: 'Focus on features, benefits, ROI, competitive advantages, and customer success stories'
      },
      {
        id: 'solutions-architect',
        name: 'Solutions Architect',
        description: 'Emphasize technical architecture, integrations, scalability, and implementation best practices'
      },
      {
        id: 'executive-briefing',
        name: 'Executive Briefing',
        description: 'High-level business value, strategic benefits, time-to-value, and key metrics'
      },
      {
        id: 'technical-deep-dive',
        name: 'Technical Deep Dive',
        description: 'In-depth technical details, APIs, data models, query languages, and advanced features'
      },
      {
        id: 'customer-success',
        name: 'Customer Success',
        description: 'Onboarding guidance, best practices, tips and tricks, common pitfalls, and support resources'
      }
    ];

    const result = await chrome.storage.local.get(['customPersonas']);
    const customPersonas = result.customPersonas || [];
    
    this.personas = [...defaultPersonas, ...customPersonas];
    this.selectedPersona = this.personas[0]; // Default to first persona
  }

  async loadTalkTracks() {
    console.log('[LOAD] Loading talk tracks from storage...');
    try {
      // Use IndexedDB storage via StorageManagerV2
      if (this.storageManager) {
        this.talkTracks = await this.storageManager.loadTracks();
      } else {
        // Fallback to chrome.storage.local if StorageManager not ready
        const result = await chrome.storage.local.get(['talkTracks']);
        this.talkTracks = result.talkTracks || [];
      }
      console.log(`[LOAD] Loaded ${this.talkTracks.length} tracks:`, this.talkTracks.map(t => ({ id: t.id, title: t.title })));
    } catch (error) {
      console.error('[LOAD] Error loading tracks:', error);
      // Fallback to chrome.storage.local
      const result = await chrome.storage.local.get(['talkTracks']);
      this.talkTracks = result.talkTracks || [];
    }
    this.render();
  }

  async getCurrentTabUrl() {
    // Get all windows and find the first non-popup window with an active tab
    const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
    for (const window of windows) {
      const activeTab = window.tabs.find(tab => tab.active);
      if (activeTab) {
        this.updateUrl(activeTab.url);
        return;
      }
    }
  }

  setupListeners() {
    // Listen for URL updates from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'UPDATE_URL') {
        this.updateUrl(message.url);
      }
    });

    // Listen for storage changes (when user updates talk tracks)
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.talkTracks) {
        const oldCount = changes.talkTracks.oldValue?.length || 0;
        const newCount = changes.talkTracks.newValue?.length || 0;
        console.log(`[STORAGE CHANGE] Talk tracks changed: ${oldCount} -> ${newCount} tracks`);
        
        if (newCount < oldCount) {
          console.warn('[STORAGE CHANGE] WARNING: Track count decreased!');
          console.log('[STORAGE CHANGE] Old tracks:', changes.talkTracks.oldValue?.map(t => ({ id: t.id, title: t.title })));
          console.log('[STORAGE CHANGE] New tracks:', changes.talkTracks.newValue?.map(t => ({ id: t.id, title: t.title })));
        }
        
        this.talkTracks = changes.talkTracks.newValue || [];
        if (!this.aiMode) {
          this.render();
        }
      }
      if (changes.customPersonas) {
        this.loadPersonas();
      }
      if (changes.customers) {
        this.customers = changes.customers.newValue || [];
        // Clear selection if customer was deleted
        if (this.selectedCustomer && !this.customers.find(c => c.id === this.selectedCustomer.id)) {
          this.selectedCustomer = null;
        }
        if (!this.aiMode && !this.editMode) {
          this.render();
        }
      }
    });

    // Listen for screenshot progress updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SCREENSHOT_PROGRESS') {
        this.updateCaptureProgress(message);
      }
    });

    // Delegated click handler for navigation buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-button')) {
        e.preventDefault();
        const url = e.target.getAttribute('data-nav-url');
        if (url) {
          this.navigateActiveTab(url);
        }
      }
    });
  }

  /**
   * Navigate the active browser tab to a new URL
   */
  async navigateActiveTab(url) {
    try {
      // Send message to background script to navigate the active tab
      const response = await chrome.runtime.sendMessage({
        type: 'NAVIGATE_TAB',
        url: url
      });
      
      if (!response?.success) {
        console.error('Navigation failed:', response?.error);
        this.showNotification('Navigation failed', 'error');
      }
    } catch (error) {
      console.error('Error navigating tab:', error);
      this.showNotification('Navigation failed', 'error');
    }
  }

  /**
   * Show a brief notification
   */
  showNotification(message, type = 'success') {
    const existing = document.querySelector('.popup-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'popup-notification';
    notification.textContent = message;
    if (type === 'error') {
      notification.style.backgroundColor = '#dc3545';
    }
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  toggleAiMode() {
    this.aiMode = !this.aiMode;
    this.editMode = false;
    this.render();
  }

  async enterEditMode(track = null) {
    this.editMode = true;
    this.aiMode = false;
    
    if (track) {
      // Editing existing track
      this.editingTrack = { ...track };
    } else {
      // Creating new track - get page title from active tab
      let pageTitle = '';
      try {
        const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
        for (const window of windows) {
          const activeTab = window.tabs.find(tab => tab.active);
          if (activeTab && activeTab.title) {
            pageTitle = activeTab.title;
            // Clean up common suffixes
            pageTitle = pageTitle
              .replace(/\s*[-|–]\s*Datadog$/i, '')
              .replace(/\s*[-|–]\s*Google Docs$/i, '')
              .replace(/\s*[-|–]\s*Google Sheets$/i, '')
              .trim();
            break;
          }
        }
      } catch (error) {
        console.log('Could not get page title:', error);
      }
      
      this.editingTrack = {
        id: null,
        title: pageTitle,
        category: this.inferCategory(this.currentUrl),
        urlPattern: this.createUrlPattern(this.currentUrl),
        content: '',
        customerId: this.selectedCustomer?.id || null // Tag with selected customer
      };
    }
    
    this.render();
  }

  exitEditMode() {
    // Clean up Quill editor properly
    if (this.quillEditor) {
      this.quillEditor.off('text-change');
      this.quillEditor = null;
    }
    this.editMode = false;
    this.editingTrack = null;
    this.render();
  }

  initQuillEditor() {
    const container = document.getElementById('quillEditorPopup');
    if (!container) return;

    // Initialize Quill with a compact toolbar for popup
    this.quillEditor = new Quill(container, {
      theme: 'snow',
      placeholder: 'Write your talk track here...',
      modules: {
        toolbar: {
          container: [
            [{ 'header': [2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['blockquote'],
            ['link', 'insertNavLink'],
            ['clean']
          ],
          handlers: {
            'insertNavLink': () => this.insertNavigationLink()
          }
        }
      }
    });

    // Add tooltip to the custom button
    const navLinkBtn = document.querySelector('.ql-insertNavLink');
    if (navLinkBtn) {
      navLinkBtn.title = 'Insert Navigation Link';
    }

    // Load initial content using Quill's clipboard for proper Delta conversion
    if (this.editingTrack?.content) {
      const html = ContentConverter.markdownToHtml(this.editingTrack.content);
      console.log('Loading HTML into Quill:', html);
      
      try {
        // Use Quill's clipboard module for proper conversion to Delta format
        // Quill 2.x uses clipboard.convert({ html }), older versions use clipboard.convert(html)
        let delta;
        if (typeof this.quillEditor.clipboard.convert === 'function') {
          try {
            delta = this.quillEditor.clipboard.convert({ html });
          } catch (e) {
            // Fallback for older Quill versions
            delta = this.quillEditor.clipboard.convert(html);
          }
        }
        
        if (delta) {
          this.quillEditor.setContents(delta, 'silent');
        } else {
          // Ultimate fallback - use pasteHTML
          this.quillEditor.root.innerHTML = html;
        }
      } catch (error) {
        console.warn('Error loading content into Quill, using fallback:', error);
        this.quillEditor.root.innerHTML = html;
      }
    }

    // Track changes
    this.quillEditor.on('text-change', () => {
      if (this.editingTrack) {
        // Store HTML temporarily
        this.editingTrack._quillHtml = this.quillEditor.root.innerHTML;
      }
    });
  }

  validateUrlPattern(pattern) {
    if (!pattern || !this.currentUrl) {
      return { valid: false, matches: false, message: 'Enter a URL pattern' };
    }
    
    try {
      // Check if pattern matches current URL
      const matches = this.urlMatches(this.currentUrl, pattern);
      
      return {
        valid: true,
        matches: matches,
        message: matches 
          ? '✅ Pattern matches current page!' 
          : '❌ Pattern does NOT match current page'
      };
    } catch (error) {
      return {
        valid: false,
        matches: false,
        message: '⚠️ Invalid pattern syntax'
      };
    }
  }

  updateEditingTrack(field, value) {
    if (this.editingTrack) {
      this.editingTrack[field] = value;
      
      // Re-render validation if URL pattern changed
      if (field === 'urlPattern') {
        this.updateUrlValidation();
      }
    }
  }

  updateUrlValidation() {
    const validationEl = document.getElementById('urlPatternValidation');
    if (validationEl && this.editingTrack) {
      const validation = this.validateUrlPattern(this.editingTrack.urlPattern);
      validationEl.innerHTML = `
        <span class="${validation.matches ? 'validation-success' : 'validation-error'}">
          ${validation.message}
        </span>
      `;
    }
  }

  async saveEditingTrack() {
    if (!this.editingTrack) return;
    
    // Validate
    if (!this.editingTrack.urlPattern.trim()) {
      alert('Please enter a URL pattern');
      return;
    }
    
    // Get content from Quill editor
    if (this.quillEditor) {
      const html = this.quillEditor.root.innerHTML;
      
      // DETAILED DEBUG OUTPUT
      console.log('=== SAVE DEBUG START ===');
      console.log('Raw Quill HTML:');
      console.log(html);
      console.log('---');
      
      // Check for ql-indent classes
      const hasIndent = html.includes('ql-indent');
      console.log('Has ql-indent classes:', hasIndent);
      
      // Check for data-list attributes
      const hasDataList = html.includes('data-list');
      console.log('Has data-list attributes:', hasDataList);
      
      // Debug the HTML structure
      ContentConverter.debugHtml(html);
      
      // Convert HTML to markdown for storage
      const markdown = ContentConverter.htmlToMarkdown(html);
      console.log('---');
      console.log('Converted Markdown:');
      console.log(markdown);
      console.log('=== SAVE DEBUG END ===');
      
      // Store both for backup
      this.editingTrack.content = markdown;
      this.editingTrack.htmlBackup = html; // Keep HTML backup in case conversion has issues
    }
    
    // Get title, category, and customer from form
    const titleInput = document.getElementById('editTitle');
    const categorySelect = document.getElementById('editCategory');
    const customerSelect = document.getElementById('editCustomer');
    if (titleInput) this.editingTrack.title = titleInput.value.trim();
    if (categorySelect) this.editingTrack.category = categorySelect.value;
    if (customerSelect) this.editingTrack.customerId = customerSelect.value || null;
    
    const isNew = !this.editingTrack.id;
    
    if (this.editingTrack.id) {
      // Update existing track
      const index = this.talkTracks.findIndex(t => t.id === this.editingTrack.id);
      if (index !== -1) {
        this.talkTracks[index] = { ...this.editingTrack };
      }
    } else {
      // Create new track
      this.editingTrack.id = Date.now();
      this.editingTrack.order = this.talkTracks.length;
      this.talkTracks.push(this.editingTrack);
    }
    
    await this.saveTracksWithSync(isNew ? 'Created new track' : 'Updated track');
    
    console.log('Saved track:', this.editingTrack);
    this.showNotification(isNew ? 'New talk track created!' : 'Talk track saved!');
    this.exitEditMode();
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'popup-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  async captureAndGenerate() {
    try {
      console.log('Starting AI generation...');
      
      // Check for API key
      const result = await chrome.storage.local.get(['openaiApiKey']);
      const apiKey = result.openaiApiKey;

      if (!apiKey) {
        this.showError('No API key configured. Please add your OpenAI API key in the extension options.');
        return;
      }

      console.log('API key found, showing loading...');
      
      // Show loading
      this.showLoading(true);

      // Get active tab from normal browser windows (not popup)
      const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
      let targetTab = null;
      
      for (const window of windows) {
        const activeTab = window.tabs.find(tab => tab.active);
        if (activeTab && activeTab.url && this.isMatchingBaseUrl(activeTab.url)) {
          targetTab = activeTab;
          break;
        }
      }

      if (!targetTab) {
        // Fall back to any active tab if no matching base URL found
        for (const window of windows) {
          const activeTab = window.tabs.find(tab => tab.active);
          if (activeTab && activeTab.url && !activeTab.url.startsWith('chrome://')) {
            targetTab = activeTab;
            break;
          }
        }
      }

      if (!targetTab) {
        throw new Error('No active tab found. Please open a web page in a browser tab.');
      }

      console.log('Found target tab:', targetTab.id, targetTab.url);

      // Request screenshot capture from background script
      console.log('Requesting screenshot capture...');
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        tabId: targetTab.id
      });

      console.log('Screenshot response:', response);

      if (!response || !response.dataUrl) {
        throw new Error('Screenshot capture failed: ' + (response?.error || 'Unknown error'));
      }

      console.log('Screenshot captured successfully, generating talk track...');

      // Prepare customer context if a customer is selected
      const customerContext = this.selectedCustomer ? {
        name: this.selectedCustomer.name,
        industry: this.selectedCustomer.industry,
        discoveryNotes: this.selectedCustomer.discoveryNotes
      } : null;

      // Prepare documentation context
      const docContext = {
        referenceText: this.docContextText?.trim() || '',
        docUrls: this.docUrls?.trim() ? this.docUrls.trim().split('\n').filter(url => url.trim()) : []
      };

      // Generate talk track (pass customer context if available)
      const generated = await this.aiService.generateTalkTrack(
        response.dataUrl,
        this.selectedPersona,
        this.currentUrl || targetTab.url,
        apiKey,
        customerContext,
        docContext
      );

      console.log('Talk track generated successfully', customerContext ? `(for ${customerContext.name})` : '(generic)');

      this.generatedContent = generated;
      this.showLoading(false);
      this.render();

    } catch (error) {
      console.error('AI generation error:', error);
      this.showLoading(false);
      this.showError(this.aiService.getUserErrorMessage(error));
    }
  }

  async saveGeneratedTrack(action = 'new') {
    if (!this.generatedContent) return;

    if (action === 'new') {
      // Create new track
      const category = this.inferCategory(this.currentUrl);
      const urlPattern = this.createUrlPattern(this.currentUrl);

      const newTrack = {
        id: Date.now(),
        title: this.generatedContent.title,
        category: category,
        urlPattern: urlPattern,
        content: this.generatedContent.content,
        customerId: this.selectedCustomer?.id || null, // Tag with selected customer
        order: this.talkTracks.length
      };

      this.talkTracks.push(newTrack);
      await this.saveTracksWithSync('AI generated track');
      const customerNote = this.selectedCustomer ? ` (for ${this.selectedCustomer.name})` : '';
      alert(`New talk track saved successfully${customerNote}!`);
      
    } else if (action === 'append') {
      // Append to existing track
      const existingTrack = this.findMatchingTalkTrack();
      
      if (!existingTrack) {
        alert('No existing track found to append to. Saving as new track instead.');
        await this.saveGeneratedTrack('new');
        return;
      }

      // Append with a separator
      existingTrack.content = existingTrack.content + '\n\n---\n\n' + this.generatedContent.content;
      await this.saveTracksWithSync('AI content appended');
      alert('Content appended to existing talk track!');
      
    } else if (action === 'replace') {
      // Replace existing track content
      const existingTrack = this.findMatchingTalkTrack();
      
      if (!existingTrack) {
        alert('No existing track found to replace. Saving as new track instead.');
        await this.saveGeneratedTrack('new');
        return;
      }

      if (!confirm(`Replace the content of "${existingTrack.title || 'Untitled Track'}"?`)) {
        return;
      }

      existingTrack.content = this.generatedContent.content;
      existingTrack.title = this.generatedContent.title || existingTrack.title;
      await this.saveTracksWithSync('AI replaced track');
      alert('Existing talk track replaced!');
    }

    // Reset AI mode
    this.generatedContent = null;
    this.aiMode = false;
    await this.loadTalkTracks();
    this.render();
  }

  inferCategory(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('/dashboard')) return 'Dashboards';
    if (urlLower.includes('/apm')) return 'APM';
    if (urlLower.includes('/logs')) return 'Logs';
    if (urlLower.includes('/infrastructure')) return 'Infrastructure';
    if (urlLower.includes('/rum')) return 'RUM';
    if (urlLower.includes('/synthetics')) return 'Synthetics';
    if (urlLower.includes('/security')) return 'Security';
    if (urlLower.includes('/monitors')) return 'Monitors';
    return 'Other';
  }

  createUrlPattern(url) {
    try {
      const urlObj = new URL(url);
      let pattern = urlObj.pathname;
      
      // Replace specific IDs with wildcards
      pattern = pattern.replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/*');
      pattern = pattern.replace(/\/[a-z0-9]{20,}/gi, '/*');
      
      return '*' + pattern + '*';
    } catch {
      return '*' + url + '*';
    }
  }

  showLoading(show, message = null) {
    const loadingEl = document.getElementById('aiLoadingIndicator');
    const generateBtn = document.getElementById('captureGenerateBtn');
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingSubtext = document.getElementById('loadingSubtext');
    const captureProgress = document.getElementById('captureProgress');
    
    if (loadingEl) {
      loadingEl.style.display = show ? 'block' : 'none';
    }
    if (generateBtn) {
      generateBtn.disabled = show;
      const customerText = this.selectedCustomer ? ` for ${this.escapeHtml(this.selectedCustomer.name)}` : '';
      generateBtn.textContent = show ? 'Generating...' : `📸 Capture & Generate${customerText}`;
    }
    if (loadingMessage && message) {
      loadingMessage.textContent = message;
    }
    if (!show && captureProgress) {
      captureProgress.style.display = 'none';
    }
    if (!show && loadingMessage) {
      loadingMessage.textContent = 'Analyzing page and generating talk track...';
    }
    if (!show && loadingSubtext) {
      loadingSubtext.textContent = 'This may take 10-30 seconds';
    }
  }

  updateCaptureProgress(progress) {
    const captureProgress = document.getElementById('captureProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const loadingMessage = document.getElementById('loadingMessage');
    const loadingSubtext = document.getElementById('loadingSubtext');
    
    if (captureProgress) {
      captureProgress.style.display = 'block';
    }
    if (progressFill && progress.total > 0) {
      const percent = (progress.current / progress.total) * 100;
      progressFill.style.width = `${percent}%`;
    }
    if (progressText && progress.message) {
      progressText.textContent = progress.message;
    }
    if (loadingMessage) {
      loadingMessage.textContent = 'Capturing full page screenshot...';
    }
    if (loadingSubtext) {
      loadingSubtext.textContent = `Section ${progress.current} of ${progress.total}`;
    }
  }

  showError(message) {
    const root = document.getElementById('root');
    const errorHtml = `
      <div class="ai-error">
        <p style="color: #dc3545; font-weight: 600;">⚠️ Error</p>
        <p>${message}</p>
      </div>
    `;
    
    // Show error temporarily
    const preview = document.getElementById('aiPreview');
    if (preview) {
      preview.innerHTML = errorHtml;
      preview.style.display = 'block';
      setTimeout(() => {
        preview.style.display = 'none';
      }, 5000);
    }
  }

  onPersonaChange(e) {
    const personaId = e.target.value;
    this.selectedPersona = this.personas.find(p => p.id === personaId);
  }

  updateUrl(url) {
    this.currentUrl = url;
    this.render();
  }

  findMatchingTalkTrack() {
    // Smart track matching with customer priority and pattern specificity:
    // 1. Find all matching tracks
    // 2. Sort by pattern specificity (more specific patterns first)
    // 3. If customer selected: find customer-specific track first
    // 4. Fall back to generic track if no customer-specific match
    // 5. If no customer selected: use generic tracks only
    
    const matchingTracks = this.talkTracks.filter(track => 
      this.urlMatches(this.currentUrl, track.urlPattern)
    );
    
    console.log(`[URL Match] Current URL: ${this.currentUrl}`);
    console.log(`[URL Match] Found ${matchingTracks.length} matching tracks:`, 
      matchingTracks.map(t => ({ title: t.title, pattern: t.urlPattern, specificity: this.getPatternSpecificity(t.urlPattern) }))
    );
    
    if (matchingTracks.length === 0) return null;
    
    // Sort by pattern specificity (higher = more specific)
    matchingTracks.sort((a, b) => {
      const specA = this.getPatternSpecificity(a.urlPattern);
      const specB = this.getPatternSpecificity(b.urlPattern);
      return specB - specA; // Descending - most specific first
    });
    
    console.log(`[URL Match] After sorting by specificity:`, 
      matchingTracks.map(t => ({ title: t.title, pattern: t.urlPattern, specificity: this.getPatternSpecificity(t.urlPattern) }))
    );
    
    if (this.selectedCustomer) {
      // Look for customer-specific track first
      const customerTrack = matchingTracks.find(track => 
        track.customerId === this.selectedCustomer.id
      );
      if (customerTrack) {
        console.log(`[URL Match] Selected customer-specific track: ${customerTrack.title}`);
        return customerTrack;
      }
      
      // Fall back to generic track
      const genericTrack = matchingTracks.find(track => !track.customerId);
      console.log(`[URL Match] Selected generic track: ${genericTrack?.title || 'none'}`);
      return genericTrack || null;
    } else {
      // No customer selected - use generic tracks only
      const genericTrack = matchingTracks.find(track => !track.customerId);
      console.log(`[URL Match] Selected generic track: ${genericTrack?.title || 'none'}`);
      return genericTrack || null;
    }
  }

  /**
   * Calculate pattern specificity score
   * Higher score = more specific pattern
   * Factors: fewer wildcards, longer literal segments, exact path matches
   */
  getPatternSpecificity(pattern) {
    if (!pattern) return 0;
    
    let score = 0;
    
    // Longer patterns are generally more specific
    score += pattern.length;
    
    // Count wildcards (fewer = more specific)
    const wildcardCount = (pattern.match(/\*/g) || []).length;
    score -= wildcardCount * 20; // Heavy penalty for wildcards
    
    // Count path segments (more segments = more specific)
    const pathSegments = pattern.split('/').filter(s => s && s !== '*').length;
    score += pathSegments * 10;
    
    // Bonus for ending with specific path (not wildcard)
    if (!pattern.endsWith('*') && !pattern.endsWith('/')) {
      score += 15;
    }
    
    // Bonus for having literal text (not just wildcards)
    const literalLength = pattern.replace(/\*/g, '').length;
    score += literalLength * 2;
    
    return score;
  }

  urlMatches(url, pattern) {
    // Simple pattern matching - can be enhanced
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(url);
    }
    return url.includes(pattern);
  }

  getDisplayUrl() {
    try {
      const urlObj = new URL(this.currentUrl);
      return urlObj.pathname + urlObj.search;
    } catch {
      return this.currentUrl;
    }
  }

  openOptions() {
    chrome.runtime.openOptionsPage();
  }

  render() {
    const root = document.getElementById('root');
    
    if (this.editMode) {
      this.renderEditMode(root);
    } else if (this.aiMode) {
      this.renderAiMode(root);
    } else {
      this.renderNormalMode(root);
    }
  }

  renderNormalMode(root) {
    const matchingTrack = this.findMatchingTalkTrack();
    
    root.innerHTML = `
      <div class="container">
        <div class="header">
          <div class="header-top">
            <h1>Demo Buddy</h1>
            <div class="header-buttons">
              <div id="syncIndicator" class="sync-indicator" title="Cloud sync status"></div>
              <button id="aiModeToggle" class="ai-toggle-btn" title="AI Generation Mode">
                🤖
              </button>
              <button id="createTrackBtn" class="create-track-btn" title="Create talk track for this page">
                ✏️
              </button>
            </div>
          </div>
          ${this.customers.length > 0 ? `
            <div class="customer-selector">
              <select id="customerSelect" class="customer-dropdown" title="Select customer for tailored talk tracks">
                <option value="">Generic Demo</option>
                ${this.customers.map(c => `
                  <option value="${c.id}" ${this.selectedCustomer?.id === c.id ? 'selected' : ''}>
                    👤 ${this.escapeHtml(c.name)}
                  </option>
                `).join('')}
              </select>
              ${this.selectedCustomer ? `
                <span class="customer-indicator" style="background-color: ${this.selectedCustomer.color}" title="${this.escapeHtml(this.selectedCustomer.name)}"></span>
              ` : ''}
            </div>
          ` : ''}
          <div class="current-url" title="${this.escapeHtml(this.getDisplayUrl() || '')}">${this.getDisplayUrl() || 'No page loaded'}</div>
        </div>
        <div class="content">
          ${matchingTrack ? `
            <div class="track-header-bar">
              <span class="track-title">${this.escapeHtml(matchingTrack.title || 'Untitled')}</span>
              <button id="editTrackBtn" class="edit-track-btn" title="Edit this talk track">
                ✏️ Edit
              </button>
            </div>
            <div class="talk-track">${this.renderMarkdown(matchingTrack.content)}</div>
          ` : `
            <div class="no-match">
              <p>No talk track for this page.</p>
              <div class="no-match-actions">
                <button class="create-btn" id="createNewBtn">
                  ✏️ Create Talk Track
                </button>
                <button class="ai-create-btn" id="aiCreateBtn">
                  🤖 Generate with AI
                </button>
              </div>
              <button class="quick-edit-button" id="openOptions">Open Full Editor</button>
            </div>
          `}
        </div>
      </div>
    `;

    // Add event listeners
    const optionsBtn = document.getElementById('openOptions');
    if (optionsBtn) {
      optionsBtn.addEventListener('click', () => this.openOptions());
    }

    const aiToggleBtn = document.getElementById('aiModeToggle');
    if (aiToggleBtn) {
      aiToggleBtn.addEventListener('click', () => this.toggleAiMode());
    }

    const customerSelect = document.getElementById('customerSelect');
    if (customerSelect) {
      customerSelect.addEventListener('change', (e) => this.setSelectedCustomer(e.target.value));
    }

    const createTrackBtn = document.getElementById('createTrackBtn');
    if (createTrackBtn) {
      createTrackBtn.addEventListener('click', () => this.enterEditMode());
    }

    const createNewBtn = document.getElementById('createNewBtn');
    if (createNewBtn) {
      createNewBtn.addEventListener('click', () => this.enterEditMode());
    }

    const aiCreateBtn = document.getElementById('aiCreateBtn');
    if (aiCreateBtn) {
      aiCreateBtn.addEventListener('click', () => this.toggleAiMode());
    }

    const editTrackBtn = document.getElementById('editTrackBtn');
    if (editTrackBtn && matchingTrack) {
      editTrackBtn.addEventListener('click', () => this.enterEditMode(matchingTrack));
    }

    // Render sync indicator
    this.renderSyncIndicator();
  }

  renderEditMode(root) {
    const isNew = !this.editingTrack?.id;
    const validation = this.validateUrlPattern(this.editingTrack?.urlPattern);
    
    root.innerHTML = `
      <div class="container">
        <div class="header">
          <div class="header-top">
            <h1>${isNew ? '✏️ Create Talk Track' : '✏️ Edit Talk Track'}</h1>
            <button id="cancelEditBtn" class="back-btn" title="Cancel and go back">
              ✕
            </button>
          </div>
          <div class="current-url" title="${this.escapeHtml(this.getDisplayUrl() || '')}">${this.getDisplayUrl() || 'No page loaded'}</div>
        </div>
        
        <div class="edit-form">
          <div class="form-group">
            <label for="editTitle">Title</label>
            <input 
              type="text" 
              id="editTitle" 
              value="${this.escapeHtml(this.editingTrack?.title || '')}"
              placeholder="e.g., Dashboard Overview Demo"
            />
          </div>
          
          <div class="form-group">
            <label for="editCategory">Category</label>
            <select id="editCategory">
              ${this.categories.map(cat => `
                <option value="${cat}" ${this.editingTrack?.category === cat ? 'selected' : ''}>
                  ${cat}
                </option>
              `).join('')}
            </select>
          </div>
          
          ${this.customers.length > 0 ? `
            <div class="form-group">
              <label for="editCustomer">Customer <span class="label-hint">(optional)</span></label>
              <select id="editCustomer" class="customer-edit-select">
                <option value="">Generic (all customers)</option>
                ${this.customers.map(c => `
                  <option value="${c.id}" ${this.editingTrack?.customerId === c.id ? 'selected' : ''}>
                    👤 ${this.escapeHtml(c.name)}${c.industry ? ` (${this.escapeHtml(c.industry)})` : ''}
                  </option>
                `).join('')}
              </select>
            </div>
          ` : ''}
          
          <div class="form-group">
            <label for="editUrlPattern">URL Pattern</label>
            <input 
              type="text" 
              id="editUrlPattern" 
              value="${this.escapeHtml(this.editingTrack?.urlPattern || '')}"
              placeholder="e.g., */dashboards/* or */apm/services"
            />
            <div id="urlPatternValidation" class="url-validation">
              <span class="${validation.matches ? 'validation-success' : 'validation-error'}">
                ${validation.message}
              </span>
            </div>
            <div class="url-pattern-suggestions">
              <button type="button" class="suggestion-btn" data-pattern="${this.createUrlPattern(this.currentUrl)}">
                📍 Auto-detect from current page
              </button>
              <button type="button" class="suggestion-btn" data-pattern="*${this.getDisplayUrl()}*">
                🔗 Exact path match
              </button>
            </div>
          </div>
          
          <div class="form-group content-form-group">
            <label for="editContent">Talk Track Content</label>
            <div id="quillEditorPopup" class="quill-editor-popup"></div>
          </div>
          
          <div class="edit-actions">
            <button id="saveTrackBtn" class="save-btn">
              💾 ${isNew ? 'Create Track' : 'Save Changes'}
            </button>
            <button id="cancelBtn" class="cancel-btn">
              Cancel
            </button>
            <button id="debugHtmlBtn" class="debug-btn" title="Show raw HTML for debugging">
              🔍 Debug
            </button>
            ${!isNew ? `
              <button id="deleteTrackBtn" class="delete-btn" title="Delete this talk track">
                🗑️
              </button>
            ` : ''}
          </div>
          
        </div>
      </div>
    `;

    // Add event listeners
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => this.exitEditMode());
    }

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.exitEditMode());
    }

    const saveTrackBtn = document.getElementById('saveTrackBtn');
    if (saveTrackBtn) {
      saveTrackBtn.addEventListener('click', () => this.saveEditingTrack());
    }

    const deleteTrackBtn = document.getElementById('deleteTrackBtn');
    if (deleteTrackBtn) {
      deleteTrackBtn.addEventListener('click', () => this.deleteEditingTrack());
    }

    // Debug button
    const debugHtmlBtn = document.getElementById('debugHtmlBtn');
    if (debugHtmlBtn) {
      debugHtmlBtn.addEventListener('click', () => this.showDebugHtml());
    }

    // Form input handlers
    const titleInput = document.getElementById('editTitle');
    if (titleInput) {
      titleInput.addEventListener('input', (e) => this.updateEditingTrack('title', e.target.value));
    }

    const categorySelect = document.getElementById('editCategory');
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => this.updateEditingTrack('category', e.target.value));
    }

    const customerSelect = document.getElementById('editCustomer');
    if (customerSelect) {
      customerSelect.addEventListener('change', (e) => this.updateEditingTrack('customerId', e.target.value || null));
    }

    const urlPatternInput = document.getElementById('editUrlPattern');
    if (urlPatternInput) {
      urlPatternInput.addEventListener('input', (e) => this.updateEditingTrack('urlPattern', e.target.value));
    }

    // Initialize Quill editor
    this.initQuillEditor();

    // URL pattern suggestion buttons
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');
    suggestionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pattern = e.target.dataset.pattern;
        urlPatternInput.value = pattern;
        this.updateEditingTrack('urlPattern', pattern);
      });
    });
  }

  async deleteEditingTrack() {
    if (!this.editingTrack?.id) return;
    
    if (!confirm('Are you sure you want to delete this talk track?')) {
      return;
    }
    
    this.talkTracks = this.talkTracks.filter(t => t.id !== this.editingTrack.id);
    await this.saveTracksWithSync('Deleted track');
    
    this.showNotification('Talk track deleted');
    this.exitEditMode();
  }

  showDebugHtml() {
    if (!this.quillEditor) {
      alert('No Quill editor found');
      return;
    }
    
    const html = this.quillEditor.root.innerHTML;
    const markdown = ContentConverter.htmlToMarkdown(html);
    
    // Create a modal to show the debug info
    const debugInfo = `
=== RAW QUILL HTML ===
${html}

=== CONVERTED MARKDOWN ===
${markdown}

=== CHECK FOR QUILL CLASSES ===
Has ql-indent: ${html.includes('ql-indent')}
Has data-list: ${html.includes('data-list')}
    `.trim();
    
    // Copy to clipboard and show alert
    navigator.clipboard.writeText(debugInfo).then(() => {
      alert('Debug info copied to clipboard!\n\nPlease paste it in the chat so we can diagnose the issue.');
    }).catch(() => {
      // Fallback: show in console and prompt
      console.log(debugInfo);
      prompt('Copy this debug info:', html);
    });
  }

  /**
   * Insert a navigation link at the current cursor position in the Quill editor
   */
  insertNavigationLink() {
    if (!this.quillEditor) {
      alert('Editor not initialized');
      return;
    }

    // Prompt for link text
    const linkText = prompt('Enter the link text (e.g., "Go to Dashboard"):');
    if (!linkText) return;

    // Prompt for URL path
    const urlPath = prompt('Enter the URL path (e.g., "/dashboard/abc-123" or "https://..."):');
    if (!urlPath) return;

    // Build the full URL
    const fullUrl = this.buildFullUrl(urlPath);

    // Get current selection or cursor position
    const range = this.quillEditor.getSelection(true);
    
    if (range) {
      // Insert the link at cursor position
      this.quillEditor.insertText(range.index, linkText, 'link', fullUrl);
      // Move cursor after the inserted text
      this.quillEditor.setSelection(range.index + linkText.length);
    } else {
      // If no selection, append to end
      const length = this.quillEditor.getLength();
      this.quillEditor.insertText(length - 1, linkText, 'link', fullUrl);
    }
  }

  applyFormatting(textarea, format) {
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    let formattedText = '';
    let cursorOffset = 0;
    
    switch(format) {
      case 'bold':
        formattedText = selectedText ? `**${selectedText}**` : '**bold text**';
        cursorOffset = selectedText ? selectedText.length + 4 : 2;
        break;
      case 'italic':
        formattedText = selectedText ? `*${selectedText}*` : '*italic text*';
        cursorOffset = selectedText ? selectedText.length + 2 : 1;
        break;
      case 'list':
        if (selectedText) {
          formattedText = selectedText.split('\n').map(line => line.trim() ? `- ${line}` : '').join('\n');
          cursorOffset = formattedText.length;
        } else {
          formattedText = '- ';
          cursorOffset = 2;
        }
        break;
      case 'heading':
        formattedText = selectedText ? `## ${selectedText}` : '## ';
        cursorOffset = selectedText ? selectedText.length + 3 : 3;
        break;
    }
    
    textarea.value = beforeText + formattedText + afterText;
    const newPos = start + cursorOffset;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    
    // Update preview
    const preview = document.getElementById('contentPreview');
    if (preview) {
      preview.innerHTML = this.renderMarkdown(textarea.value);
    }
    
    // Update editing track
    this.updateEditingTrack('content', textarea.value);
  }

  renderAiMode(root) {
    root.innerHTML = `
      <div class="container">
        <div class="header">
          <div class="header-top">
            <h1>AI Talk Track Generation</h1>
            <button id="normalModeToggle" class="normal-mode-btn" title="Back to Normal Mode">
              ← Back
            </button>
          </div>
          ${this.customers.length > 0 ? `
            <div class="customer-selector">
              <select id="customerSelectAi" class="customer-dropdown" title="Generate for specific customer">
                <option value="">Generic Demo</option>
                ${this.customers.map(c => `
                  <option value="${c.id}" ${this.selectedCustomer?.id === c.id ? 'selected' : ''}>
                    👤 ${this.escapeHtml(c.name)}
                  </option>
                `).join('')}
              </select>
              ${this.selectedCustomer ? `
                <span class="customer-indicator" style="background-color: ${this.selectedCustomer.color}"></span>
              ` : ''}
            </div>
          ` : ''}
          <div class="current-url" title="${this.escapeHtml(this.getDisplayUrl() || '')}">${this.getDisplayUrl() || 'No page loaded'}</div>
        </div>
        <div class="content ai-generation-panel">
          ${this.selectedCustomer ? `
            <div class="customer-context-notice">
              <strong>🎯 Generating for: ${this.escapeHtml(this.selectedCustomer.name)}</strong>
              ${this.selectedCustomer.industry ? `<span class="industry-tag">${this.escapeHtml(this.selectedCustomer.industry)}</span>` : ''}
              ${this.selectedCustomer.discoveryNotes ? `
                <p class="discovery-preview">${this.escapeHtml(this.selectedCustomer.discoveryNotes.substring(0, 150))}${this.selectedCustomer.discoveryNotes.length > 150 ? '...' : ''}</p>
              ` : '<p class="no-notes">No discovery notes added yet</p>'}
            </div>
          ` : ''}
          
          <div class="form-group">
            <label for="personaSelect">Select Persona</label>
            <select id="personaSelect" class="persona-select">
              ${this.personas.map(p => `
                <option value="${p.id}" ${p.id === this.selectedPersona?.id ? 'selected' : ''}>
                  ${p.name}
                </option>
              `).join('')}
            </select>
            <p class="persona-description">${this.selectedPersona?.description || ''}</p>
          </div>

          <div class="doc-context-section">
            <div class="form-group">
              <label for="docContextText">
                📄 Reference Documentation
                <span class="label-hint">(optional)</span>
              </label>
              <p class="field-description">Paste relevant documentation text to inform terminology and language</p>
              <textarea 
                id="docContextText" 
                class="doc-context-textarea" 
                placeholder="Paste documentation content here to help AI use accurate terminology..."
                rows="4"
              >${this.escapeHtml(this.docContextText || '')}</textarea>
            </div>
            
            <div class="form-group">
              <label for="docUrls">
                🔗 Documentation Links
                <span class="label-hint">(optional)</span>
              </label>
              <p class="field-description">URLs to include as "Learn More" references (one per line)</p>
              <textarea 
                id="docUrls" 
                class="doc-urls-textarea" 
                placeholder="https://docs.datadoghq.com/dashboards/&#10;https://docs.datadoghq.com/metrics/"
                rows="3"
              >${this.escapeHtml(this.docUrls || '')}</textarea>
            </div>
          </div>

          <button id="captureGenerateBtn" class="ai-generate-btn">
            📸 Capture & Generate${this.selectedCustomer ? ` for ${this.escapeHtml(this.selectedCustomer.name)}` : ''}
          </button>

          <div id="aiLoadingIndicator" class="ai-loading" style="display:none">
            <div class="spinner"></div>
            <p id="loadingMessage">Analyzing page and generating talk track...</p>
            <p id="loadingSubtext" class="loading-subtext">This may take 10-30 seconds</p>
            <div id="captureProgress" class="capture-progress" style="display:none">
              <div class="progress-bar">
                <div id="progressFill" class="progress-fill"></div>
              </div>
              <p id="progressText" class="progress-text"></p>
            </div>
          </div>

          ${this.generatedContent ? this.renderSaveOptions() : ''}
        </div>
      </div>
    `;

    // Add event listeners
    const normalToggleBtn = document.getElementById('normalModeToggle');
    if (normalToggleBtn) {
      normalToggleBtn.addEventListener('click', () => {
        this.generatedContent = null;
        this.toggleAiMode();
      });
    }

    const personaSelect = document.getElementById('personaSelect');
    if (personaSelect) {
      personaSelect.addEventListener('change', (e) => this.onPersonaChange(e));
    }

    const customerSelectAi = document.getElementById('customerSelectAi');
    if (customerSelectAi) {
      customerSelectAi.addEventListener('change', (e) => this.setSelectedCustomer(e.target.value));
    }

    // Documentation context fields
    const docContextText = document.getElementById('docContextText');
    if (docContextText) {
      docContextText.addEventListener('input', (e) => {
        this.docContextText = e.target.value;
      });
    }

    const docUrls = document.getElementById('docUrls');
    if (docUrls) {
      docUrls.addEventListener('input', (e) => {
        this.docUrls = e.target.value;
      });
    }

    const generateBtn = document.getElementById('captureGenerateBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.captureAndGenerate());
    }

    const saveNewBtn = document.getElementById('saveAiTrackNew');
    if (saveNewBtn) {
      saveNewBtn.addEventListener('click', () => this.saveGeneratedTrack('new'));
    }

    const appendBtn = document.getElementById('saveAiTrackAppend');
    if (appendBtn) {
      appendBtn.addEventListener('click', () => this.saveGeneratedTrack('append'));
    }

    const replaceBtn = document.getElementById('saveAiTrackReplace');
    if (replaceBtn) {
      replaceBtn.addEventListener('click', () => this.saveGeneratedTrack('replace'));
    }

    const regenerateBtn = document.getElementById('regenerateBtn');
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', () => {
        this.generatedContent = null;
        this.render();
      });
    }
  }

  renderSaveOptions() {
    const existingTrack = this.findMatchingTalkTrack();
    
    return `
      <div id="aiPreview" class="ai-preview">
        <h3>Generated Talk Track</h3>
        
        ${existingTrack ? `
          <div class="existing-track-notice">
            <strong>📌 Existing track found:</strong> "${this.escapeHtml(existingTrack.title || 'Untitled Track')}"
            <br>
            <small>You can save as new, append to existing, or replace existing content.</small>
          </div>
        ` : ''}
        
        <div class="preview-content">
          ${this.renderMarkdown(this.generatedContent.content)}
        </div>
        
        <div class="ai-actions">
          ${existingTrack ? `
            <button id="saveAiTrackAppend" class="save-btn append-btn" title="Add this content to the existing track">
              ➕ Append to Existing
            </button>
            <button id="saveAiTrackReplace" class="save-btn replace-btn" title="Replace the existing track's content">
              🔄 Replace Existing
            </button>
            <button id="saveAiTrackNew" class="secondary-btn" title="Create a new separate track">
              💾 Save as New
            </button>
          ` : `
            <button id="saveAiTrackNew" class="save-btn" title="Save as a new talk track">
              💾 Save as New Track
            </button>
          `}
          <button id="regenerateBtn" class="secondary-btn">🔄 Regenerate</button>
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderMarkdown(text) {
    // Configure marked options for better formatting
    marked.setOptions({
      breaks: true,  // Enable line breaks
      gfm: true,     // GitHub Flavored Markdown
    });
    
    // Pre-process: Convert custom color markers to HTML spans before markdown parsing
    let processedText = text
      .replace(/\[\[VALUE\]\](.*?)\[\[\/VALUE\]\]/gs, '<span class="value-highlight">$1</span>')
      .replace(/\[\[OUTCOME\]\](.*?)\[\[\/OUTCOME\]\]/gs, '<span class="outcome-highlight">$1</span>');
    
    // Parse markdown to HTML
    const rawHtml = marked.parse(processedText);
    
    // Sanitize HTML to prevent XSS attacks
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'strike', 'del', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'hr', 'button', 'span'],
      ALLOWED_ATTR: ['href', 'title', 'target', 'class', 'data-nav-url']
    });
    
    // Convert links to navigation buttons
    return this.convertLinksToNavButtons(cleanHtml);
  }

  /**
   * Convert <a> tags to navigation buttons that control the active browser tab
   * Links starting with / or containing the base URL become nav buttons
   * External links remain as regular links
   */
  convertLinksToNavButtons(html) {
    // Create a temporary container to parse and modify the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Find all anchor tags
    const links = temp.querySelectorAll('a[href]');
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent;
      
      // Check if this is a navigation link (relative path or same-site URL)
      if (this.isNavigationLink(href)) {
        // Build the full URL
        const fullUrl = this.buildFullUrl(href);
        
        // Create a button element
        const button = document.createElement('button');
        button.className = 'nav-button';
        button.setAttribute('data-nav-url', fullUrl);
        button.textContent = text;
        button.title = `Navigate to: ${fullUrl}`;
        
        // Replace the link with the button
        link.parentNode.replaceChild(button, link);
      }
    });
    
    return temp.innerHTML;
  }

  /**
   * Check if a link should be converted to a navigation button
   */
  isNavigationLink(href) {
    if (!href) return false;
    
    // Relative paths starting with /
    if (href.startsWith('/')) return true;
    
    // URLs matching the base URL domain
    try {
      const linkUrl = new URL(href, this.baseUrl);
      const baseObj = new URL(this.baseUrl);
      return linkUrl.hostname === baseObj.hostname || 
             linkUrl.hostname.endsWith('datadoghq.com') ||
             linkUrl.hostname.endsWith('ddog-gov.com');
    } catch {
      return false;
    }
  }

  /**
   * Build a full URL from a relative or absolute path
   */
  buildFullUrl(href) {
    if (!href) return '';
    
    // If it's already a full URL, return it
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    
    // If it's a relative path, prepend the base URL
    try {
      const url = new URL(href, this.baseUrl);
      return url.href;
    } catch {
      // Fallback: simple concatenation
      const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
      const path = href.startsWith('/') ? href : '/' + href;
      return base + path;
    }
  }
}

// Initialize app
new TalkTrackApp();

