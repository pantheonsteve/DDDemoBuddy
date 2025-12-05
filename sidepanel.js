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
    this.baseUrl = 'https://app.datadoghq.com'; // Default base URL
    this.quillEditor = null; // Quill editor instance
    this.aiService = new AIService();
    this.screenshotService = new ScreenshotService();
    this.init();
  }

  async init() {
    this.render();
    await this.loadSettings();
    await this.loadTalkTracks();
    await this.loadCategories();
    await this.loadPersonas();
    await this.getCurrentTabUrl();
    this.setupListeners();
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
    const result = await chrome.storage.local.get(['talkTracks']);
    this.talkTracks = result.talkTracks || [];
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
        this.talkTracks = changes.talkTracks.newValue || [];
        if (!this.aiMode) {
          this.render();
        }
      }
      if (changes.customPersonas) {
        this.loadPersonas();
      }
    });
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
        content: ''
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
        toolbar: [
          [{ 'header': [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['blockquote'],
          ['clean']
        ]
      }
    });

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
    
    // Get title and category from form
    const titleInput = document.getElementById('editTitle');
    const categorySelect = document.getElementById('editCategory');
    if (titleInput) this.editingTrack.title = titleInput.value.trim();
    if (categorySelect) this.editingTrack.category = categorySelect.value;
    
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
    
    await chrome.storage.local.set({ talkTracks: this.talkTracks });
    
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

      // Generate talk track
      const generated = await this.aiService.generateTalkTrack(
        response.dataUrl,
        this.selectedPersona,
        this.currentUrl || targetTab.url,
        apiKey
      );

      console.log('Talk track generated successfully');

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
        order: this.talkTracks.length
      };

      this.talkTracks.push(newTrack);
      await chrome.storage.local.set({ talkTracks: this.talkTracks });
      alert('New talk track saved successfully!');
      
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
      await chrome.storage.local.set({ talkTracks: this.talkTracks });
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
      await chrome.storage.local.set({ talkTracks: this.talkTracks });
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

  showLoading(show) {
    const root = document.getElementById('root');
    const loadingEl = document.getElementById('aiLoadingIndicator');
    const generateBtn = document.getElementById('captureGenerateBtn');
    
    if (loadingEl) {
      loadingEl.style.display = show ? 'block' : 'none';
    }
    if (generateBtn) {
      generateBtn.disabled = show;
      generateBtn.textContent = show ? 'Generating...' : '📸 Capture & Generate';
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
    for (const track of this.talkTracks) {
      if (this.urlMatches(this.currentUrl, track.urlPattern)) {
        return track;
      }
    }
    return null;
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
              <button id="aiModeToggle" class="ai-toggle-btn" title="AI Generation Mode">
                🤖
              </button>
              <button id="createTrackBtn" class="create-track-btn" title="Create talk track for this page">
                ✏️
              </button>
            </div>
          </div>
          <div class="current-url">${this.getDisplayUrl() || 'No page loaded'}</div>
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
          <div class="current-url">${this.getDisplayUrl() || 'No page loaded'}</div>
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
    await chrome.storage.local.set({ talkTracks: this.talkTracks });
    
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
          <div class="current-url">${this.getDisplayUrl() || 'No page loaded'}</div>
        </div>
        <div class="content ai-generation-panel">
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

          <button id="captureGenerateBtn" class="ai-generate-btn">
            📸 Capture & Generate
          </button>

          <div id="aiLoadingIndicator" class="ai-loading" style="display:none">
            <div class="spinner"></div>
            <p>Analyzing page and generating talk track...</p>
            <p class="loading-subtext">This may take 10-30 seconds</p>
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
    
    // Parse markdown to HTML
    const rawHtml = marked.parse(text);
    
    // Sanitize HTML to prevent XSS attacks
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'strike', 'del', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'hr'],
      ALLOWED_ATTR: ['href', 'title', 'target']
    });
    
    return cleanHtml;
  }
}

// Initialize app
new TalkTrackApp();

