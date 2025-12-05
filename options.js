// Options page logic
class OptionsManager {
  constructor() {
    this.tracks = [];
    this.selectedTracks = new Set();
    this.searchTerm = '';
    this.filterCategory = 'all';
    this.filterTag = 'all';
    this.allTags = []; // All unique tags across tracks
    this.expandedTracks = new Set();
    this.maxBackups = 50; // Keep last 50 versions
    this.backupHistory = [];
    this.quillEditors = new Map(); // Store Quill instances by track ID
    this.defaultCategories = [
      'Dashboards',
      'APM',
      'Logs',
      'Infrastructure',
      'RUM',
      'Synthetics',
      'Security',
      'Monitors',
      'Other'
    ];
    this.customCategories = [];
    this.categories = [];
    this.defaultPersonas = [
      {
        id: 'sales-engineer',
        name: 'Sales Engineer',
        description: 'Focus on features, benefits, ROI, competitive advantages, and customer success stories',
        isDefault: true
      },
      {
        id: 'solutions-architect',
        name: 'Solutions Architect',
        description: 'Emphasize technical architecture, integrations, scalability, and implementation best practices',
        isDefault: true
      },
      {
        id: 'executive-briefing',
        name: 'Executive Briefing',
        description: 'High-level business value, strategic benefits, time-to-value, and key metrics',
        isDefault: true
      },
      {
        id: 'technical-deep-dive',
        name: 'Technical Deep Dive',
        description: 'In-depth technical details, APIs, data models, query languages, and advanced features',
        isDefault: true
      },
      {
        id: 'customer-success',
        name: 'Customer Success',
        description: 'Onboarding guidance, best practices, tips and tricks, common pitfalls, and support resources',
        isDefault: true
      }
    ];
    this.customPersonas = [];
    this.apiKey = '';
    this.aiService = new AIService();
    this.init();
  }

  async init() {
    await this.loadTracks();
    await this.loadBackupHistory();
    await this.loadBaseUrl();
    await this.loadApiKey();
    await this.loadPersonas();
    await this.loadCustomCategories();
    this.updateCategories();
    this.renderCategoryFilter();
    this.render();
    this.renderPersonas();
    this.renderCategories();
    this.renderBackupInfo();
    this.setupEventListeners();
  }

  async loadBackupHistory() {
    try {
      const result = await chrome.storage.local.get(['talkTrackBackups']);
      this.backupHistory = result.talkTrackBackups || [];
    } catch (error) {
      console.error('Error loading backup history:', error);
      this.backupHistory = [];
    }
  }

  async createBackup(reason = 'Manual save') {
    try {
      const backup = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        reason: reason,
        trackCount: this.tracks.length,
        data: JSON.parse(JSON.stringify(this.tracks)) // Deep clone
      };

      this.backupHistory.unshift(backup);

      // Keep only the last N backups
      if (this.backupHistory.length > this.maxBackups) {
        this.backupHistory = this.backupHistory.slice(0, this.maxBackups);
      }

      await chrome.storage.local.set({ talkTrackBackups: this.backupHistory });
      console.log(`Backup created: ${reason} (${this.tracks.length} tracks)`);
      
      return backup;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupId) {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      this.showStatus('Backup not found!', true);
      return;
    }

    // Create a backup of current state before restoring
    await this.createBackup('Pre-restore backup');

    // Restore the backup
    this.tracks = JSON.parse(JSON.stringify(backup.data));
    await chrome.storage.local.set({ talkTracks: this.tracks });
    
    this.showStatus(`Restored backup from ${new Date(backup.timestamp).toLocaleString()} (${backup.trackCount} tracks)`, false);
    this.render();
    this.renderBackupInfo();
  }

  renderBackupInfo() {
    const backupContainer = document.getElementById('backupInfo');
    if (!backupContainer) return;

    const latestBackup = this.backupHistory[0];
    const backupCount = this.backupHistory.length;

    backupContainer.innerHTML = `
      <div class="backup-status">
        <span class="backup-icon">💾</span>
        <span class="backup-text">
          ${backupCount} backups saved
          ${latestBackup ? `<br><small>Last: ${new Date(latestBackup.timestamp).toLocaleString()}</small>` : ''}
        </span>
        <button type="button" class="backup-btn" id="showBackupsBtn">
          📂 Restore
        </button>
      </div>
    `;
  }

  showBackupModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('backupModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'backupModal';
      modal.className = 'backup-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="backup-modal-content">
        <div class="backup-modal-header">
          <h2>📂 Backup History</h2>
          <button type="button" class="close-modal-btn" id="closeBackupModal">✕</button>
        </div>
        <div class="backup-list">
          ${this.backupHistory.length === 0 ? 
            '<p class="no-backups">No backups yet. Backups are created automatically when you save.</p>' :
            this.backupHistory.map(backup => `
              <div class="backup-item" data-backup-id="${backup.id}">
                <div class="backup-item-info">
                  <strong>${new Date(backup.timestamp).toLocaleString()}</strong>
                  <span class="backup-reason">${backup.reason}</span>
                  <span class="backup-tracks">${backup.trackCount} tracks</span>
                </div>
                <div class="backup-item-actions">
                  <button type="button" class="restore-backup-btn" data-backup-id="${backup.id}">
                    ↩️ Restore
                  </button>
                  <button type="button" class="export-backup-btn" data-backup-id="${backup.id}">
                    📤 Export
                  </button>
                </div>
              </div>
            `).join('')
          }
        </div>
        <div class="backup-modal-footer">
          <button type="button" class="create-backup-btn" id="createManualBackup">
            💾 Create Backup Now
          </button>
          <button type="button" class="export-all-btn" id="exportCurrentTracks">
            📤 Export Current Tracks
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    // Add event listeners
    document.getElementById('closeBackupModal').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.querySelectorAll('.restore-backup-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const backupId = parseInt(e.target.dataset.backupId);
        if (confirm('Are you sure you want to restore this backup? Your current tracks will be backed up first.')) {
          await this.restoreBackup(backupId);
          modal.style.display = 'none';
        }
      });
    });

    modal.querySelectorAll('.export-backup-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const backupId = parseInt(e.target.dataset.backupId);
        this.exportBackup(backupId);
      });
    });

    document.getElementById('createManualBackup').addEventListener('click', async () => {
      await this.createBackup('Manual backup');
      this.showBackupModal(); // Refresh the modal
      this.renderBackupInfo();
    });

    document.getElementById('exportCurrentTracks').addEventListener('click', () => {
      this.exportTracks();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  exportBackup(backupId) {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) return;

    const dataStr = JSON.stringify(backup.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date(backup.timestamp).toISOString().split('T')[0];
    link.download = `talk-tracks-backup-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  renderCategoryFilter() {
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
      const allCategories = ['All', ...this.defaultCategories, ...this.customCategories];
      
      filterSelect.innerHTML = allCategories.map(cat => 
        `<option value="${cat}">${cat}</option>`
      ).join('');
    }

    // Update tag filter
    this.updateTagFilter();

    // Also update bulk category dropdown
    const bulkSelect = document.getElementById('bulkCategorySelect');
    if (bulkSelect) {
      const categoriesForBulk = [...this.defaultCategories, ...this.customCategories];
      
      bulkSelect.innerHTML = '<option value="">Change Category...</option>' +
        categoriesForBulk.map(cat => 
          `<option value="${cat}">${cat}</option>`
        ).join('');
    }
  }

  updateTagFilter() {
    // Collect all unique tags from tracks
    const tagSet = new Set();
    this.tracks.forEach(track => {
      if (track.tags && Array.isArray(track.tags)) {
        track.tags.forEach(tag => tagSet.add(tag.trim().toLowerCase()));
      }
    });
    this.allTags = Array.from(tagSet).sort();

    // Populate tag filter dropdown
    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter) {
      const currentValue = tagFilter.value;
      tagFilter.innerHTML = '<option value="all">All Tags</option>' +
        this.allTags.map(tag => 
          `<option value="${tag}" ${currentValue === tag ? 'selected' : ''}>${tag}</option>`
        ).join('');
    }
  }

  async loadCustomCategories() {
    const result = await chrome.storage.local.get(['customCategories']);
    this.customCategories = result.customCategories || [];
  }

  async saveCustomCategories() {
    await chrome.storage.local.set({ customCategories: this.customCategories });
  }

  updateCategories() {
    this.categories = ['All', ...this.defaultCategories, ...this.customCategories];
  }

  addCustomCategory() {
    const name = prompt('Enter new category name:');
    if (!name) return;

    const trimmedName = name.trim();
    
    // Check if category already exists
    if (this.defaultCategories.includes(trimmedName) || this.customCategories.includes(trimmedName)) {
      alert('A category with this name already exists!');
      return;
    }

    if (trimmedName.length === 0) {
      alert('Category name cannot be empty!');
      return;
    }

    this.customCategories.push(trimmedName);
    this.customCategories.sort(); // Keep alphabetically sorted
    this.updateCategories();
    this.saveCustomCategories();
    this.renderCategoryFilter();
    this.renderCategories();
    this.render(); // Re-render to update dropdowns
  }

  editCustomCategory(oldName) {
    const newName = prompt('Edit category name:', oldName);
    if (!newName || newName === oldName) return;

    const trimmedName = newName.trim();
    
    // Check if new name already exists
    if (this.defaultCategories.includes(trimmedName) || 
        (this.customCategories.includes(trimmedName) && trimmedName !== oldName)) {
      alert('A category with this name already exists!');
      return;
    }

    // Update the category name
    const index = this.customCategories.indexOf(oldName);
    if (index !== -1) {
      this.customCategories[index] = trimmedName;
      this.customCategories.sort(); // Keep alphabetically sorted
    }

    // Update all tracks using this category
    this.tracks.forEach(track => {
      if (track.category === oldName) {
        track.category = trimmedName;
      }
    });

    this.updateCategories();
    this.saveCustomCategories();
    this.renderCategoryFilter();
    this.renderCategories();
    this.render();
  }

  deleteCustomCategory(name) {
    if (!confirm(`Delete category "${name}"?\n\nTracks using this category will be moved to "Other".`)) {
      return;
    }

    // Move tracks to "Other"
    this.tracks.forEach(track => {
      if (track.category === name) {
        track.category = 'Other';
      }
    });

    // Remove from custom categories
    this.customCategories = this.customCategories.filter(cat => cat !== name);
    
    this.updateCategories();
    this.saveCustomCategories();
    this.renderCategoryFilter();
    this.renderCategories();
    this.render();
  }

  renderCategories() {
    const list = document.getElementById('categoriesList');
    if (!list) return;

    const customCats = this.customCategories;

    if (customCats.length === 0) {
      list.innerHTML = '<p style="color: #999; font-style: italic; font-size: 13px;">No custom categories yet. Click the button below to add one.</p>';
      return;
    }

    list.innerHTML = customCats.map(category => `
      <div class="category-item">
        <div class="category-name">
          <span class="category-badge" style="background: ${this.getCategoryColor(category)}">${this.escapeHtml(category)}</span>
          <span class="category-count">${this.tracks.filter(t => t.category === category).length} tracks</span>
        </div>
        <div class="category-actions">
          <button class="category-edit-btn" data-name="${this.escapeHtml(category)}">Edit</button>
          <button class="category-delete-btn" data-name="${this.escapeHtml(category)}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  async loadTracks() {
    const result = await chrome.storage.local.get(['talkTracks']);
    this.tracks = result.talkTracks || [];
    
    // Migrate old tracks to new structure
    this.tracks = this.tracks.map((track, index) => ({
      id: track.id || Date.now() + index,
      title: track.title || '',
      category: track.category || 'Other',
      urlPattern: track.urlPattern || '',
      content: track.content || '',
      order: track.order !== undefined ? track.order : index
    }));
    
    // Sort by order
    this.tracks.sort((a, b) => a.order - b.order);
    
    // Initialize with one empty track if none exist
    if (this.tracks.length === 0) {
      this.tracks = [{
        id: Date.now(),
        title: '',
        category: 'Other',
        urlPattern: '',
        content: '',
        order: 0
      }];
    }
  }

  setupEventListeners() {
    // Main action buttons
    document.getElementById('addTrack').addEventListener('click', () => {
      this.addTrack();
    });

    document.getElementById('saveButton').addEventListener('click', () => {
      this.saveTracks();
    });

    // Backup button listener (delegated since it's rendered dynamically)
    document.addEventListener('click', (e) => {
      if (e.target.id === 'showBackupsBtn' || e.target.closest('#showBackupsBtn')) {
        this.showBackupModal();
      }
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.render();
      });
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filterCategory = e.target.value === 'All' ? 'all' : e.target.value;
        this.render();
      });
    }

    // Tag filter
    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter) {
      tagFilter.addEventListener('change', (e) => {
        this.filterTag = e.target.value;
        this.render();
      });
    }

    // Expand/collapse all
    const expandAllBtn = document.getElementById('expandAll');
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => this.expandAll());
    }

    const collapseAllBtn = document.getElementById('collapseAll');
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => this.collapseAll());
    }

    // Import/Export
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportTracks());
    }

    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importTracks());
    }

    // URL Pattern Tester
    const testBtn = document.getElementById('testBtn');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.testUrlPattern());
    }

    const testUrl = document.getElementById('testUrl');
    if (testUrl) {
      testUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.testUrlPattern();
      });
    }

    // Base URL Settings
    const saveBaseUrlBtn = document.getElementById('saveBaseUrlBtn');
    if (saveBaseUrlBtn) {
      saveBaseUrlBtn.addEventListener('click', () => this.saveBaseUrl());
    }

    // Base URL Preset buttons
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        const input = document.getElementById('baseUrl');
        if (input && url) {
          input.value = url;
          this.saveBaseUrl();
        }
      });
    });

    // AI Settings
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    if (saveApiKeyBtn) {
      saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
    }

    const testApiKeyBtn = document.getElementById('testApiKeyBtn');
    if (testApiKeyBtn) {
      testApiKeyBtn.addEventListener('click', () => this.testApiKey());
    }

    const addPersonaBtn = document.getElementById('addPersonaBtn');
    if (addPersonaBtn) {
      addPersonaBtn.addEventListener('click', () => this.addPersona());
    }

    // Persona management (event delegation)
    const personasList = document.getElementById('personasList');
    if (personasList) {
      personasList.addEventListener('click', (e) => {
        if (e.target.classList.contains('persona-edit-btn')) {
          const id = e.target.dataset.id;
          this.editPersona(id);
        } else if (e.target.classList.contains('persona-delete-btn')) {
          const id = e.target.dataset.id;
          this.deletePersona(id);
        }
      });
    }

    // Category management
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener('click', () => this.addCustomCategory());
    }

    const categoriesList = document.getElementById('categoriesList');
    if (categoriesList) {
      categoriesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-edit-btn')) {
          const name = e.target.dataset.name;
          this.editCustomCategory(name);
        } else if (e.target.classList.contains('category-delete-btn')) {
          const name = e.target.dataset.name;
          this.deleteCustomCategory(name);
        }
      });
    }

    // Bulk actions
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.selectAll());
    }

    const deselectAllBtn = document.getElementById('deselectAllBtn');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => this.deselectAll());
    }

    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', () => this.deleteBulk());
    }

    const bulkCategorySelect = document.getElementById('bulkCategorySelect');
    if (bulkCategorySelect) {
      bulkCategorySelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.bulkChangeCategory(e.target.value);
          e.target.value = '';
        }
      });
    }

    // Event delegation for dynamically created elements
    const tracksList = document.getElementById('tracksList');
    
    // Track expansion/collapse
    tracksList.addEventListener('click', (e) => {
      if (e.target.classList.contains('expand-toggle')) {
        const trackId = parseInt(e.target.dataset.trackId);
        this.toggleTrackExpansion(trackId);
        return;
      }

      if (e.target.classList.contains('track-summary')) {
        const trackId = parseInt(e.target.dataset.trackId);
        this.toggleTrackExpansion(trackId);
        return;
      }

      // Preview toggle
      if (e.target.classList.contains('preview-toggle-btn')) {
        const trackId = parseInt(e.target.dataset.trackId);
        this.togglePreview(trackId);
        return;
      }

      // Debug HTML button
      if (e.target.classList.contains('debug-html-btn')) {
        const trackId = parseInt(e.target.dataset.trackId);
        this.debugTrackHtml(trackId);
        return;
      }

      // Checkbox selection
      if (e.target.classList.contains('track-checkbox')) {
        const trackItem = e.target.closest('.track-item');
        const trackId = parseInt(trackItem.dataset.id);
        this.toggleSelection(trackId);
        return;
      }
      
      // Delete button
      if (e.target.classList.contains('delete-button')) {
        const trackItem = e.target.closest('.track-item');
        const trackId = parseInt(trackItem.dataset.id);
        this.deleteTrack(trackId);
        return;
      }
      
      // Formatting buttons
      if (e.target.classList.contains('format-btn')) {
        const toolbar = e.target.closest('.editor-toolbar');
        const editorId = toolbar.dataset.editor;
        const editor = document.getElementById(editorId);
        const format = e.target.dataset.format;
        this.applyFormatting(editor, format);
        return;
      }
    });

    // Handle input changes
    tracksList.addEventListener('change', (e) => {
      const trackItem = e.target.closest('.track-item');
      if (!trackItem) return;
      
      const trackId = parseInt(trackItem.dataset.id);
      const track = this.tracks.find(t => t.id === trackId);
      if (!track) return;

      if (e.target.id.startsWith('title-')) {
        track.title = e.target.value;
      } else if (e.target.id.startsWith('category-')) {
        track.category = e.target.value;
      } else if (e.target.id.startsWith('url-')) {
        track.urlPattern = e.target.value;
      } else if (e.target.id.startsWith('content-')) {
        track.content = e.target.value;
        this.updatePreview(trackId);
      }
    });

    // Handle real-time preview updates on input
    tracksList.addEventListener('input', (e) => {
      if (e.target.id.startsWith('content-')) {
        const trackItem = e.target.closest('.track-item');
        if (!trackItem) return;
        
        const trackId = parseInt(trackItem.dataset.id);
        this.updatePreview(trackId);
      }
    });

    // Handle paste events for Google Docs compatibility
    tracksList.addEventListener('paste', (e) => {
      // Only handle paste in contenteditable editors
      if (e.target.classList.contains('content-wysiwyg')) {
        e.preventDefault();
        
        const clipboardData = e.clipboardData || window.clipboardData;
        const htmlData = clipboardData.getData('text/html');
        const textData = clipboardData.getData('text/plain');
        
        if (htmlData) {
          // Clean and insert HTML
          const cleanHtml = ContentConverter.cleanPastedHtml(htmlData);
          document.execCommand('insertHTML', false, cleanHtml);
        } else if (textData) {
          // Insert plain text
          document.execCommand('insertText', false, textData);
        }
      }
    });

    // Keyboard shortcuts
    tracksList.addEventListener('keydown', (e) => {
      const isTextEditor = e.target.tagName === 'TEXTAREA' || 
                          e.target.classList.contains('content-wysiwyg');
      
      if (isTextEditor && (e.ctrlKey || e.metaKey)) {
        let format = null;
        if (e.key === 'b') format = 'bold';
        else if (e.key === 'i') format = 'italic';
        else if (e.key === 'u') format = 'underline';
        
        if (format) {
          e.preventDefault();
          this.applyFormatting(e.target, format);
        }
      }
    });

    // Drag and drop
    tracksList.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('track-item')) {
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.dataset.id);
      }
    });

    tracksList.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('track-item')) {
        e.target.classList.remove('dragging');
      }
    });

    tracksList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingItem = document.querySelector('.dragging');
      if (!draggingItem) return;

      const afterElement = this.getDragAfterElement(tracksList, e.clientY);
      if (afterElement == null) {
        tracksList.appendChild(draggingItem);
      } else {
        tracksList.insertBefore(draggingItem, afterElement);
      }
    });

    tracksList.addEventListener('drop', (e) => {
      e.preventDefault();
      this.updateTrackOrder();
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.track-item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  updateTrackOrder() {
    const trackItems = document.querySelectorAll('.track-item');
    const newOrder = [];
    
    trackItems.forEach((item, index) => {
      const trackId = parseInt(item.dataset.id);
      const track = this.tracks.find(t => t.id === trackId);
      if (track) {
        track.order = index;
        newOrder.push(track);
      }
    });
    
    this.tracks = newOrder;
    this.render();
  }

  applyFormatting(editor, format) {
    if (!editor) return;
    
    // Check if it's contenteditable (WYSIWYG) or textarea (Markdown)
    const isContentEditable = editor.contentEditable === 'true';
    
    if (isContentEditable) {
      // WYSIWYG formatting using execCommand
      editor.focus();
      
      switch(format) {
        case 'bold':
          document.execCommand('bold', false, null);
          break;
        case 'italic':
          document.execCommand('italic', false, null);
          break;
        case 'underline':
          document.execCommand('underline', false, null);
          break;
        case 'list':
          document.execCommand('insertUnorderedList', false, null);
          break;
        case 'heading':
          document.execCommand('formatBlock', false, 'h2');
          break;
      }
      
      // Trigger input event to notify of changes
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // Markdown formatting for textarea
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const selectedText = editor.value.substring(start, end);
      const beforeText = editor.value.substring(0, start);
      const afterText = editor.value.substring(end);
      
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
          
        case 'underline':
          formattedText = selectedText ? `<u>${selectedText}</u>` : '<u>underlined text</u>';
          cursorOffset = selectedText ? selectedText.length + 7 : 3;
          break;
          
        case 'list':
          if (selectedText) {
            const lines = selectedText.split('\n');
            formattedText = lines.map(line => line.trim() ? `- ${line.trim()}` : '').join('\n');
            cursorOffset = formattedText.length;
          } else {
            formattedText = '- List item\n- Another item';
            cursorOffset = 2;
          }
          break;
          
        case 'heading':
          formattedText = selectedText ? `## ${selectedText}` : '## Heading';
          cursorOffset = selectedText ? selectedText.length + 3 : 3;
          break;
      }
      
      editor.value = beforeText + formattedText + afterText;
      const newCursorPos = start + cursorOffset;
      editor.setSelectionRange(newCursorPos, newCursorPos);
      editor.focus();
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  addTrack() {
    const newTrack = {
      id: Date.now(),
      title: '',
      category: 'Other',
      urlPattern: '',
      content: '',
      order: this.tracks.length
    };
    this.tracks.push(newTrack);
    this.expandedTracks.add(newTrack.id);
    this.render();
  }

  deleteTrack(id) {
    this.tracks = this.tracks.filter(track => track.id !== id);
    this.selectedTracks.delete(id);
    this.expandedTracks.delete(id);
    this.render();
  }

  deleteBulk() {
    if (this.selectedTracks.size === 0) return;
    if (!confirm(`Delete ${this.selectedTracks.size} selected talk tracks?`)) return;
    
    this.tracks = this.tracks.filter(track => !this.selectedTracks.has(track.id));
    this.selectedTracks.clear();
    this.render();
  }

  toggleTrackExpansion(id) {
    if (this.expandedTracks.has(id)) {
      this.expandedTracks.delete(id);
    } else {
      this.expandedTracks.add(id);
    }
    this.render();
  }

  expandAll() {
    const filtered = this.getFilteredTracks();
    filtered.forEach(track => this.expandedTracks.add(track.id));
    this.render();
  }

  collapseAll() {
    this.expandedTracks.clear();
    this.render();
  }

  toggleSelection(id) {
    if (this.selectedTracks.has(id)) {
      this.selectedTracks.delete(id);
    } else {
      this.selectedTracks.add(id);
    }
    this.render();
  }

  selectAll() {
    const filtered = this.getFilteredTracks();
    filtered.forEach(track => this.selectedTracks.add(track.id));
    this.render();
  }

  deselectAll() {
    this.selectedTracks.clear();
    this.render();
  }

  bulkChangeCategory(category) {
    if (this.selectedTracks.size === 0) return;
    
    this.tracks.forEach(track => {
      if (this.selectedTracks.has(track.id)) {
        track.category = category;
      }
    });
    this.render();
  }

  getFilteredTracks() {
    return this.tracks.filter(track => {
      // Category filter
      if (this.filterCategory !== 'all' && track.category !== this.filterCategory) {
        return false;
      }
      
      // Tag filter
      if (this.filterTag !== 'all') {
        const trackTags = (track.tags || []).map(t => t.trim().toLowerCase());
        if (!trackTags.includes(this.filterTag.toLowerCase())) {
          return false;
        }
      }
      
      // Search filter (also search in tags)
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        const tagsString = (track.tags || []).join(' ').toLowerCase();
        return (
          (track.title || '').toLowerCase().includes(term) ||
          (track.urlPattern || '').toLowerCase().includes(term) ||
          (track.content || '').toLowerCase().includes(term) ||
          (track.category || '').toLowerCase().includes(term) ||
          tagsString.includes(term)
        );
      }
      
      return true;
    });
  }

  updateTrack(id, field, value) {
    const track = this.tracks.find(t => t.id === id);
    if (track) {
      track[field] = value;
    }
  }

  async saveTracks() {
    // Create backup before saving
    try {
      if (this.tracks.length > 0) {
        await this.createBackup('Auto-backup before save');
      }
    } catch (backupError) {
      console.error('Backup failed, but continuing with save:', backupError);
    }

    // Collect current values from form
    const tracksData = [];
    const conversionWarnings = [];
    
    for (const track of this.tracks) {
      const titleEl = document.getElementById(`title-${track.id}`);
      const categoryEl = document.getElementById(`category-${track.id}`);
      const urlEl = document.getElementById(`url-${track.id}`);
      const markdownEl = document.getElementById(`markdown-${track.id}`);
      const quill = this.quillEditors.get(track.id);
      
      if (titleEl && categoryEl && urlEl) {
        const urlPattern = urlEl.value.trim();
        
        // Get content from whichever editor is visible
        let content = '';
        if (markdownEl && markdownEl.style.display !== 'none') {
          // Markdown editor is visible - use directly
          content = markdownEl.value.trim();
        } else if (quill) {
          // Quill editor is active - convert HTML to markdown
          const htmlContent = quill.root.innerHTML;
          
          // Get the original markdown for comparison
          const originalMarkdown = track.content || '';
          
          // Convert HTML to markdown
          content = ContentConverter.htmlToMarkdown(htmlContent).trim();
          
          // Check for significant content loss
          if (originalMarkdown.length > 100 && content.length < originalMarkdown.length * 0.5) {
            conversionWarnings.push({
              title: titleEl.value || 'Untitled',
              original: originalMarkdown.length,
              converted: content.length
            });
          }
        } else {
          // Fall back to stored content
          content = track.content || '';
        }
        
        // Only save tracks that have at least a URL pattern
        if (urlPattern) {
          // Get tags
          const tagsEl = document.getElementById(`tags-${track.id}`);
          const tagsValue = tagsEl ? tagsEl.value : '';
          const tags = tagsValue.split(',').map(t => t.trim()).filter(t => t.length > 0);
          
          const trackData = {
            id: track.id,
            title: titleEl.value.trim(),
            category: categoryEl.value,
            tags: tags,
            urlPattern,
            content,
            order: track.order
          };
          
          // Also store raw HTML as backup (for recovery if conversion fails)
          if (quill && markdownEl && markdownEl.style.display === 'none') {
            trackData.htmlBackup = quill.root.innerHTML;
          }
          
          tracksData.push(trackData);
        }
      }
    }

    // Warn about potential data loss
    if (conversionWarnings.length > 0) {
      const warningMsg = conversionWarnings.map(w => 
        `"${w.title}": ${w.original} chars → ${w.converted} chars`
      ).join('\n');
      
      console.warn('Potential content loss detected:', conversionWarnings);
      
      if (!confirm(`Warning: Some tracks may have lost content during conversion:\n\n${warningMsg}\n\nDo you want to continue saving? A backup has been created.`)) {
        this.showStatus('Save cancelled. Use backup to restore if needed.', true);
        this.renderBackupInfo();
        return;
      }
    }

    try {
      await chrome.storage.local.set({ talkTracks: tracksData });
      this.tracks = tracksData;
      this.showStatus(`Saved ${tracksData.length} tracks successfully! (Backup created)`, false);
      this.renderBackupInfo();
      this.updateTagFilter(); // Refresh tag filter with any new tags
    } catch (error) {
      this.showStatus('Error saving settings: ' + error.message, true);
    }
  }

  exportTracks() {
    const dataStr = JSON.stringify(this.tracks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `talk-tracks-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.showStatus('Tracks exported successfully!', false);
  }

  importTracks() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        if (!Array.isArray(imported)) {
          throw new Error('Invalid format: expected an array of tracks');
        }
        
        // Validate and merge
        const validTracks = imported.filter(track => 
          track.urlPattern && typeof track.urlPattern === 'string'
        ).map((track, index) => ({
          id: Date.now() + index,
          title: track.title || '',
          category: track.category || 'Other',
          urlPattern: track.urlPattern,
          content: track.content || '',
          order: this.tracks.length + index
        }));
        
        if (confirm(`Import ${validTracks.length} tracks? This will add to existing tracks.`)) {
          this.tracks = [...this.tracks, ...validTracks];
          this.render();
          this.showStatus(`Imported ${validTracks.length} tracks successfully!`, false);
        }
      } catch (error) {
        this.showStatus('Error importing: ' + error.message, true);
      }
    };
    
    input.click();
  }

  testUrlPattern() {
    const testUrl = document.getElementById('testUrl').value.trim();
    const resultsDiv = document.getElementById('testResults');
    
    if (!testUrl) {
      resultsDiv.innerHTML = '<p style="color: #666;">Enter a URL to test</p>';
      return;
    }
    
    const matches = [];
    for (const track of this.tracks) {
      if (this.urlMatches(testUrl, track.urlPattern)) {
        matches.push(track);
      }
    }
    
    if (matches.length === 0) {
      resultsDiv.innerHTML = '<p style="color: #dc3545;">❌ No matching tracks found</p>';
    } else if (matches.length === 1) {
      const track = matches[0];
      resultsDiv.innerHTML = `
        <p style="color: #28a745;">✅ Match found!</p>
        <div style="background: #f8f9fa; padding: 12px; border-radius: 4px; margin-top: 8px;">
          <strong>${this.escapeHtml(track.title || 'Untitled')}</strong><br>
          <small style="color: #666;">Category: ${track.category}</small><br>
          <code style="font-size: 12px;">${this.escapeHtml(track.urlPattern)}</code>
        </div>
      `;
    } else {
      resultsDiv.innerHTML = `
        <p style="color: #ff8800;">⚠️ Multiple matches found (${matches.length}) - first match will be used:</p>
        ${matches.map((track, i) => `
          <div style="background: #f8f9fa; padding: 12px; border-radius: 4px; margin-top: 8px; border-left: 3px solid ${i === 0 ? '#28a745' : '#dee2e6'}">
            <strong>${this.escapeHtml(track.title || 'Untitled')}</strong> ${i === 0 ? '<span style="color: #28a745;">(active)</span>' : ''}<br>
            <small style="color: #666;">Category: ${track.category}</small><br>
            <code style="font-size: 12px;">${this.escapeHtml(track.urlPattern)}</code>
          </div>
        `).join('')}
      `;
    }
  }

  urlMatches(url, pattern) {
    // Simple pattern matching - same as in sidepanel.js
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(url);
    }
    return url.includes(pattern);
  }

  showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = isError ? 'status error' : 'status';
    
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
  }

  render() {
    const tracksList = document.getElementById('tracksList');
    const filteredTracks = this.getFilteredTracks();
    
    // Update filter info
    const filterInfo = document.getElementById('filterInfo');
    if (filterInfo) {
      const total = this.tracks.length;
      const shown = filteredTracks.length;
      filterInfo.textContent = shown === total 
        ? `Showing all ${total} tracks` 
        : `Showing ${shown} of ${total} tracks`;
    }
    
    // Update bulk actions visibility
    const bulkActions = document.getElementById('bulkActions');
    if (bulkActions) {
      bulkActions.style.display = this.selectedTracks.size > 0 ? 'flex' : 'none';
      const bulkCount = document.getElementById('bulkCount');
      if (bulkCount) {
        bulkCount.textContent = `${this.selectedTracks.size} selected`;
      }
    }
    
    if (filteredTracks.length === 0) {
      tracksList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p>No tracks found matching your filters.</p>
          <button class="add-button" style="width: auto; margin-top: 16px;" onclick="optionsManager.addTrack()">+ Add New Talk Track</button>
        </div>
      `;
      return;
    }
    
    tracksList.innerHTML = filteredTracks.map((track, index) => {
      const isExpanded = this.expandedTracks.has(track.id);
      const isSelected = this.selectedTracks.has(track.id);
      
      return `
      <div class="track-item ${isExpanded ? 'expanded' : 'collapsed'} ${isSelected ? 'selected' : ''}" 
           data-id="${track.id}" 
           draggable="true">
        <div class="track-header-collapsed">
          <input 
            type="checkbox" 
            class="track-checkbox" 
            ${isSelected ? 'checked' : ''}
            title="Select for bulk actions"
          />
          <div class="track-summary" data-track-id="${track.id}">
            <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
            <span class="track-title-preview">${this.escapeHtml(track.title || 'Untitled Track')}</span>
            <span class="track-category-badge" style="background: ${this.getCategoryColor(track.category)}">${track.category}</span>
            ${(track.tags && track.tags.length > 0) ? `
              <span class="track-tags-preview">
                ${track.tags.slice(0, 3).map(tag => `<span class="tag-pill">${this.escapeHtml(tag)}</span>`).join('')}
                ${track.tags.length > 3 ? `<span class="tag-more">+${track.tags.length - 3}</span>` : ''}
              </span>
            ` : ''}
            <span class="track-url-preview">${this.escapeHtml(track.urlPattern || 'No pattern')}</span>
          </div>
          <button class="expand-toggle" data-track-id="${track.id}" title="${isExpanded ? 'Collapse' : 'Expand'}">
            ${isExpanded ? '▼' : '▶'}
          </button>
        </div>
        
        <div class="track-content" style="display: ${isExpanded ? 'block' : 'none'}">
          <div class="track-header-expanded">
            <div class="track-number">Talk Track #${this.tracks.indexOf(track) + 1}</div>
            <button class="delete-button">
              Delete
            </button>
          </div>
          
          <div class="form-group">
            <label for="title-${track.id}">Track Title</label>
            <input 
              type="text" 
              id="title-${track.id}" 
              value="${this.escapeHtml(track.title)}"
              placeholder="e.g., Dashboard Overview Demo"
            />
          </div>
          
          <div class="form-group">
            <label for="category-${track.id}">Category</label>
            <select id="category-${track.id}">
              ${this.categories.filter(c => c !== 'All').map(cat => 
                `<option value="${cat}" ${track.category === cat ? 'selected' : ''}>${cat}</option>`
              ).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="tags-${track.id}">Tags <span class="label-hint">(comma-separated)</span></label>
            <input 
              type="text" 
              id="tags-${track.id}" 
              value="${this.escapeHtml((track.tags || []).join(', '))}"
              placeholder="e.g., demo, sales, technical"
              class="tags-input"
            />
          </div>
          
          <div class="form-group">
            <label for="url-${track.id}">URL Pattern</label>
            <input 
              type="text" 
              id="url-${track.id}" 
              value="${this.escapeHtml(track.urlPattern)}"
              placeholder="e.g., */dashboards/* or */apm/services"
            />
          </div>
          
          <div class="form-group">
            <div class="content-editor-header">
              <label for="content-${track.id}">Talk Track Content</label>
              <div class="editor-mode-buttons">
                <button type="button" class="preview-toggle-btn" data-track-id="${track.id}" title="Toggle between WYSIWYG and Markdown view">
                  📝 View Markdown
                </button>
                <button type="button" class="debug-html-btn" data-track-id="${track.id}" title="Debug: Show raw HTML structure">
                  🔍
                </button>
              </div>
            </div>
            <div class="editor-container">
              <div id="quill-editor-${track.id}" class="quill-editor-container" data-track-id="${track.id}"></div>
              <textarea 
                id="markdown-${track.id}"
                class="content-markdown"
                style="display: none;"
                placeholder="Raw markdown..."
              >${this.escapeHtml(track.content)}</textarea>
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');
    
    // Initialize Quill editors after DOM is ready
    setTimeout(() => this.initializeQuillEditors(), 0);
  }

  initializeQuillEditors() {
    // Clean up existing editors
    this.quillEditors.forEach((editor, id) => {
      // Quill doesn't have a destroy method, so we just remove the reference
    });
    this.quillEditors.clear();

    // Initialize Quill for each expanded track
    const filteredTracks = this.getFilteredTracks();
    filteredTracks.forEach(track => {
      if (this.expandedTracks.has(track.id)) {
        this.initQuillForTrack(track);
      }
    });
  }

  initQuillForTrack(track) {
    const containerId = `quill-editor-${track.id}`;
    const container = document.getElementById(containerId);
    
    if (!container || this.quillEditors.has(track.id)) return;
    
    // Create Quill editor with Google Docs-like toolbar
    const quill = new Quill(container, {
      theme: 'snow',
      placeholder: 'Start typing your talk track... Use the toolbar to format text.',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          ['blockquote', 'code-block'],
          ['link'],
          [{ 'color': [] }, { 'background': [] }],
          ['clean']
        ],
        clipboard: {
          matchVisual: false
        }
      }
    });

    // Load initial content using Quill's clipboard for proper Delta conversion
    if (track.content) {
      const html = ContentConverter.markdownToHtml(track.content);
      console.log(`Loading HTML into Quill for track ${track.id}:`, html.substring(0, 200) + '...');
      
      try {
        // Quill 2.x uses clipboard.convert({ html }), older versions use clipboard.convert(html)
        let delta;
        if (typeof quill.clipboard.convert === 'function') {
          try {
            delta = quill.clipboard.convert({ html });
          } catch (e) {
            delta = quill.clipboard.convert(html);
          }
        }
        
        if (delta) {
          quill.setContents(delta, 'silent');
        } else {
          quill.root.innerHTML = html;
        }
      } catch (error) {
        console.warn('Error loading content into Quill, using fallback:', error);
        quill.root.innerHTML = html;
      }
    }

    // Store reference
    this.quillEditors.set(track.id, quill);

    // Auto-save on text change (debounced)
    let saveTimeout;
    quill.on('text-change', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.onQuillChange(track.id);
      }, 500);
    });
  }

  onQuillChange(trackId) {
    const quill = this.quillEditors.get(trackId);
    if (!quill) return;

    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      // Store as HTML temporarily, will convert on save
      track._quillHtml = quill.root.innerHTML;
    }
  }

  getQuillContent(trackId) {
    const quill = this.quillEditors.get(trackId);
    if (quill) {
      return quill.root.innerHTML;
    }
    return null;
  }

  renderMarkdown(text) {
    if (!text) return '<p style="color: #999; font-style: italic;">No content yet. Start typing to see preview...</p>';
    
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
    
    // Parse markdown to HTML
    const rawHtml = marked.parse(text);
    
    // Sanitize HTML
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'strike', 'del', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'hr'],
      ALLOWED_ATTR: ['href', 'title', 'target']
    });
    
    return cleanHtml;
  }

  togglePreview(trackId) {
    const quillContainer = document.getElementById(`quill-editor-${trackId}`);
    const markdownEditor = document.getElementById(`markdown-${trackId}`);
    const toggleBtn = document.querySelector(`.preview-toggle-btn[data-track-id="${trackId}"]`);
    const quill = this.quillEditors.get(trackId);
    
    if (!quillContainer || !markdownEditor) return;
    
    const isMarkdownVisible = markdownEditor.style.display !== 'none';
    
    if (isMarkdownVisible) {
      // Switch back to WYSIWYG (Quill)
      const markdown = markdownEditor.value;
      const html = ContentConverter.markdownToHtml(markdown);
      
      if (quill) {
        try {
          // Quill 2.x uses clipboard.convert({ html }), older versions use clipboard.convert(html)
          let delta;
          try {
            delta = quill.clipboard.convert({ html });
          } catch (e) {
            delta = quill.clipboard.convert(html);
          }
          
          if (delta) {
            quill.setContents(delta, 'silent');
          } else {
            quill.root.innerHTML = html;
          }
        } catch (error) {
          console.warn('Error loading content into Quill, using fallback:', error);
          quill.root.innerHTML = html;
        }
      }
      
      quillContainer.style.display = 'block';
      markdownEditor.style.display = 'none';
      if (toggleBtn) toggleBtn.textContent = '📝 View Markdown';
    } else {
      // Switch to Markdown view
      let html = '';
      if (quill) {
        html = quill.root.innerHTML;
      }
      const markdown = ContentConverter.htmlToMarkdown(html);
      markdownEditor.value = markdown;
      quillContainer.style.display = 'none';
      markdownEditor.style.display = 'block';
      if (toggleBtn) toggleBtn.textContent = '👁️ View WYSIWYG';
    }
  }

  debugTrackHtml(trackId) {
    const wysiwygEditor = document.getElementById(`content-${trackId}`);
    const markdownEditor = document.getElementById(`markdown-${trackId}`);
    const track = this.tracks.find(t => t.id === trackId);
    
    if (!wysiwygEditor) return;
    
    const html = wysiwygEditor.innerHTML;
    const markdown = ContentConverter.htmlToMarkdown(html);
    
    // Create debug modal
    let modal = document.getElementById('debugModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'debugModal';
      modal.className = 'backup-modal';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div class="backup-modal-content" style="max-width: 900px;">
        <div class="backup-modal-header">
          <h2>🔍 Content Debug</h2>
          <button type="button" class="close-modal-btn" id="closeDebugModal">✕</button>
        </div>
        <div style="padding: 20px; max-height: 70vh; overflow-y: auto;">
          <h3>Original Stored Markdown (${track?.content?.length || 0} chars):</h3>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 12px; max-height: 200px; overflow-y: auto;">${this.escapeHtml(track?.content || 'No stored content')}</pre>
          
          <h3>Current WYSIWYG HTML (${html.length} chars):</h3>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 12px; max-height: 200px; overflow-y: auto;">${this.escapeHtml(html)}</pre>
          
          <h3>Converted back to Markdown (${markdown.length} chars):</h3>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 12px; max-height: 200px; overflow-y: auto;">${this.escapeHtml(markdown)}</pre>
          
          ${track?.htmlBackup ? `
            <h3>HTML Backup (${track.htmlBackup.length} chars):</h3>
            <pre style="background: #fff3cd; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 12px; max-height: 200px; overflow-y: auto;">${this.escapeHtml(track.htmlBackup)}</pre>
            <button type="button" class="restore-html-backup-btn" data-track-id="${trackId}" style="margin-top: 10px; padding: 8px 16px; background: #ffc107; border: none; border-radius: 4px; cursor: pointer;">
              ↩️ Restore from HTML Backup
            </button>
          ` : ''}
          
          <div style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
            <strong>💡 Tips:</strong>
            <ul style="margin: 10px 0 0 20px;">
              <li>If converted markdown is shorter than original, content may have been lost</li>
              <li>Use "📝 View Markdown" to edit in pure markdown mode (safer)</li>
              <li>Backups are created before every save - use "📂 Restore" to recover</li>
              <li>For complex formatting, consider editing in markdown mode directly</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    document.getElementById('closeDebugModal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Restore from HTML backup handler
    const restoreBtn = modal.querySelector('.restore-html-backup-btn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => {
        if (confirm('Restore WYSIWYG editor content from HTML backup?')) {
          wysiwygEditor.innerHTML = track.htmlBackup;
          modal.style.display = 'none';
          this.showStatus('Restored from HTML backup', false);
        }
      });
    }
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  updatePreview(trackId) {
    // No longer needed since we use WYSIWYG by default
    // Keeping for backwards compatibility
  }

  getCategoryColor(category) {
    const colors = {
      'Dashboards': '#632ca6',
      'APM': '#00a8e1',
      'Logs': '#00b377',
      'Infrastructure': '#ff8800',
      'RUM': '#e32d84',
      'Synthetics': '#8943ef',
      'Security': '#dc3545',
      'Monitors': '#ffc107',
      'Other': '#6c757d'
    };
    
    // Return predefined color if it exists
    if (colors[category]) {
      return colors[category];
    }
    
    // Generate a consistent color for custom categories based on name
    return this.generateColorFromString(category);
  }

  generateColorFromString(str) {
    // Generate a consistent color from a string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate nice colors (avoid too light or too dark)
    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
    const lightness = 45 + (Math.abs(hash >> 8) % 15); // 45-60%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // === Settings methods ===

  async loadBaseUrl() {
    const result = await chrome.storage.local.get(['baseUrl']);
    this.baseUrl = result.baseUrl || 'https://app.datadoghq.com';
    const input = document.getElementById('baseUrl');
    if (input) {
      input.value = this.baseUrl;
    }
  }

  async saveBaseUrl() {
    const input = document.getElementById('baseUrl');
    if (!input) return;
    
    let url = input.value.trim();
    
    // Remove trailing slash
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      this.showStatus('Invalid URL format', true, 'baseUrlStatus');
      return;
    }
    
    this.baseUrl = url;
    await chrome.storage.local.set({ baseUrl: url });
    this.showStatus('Base URL saved!', false, 'baseUrlStatus');
  }

  // === AI-related methods ===

  async loadApiKey() {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    this.apiKey = result.openaiApiKey || '';
    const input = document.getElementById('openaiApiKey');
    if (input && this.apiKey) {
      input.value = this.apiKey;
    }
  }

  async saveApiKey() {
    const input = document.getElementById('openaiApiKey');
    const apiKey = input.value.trim();
    
    if (!apiKey) {
      this.showApiKeyStatus('Please enter an API key', true);
      return;
    }

    try {
      await chrome.storage.local.set({ openaiApiKey: apiKey });
      this.apiKey = apiKey;
      this.showApiKeyStatus('API key saved successfully!', false);
    } catch (error) {
      this.showApiKeyStatus('Error saving API key: ' + error.message, true);
    }
  }

  async testApiKey() {
    const input = document.getElementById('openaiApiKey');
    const apiKey = input.value.trim();
    
    if (!apiKey) {
      this.showApiKeyStatus('Please enter an API key to test', true);
      return;
    }

    this.showApiKeyStatus('Testing API key...', false);

    try {
      const isValid = await this.aiService.validateApiKey(apiKey);
      if (isValid) {
        this.showApiKeyStatus('✓ API key is valid!', false);
      } else {
        this.showApiKeyStatus('✗ API key is invalid', true);
      }
    } catch (error) {
      this.showApiKeyStatus('Error testing API key: ' + error.message, true);
    }
  }

  showApiKeyStatus(message, isError) {
    const status = document.getElementById('apiKeyStatus');
    if (status) {
      status.textContent = message;
      status.className = isError ? 'api-key-status error' : 'api-key-status success';
      
      setTimeout(() => {
        status.textContent = '';
        status.className = 'api-key-status';
      }, 5000);
    }
  }

  async loadPersonas() {
    const result = await chrome.storage.local.get(['customPersonas']);
    this.customPersonas = result.customPersonas || [];
  }

  async savePersonas() {
    await chrome.storage.local.set({ customPersonas: this.customPersonas });
  }

  getAllPersonas() {
    return [...this.defaultPersonas, ...this.customPersonas];
  }

  addPersona() {
    const name = prompt('Enter persona name:');
    if (!name) return;

    const description = prompt('Enter persona description (focus and approach):');
    if (!description) return;

    const newPersona = {
      id: 'custom-' + Date.now(),
      name: name.trim(),
      description: description.trim(),
      isDefault: false
    };

    this.customPersonas.push(newPersona);
    this.savePersonas();
    this.renderPersonas();
  }

  deletePersona(id) {
    if (!confirm('Delete this persona?')) return;
    
    this.customPersonas = this.customPersonas.filter(p => p.id !== id);
    this.savePersonas();
    this.renderPersonas();
  }

  editPersona(id) {
    const persona = this.customPersonas.find(p => p.id === id);
    if (!persona) return;

    const name = prompt('Enter persona name:', persona.name);
    if (!name) return;

    const description = prompt('Enter persona description:', persona.description);
    if (!description) return;

    persona.name = name.trim();
    persona.description = description.trim();
    this.savePersonas();
    this.renderPersonas();
  }

  renderPersonas() {
    const list = document.getElementById('personasList');
    if (!list) return;

    const allPersonas = this.getAllPersonas();

    list.innerHTML = allPersonas.map(persona => `
      <div class="persona-item ${persona.isDefault ? 'default' : 'custom'}">
        <div class="persona-header">
          <strong>${this.escapeHtml(persona.name)}</strong>
          ${persona.isDefault ? '<span class="default-badge">Default</span>' : ''}
        </div>
        <div class="persona-description">${this.escapeHtml(persona.description)}</div>
        ${!persona.isDefault ? `
          <div class="persona-actions">
            <button class="persona-edit-btn" data-id="${persona.id}">Edit</button>
            <button class="persona-delete-btn" data-id="${persona.id}">Delete</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  }
}

// Initialize
const optionsManager = new OptionsManager();
