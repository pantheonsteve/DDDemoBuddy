# Datadog Demo Buddy Chrome Extension

A Chrome extension that displays presenter notes/talk tracks based on the current page URL, similar to Google Slides presenter view.

## Features

### Core Features
- 🎯 Separate popup window that can be hidden during screen sharing
- 🔄 Automatic URL detection and matching
- 📝 Configure different talk tracks for different page patterns
- ⚡ Real-time updates as you navigate
- 💾 Persistent storage of your talk tracks
- ✏️ **Inline Authoring** - Create and edit talk tracks directly in the popup
- ✅ **Real-time URL Validation** - See instantly if your URL pattern matches the current page
- 🌐 **Configurable Base URL** - Works with any Datadog instance (US1, US3, US5, EU, Gov, Demo) or any website

### Professional Management
- 🔍 **Search & Filter** - Find tracks instantly across all fields
- 📂 **Categories** - Organize by Datadog product (Dashboards, APM, Logs, etc.)
- ✨ **Custom Categories** - Create your own categories for specialized grouping
- 🏷️ **Track Titles** - Give descriptive names to your tracks
- 📋 **Collapsible Accordion** - See dozens of tracks without clutter
- ↕️ **Drag & Drop** - Reorder tracks by importance or demo flow
- ☑️ **Bulk Actions** - Select multiple tracks to edit or delete at once
- 📤 **Import/Export** - Backup, share, and sync tracks as JSON
- 🧪 **URL Pattern Tester** - Test which track matches a given URL
- ⌨️ **Keyboard Shortcuts** - Ctrl+B for bold, Ctrl+I for italic, etc.
- 🎨 **WYSIWYG Editor** - Edit with rich text formatting (default view)
- 📝 **Markdown Mode** - Toggle to raw markdown for advanced editing
- 📋 **Google Docs Integration** - Copy/paste formatted content directly
- 👁️ **Live Rendering** - See formatted content as you type

### Data Protection & Backup
- 💾 **Automatic Backups** - Creates backup before every save (up to 50 versions)
- 📂 **Backup History** - View, restore, or export any previous version
- ⚠️ **Loss Detection** - Warns if content might be lost during conversion
- ↩️ **One-Click Restore** - Instantly restore any backup
- 📤 **Export Backups** - Download individual backups as JSON files
- 🛡️ **Pre-Restore Safety** - Creates backup of current state before restoring

### AI-Powered Generation (NEW! 🤖✨)
- 🤖 **AI Talk Track Generation** - Let GPT-4 Vision create talk tracks from screenshots
- 📸 **Full-Page Capture** - Automatically captures entire scrolling pages
- 🎭 **Multiple Personas** - Sales Engineer, Solutions Architect, Executive Briefing, and more
- ✍️ **Custom Personas** - Create your own personas for specialized audiences
- 🎯 **Auto-Categorization** - AI intelligently categorizes and titles generated tracks
- 🔄 **Regenerate Option** - Try different personas or regenerate for variations
- 💾 **Multiple Save Options** - Save as new, append to existing, or replace existing tracks
- ➕ **Append Mode** - Build comprehensive tracks by appending content from different page sections

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `demoextension` folder
5. Pin the extension to your toolbar (optional but recommended)

## Usage

### Opening the Talk Track Window

1. Navigate to any Datadog page
2. Click the extension icon in your toolbar
3. A separate popup window will open showing your talk tracks
4. The window will automatically update as you navigate between tabs
5. Hide the popup window during screen sharing to keep your notes private

**Pro Tip:** Position the popup window on a separate monitor or in a corner where you can reference it easily during presentations without it appearing in screen shares.

### Using AI Generation

**Basic Flow:**
1. Click **🤖 AI Mode** in the popup window
2. Select a persona (Sales Engineer, Solutions Architect, etc.)
3. Click **📸 Capture & Generate**
4. Wait 10-30 seconds for AI to analyze the page
5. Review the generated talk track
6. Choose how to save:
   - **💾 Save as New** - Create a new track
   - **➕ Append to Existing** - Add to current track (great for multi-section pages!)
   - **🔄 Replace Existing** - Refresh existing track content

**Multi-Section Strategy:**
For pages with multiple sections, generate content for each section and append:
1. Show top section → Generate → Save as New
2. Scroll to next section → Generate → Append to Existing  
3. Repeat for all sections → Result: One comprehensive track!

**See AI-FEATURES.md for complete AI documentation**

### Inline Authoring (New! ✏️)

Create and edit talk tracks directly from the popup window while exploring your demo:

**Creating a New Track:**
1. Navigate to a page you want to annotate
2. Click the **✏️** button in the popup header
3. Or click **✏️ Create Talk Track** when no track exists
4. Fill in the form:
   - **Title** - Name for this talk track
   - **Category** - Organize by feature area
   - **URL Pattern** - See real-time validation!
   - **Content** - Write your talk track (markdown supported)
5. Click **💾 Create Track**

**Editing an Existing Track:**
1. When viewing a talk track, click **✏️ Edit**
2. Make your changes
3. Click **💾 Save Changes**

**Real-Time URL Pattern Validation:**
- As you type the URL pattern, you'll see:
  - ✅ **Green** - Pattern matches current page
  - ❌ **Red** - Pattern does NOT match current page
- Use the suggestion buttons:
  - **📍 Auto-detect** - Generate pattern from current URL
  - **🔗 Exact path** - Match this exact page

**Quick Workflow:**
1. Browse your demo environment
2. See something important → Click ✏️
3. Write your talking points
4. Check URL validation is ✅
5. Save → Done!

### Configuring Base URL

Demo Buddy works with any website, but you can configure a base URL to help with URL pattern suggestions and AI context:

1. Open the **Options** page
2. Find the **⚙️ General Settings** section at the top
3. Enter your base URL or click a **quick preset**:
   - **Datadog US1:** `https://app.datadoghq.com`
   - **Datadog US3:** `https://us3.datadoghq.com`
   - **Datadog US5:** `https://us5.datadoghq.com`
   - **Datadog EU:** `https://app.datadoghq.eu`
   - **Datadog Gov:** `https://app.ddog-gov.com`
   - **Datadog Demo:** `https://demo.datadoghq.com`
4. Click **Save** to apply

**Note:** You can use Demo Buddy on ANY website - the base URL just helps with smart defaults and AI context.

### Configuring Talk Tracks

1. Right-click the extension icon and select "Options"
2. Or click "Configure Talk Tracks" in the popup window
3. Add URL patterns and corresponding talk tracks

### WYSIWYG Editor & Google Docs Integration

The talk track editor is now **WYSIWYG (What You See Is What You Get)** by default, making it easy to format content without learning markdown syntax.

**Key Features:**
- **Rich Text Editing** - Bold, italic, underline, lists, headings appear formatted as you type
- **Copy from Google Docs** - Paste formatted content directly, preserving:
  - Bold, italic, underline formatting
  - Bulleted and numbered lists (including nested lists)
  - Headings
  - Line breaks and paragraphs
- **Paste to Google Docs** - Copy formatted talk tracks and paste into Google Docs
- **Toolbar Buttons** - Click buttons or use keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U)
- **Markdown Toggle** - Click "📝 View Markdown" to see/edit raw markdown source
- **Auto-Save** - Content converts to markdown for storage automatically

**Workflow Example:**
1. Write your talk track in Google Docs
2. Format it with bold, lists, headings, etc.
3. Copy from Google Docs (Ctrl+C / Cmd+C)
4. Paste into talk track editor (Ctrl+V / Cmd+V)
5. Formatting is preserved automatically!
6. Edit inline with WYSIWYG tools
7. Click "Save" - content stored as markdown

**Advanced Users:**
- Click "📝 View Markdown" to switch to markdown editing mode
- Edit raw markdown with full syntax support
- Click "👁️ View WYSIWYG" to return to rich text view

### Backup & Recovery

Your talk tracks are valuable! The extension automatically protects your work:

**Automatic Backups:**
- A backup is created **every time you save**
- Up to 50 backups are kept (oldest deleted first)
- Backups include all tracks, categories, and metadata

**Restoring from Backup:**
1. Click **📂 Restore** button at bottom of Options page
2. Browse backup history (sorted newest first)
3. Click **↩️ Restore** on any backup
4. Confirm restoration (current state is backed up first)
5. All tracks restored to that point in time!

**Exporting Backups:**
- Click **📤 Export** on any backup to download as JSON
- Or click **📤 Export Current Tracks** for current state
- JSON files can be imported later via Import function

**Data Loss Warning:**
If the system detects potential content truncation during save:
- You'll see a warning dialog
- A backup has already been created
- You can cancel save and investigate
- Or confirm to proceed with save

**Best Practices:**
- Use **📂 Restore** to view backup history regularly
- Export important tracks to JSON files for off-browser backup
- If something looks wrong after save, restore immediately
- Check track content in "View Markdown" mode if unsure

### Managing Categories

The extension includes default categories (Dashboards, APM, Logs, etc.) but you can create your own:

1. Open the **Options** page
2. Scroll to **🤖 AI Talk Track Generation** section
3. Find the **Custom Categories** area at the bottom
4. Click **+ Add Custom Category**
5. Enter category name (e.g., "Customer Demos", "Training", "Webinars")
6. Your custom category now appears in:
   - Category filter dropdown
   - Track category selector
   - Bulk actions menu

**Category Features:**
- **Edit** - Rename categories (automatically updates all tracks)
- **Delete** - Remove categories (moves tracks to "Other")
- **Auto-colors** - Each custom category gets a unique color
- **Track count** - See how many tracks use each category

### URL Pattern Examples

- `*/dashboards/*` - Matches any dashboard page
- `*/apm/services` - Matches the APM services page
- `*/monitors/manage` - Matches the monitors management page
- `*app.datadoghq.com/infrastructure*` - Matches infrastructure pages

You can use `*` as a wildcard to match any text.

## File Structure

```
demoextension/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js             # Detects URL changes
├── sidepanel.html         # Popup window UI
├── sidepanel.js           # Popup window logic
├── sidepanel.css          # Popup window styles
├── options.html           # Configuration page UI
├── options.js             # Configuration page logic
├── options.css            # Configuration page styles
└── icons/                 # Extension icons
```

## Customization

### Adding Icons

Replace the placeholder icons in the `icons/` folder with:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

### Modifying Styles

Edit the CSS files to match your preferences:
- `sidepanel.css` - Popup window appearance
- `options.css` - Options page appearance

### Advanced URL Matching

The current implementation supports simple wildcard matching. You can enhance the `urlMatches()` method in `sidepanel.js` to support:
- Regular expressions
- Query parameter matching
- Hostname-specific patterns

## Markdown Formatting Support

The extension now supports **Markdown** and rich text formatting in your talk tracks! You can use:

### Text Formatting
- **Bold text**: `**bold**` or `__bold__`
- *Italic text*: `*italic*` or `_italic_`
- ***Bold and italic***: `***text***`
- ~~Strikethrough~~: `~~text~~`

### Lists
- Bulleted lists: Use `-`, `*`, or `+`
- Numbered lists: Use `1.`, `2.`, etc.
- **Nested lists**: Indent with 2-4 spaces for sub-items
  - Nested bullets use different symbols (disc → circle → square)
  - Nested numbers use different styles (1,2,3 → a,b,c → i,ii,iii)

### Headings
```markdown
# Heading 1
## Heading 2
### Heading 3
```

### Other Formatting
- Links: `[text](url)`
- Blockquotes: `> quote text`
- Horizontal rules: `---` or `***`
- Inline code: `` `code` ``
- Code blocks: Use triple backticks

### Live Markdown Preview

The options page now includes a **live preview** feature:

1. Expand any talk track
2. Click the **👁️ Preview** button (top-right of content area)
3. See your markdown rendered in real-time
4. Click **👁️ Preview** again to return to editing

The preview updates instantly as you type, making it easy to perfect your formatting!

### Example Talk Track with Nested Lists

```markdown
# Dashboard Demo

## Key Points
- **Metrics are updated in real-time**
  - Updates every second
  - No refresh needed
- Demonstrate the *custom query builder*
  - Support for complex filters
  - Boolean operators (AND, OR, NOT)
- Show 7-day time range
  - Compare with previous week
  - Identify trends

## Important Numbers
1. 99.9% uptime
   a. Across all regions
   b. Including planned maintenance
2. Response time < 200ms
   a. P50: 50ms
   b. P95: 150ms
   c. P99: 200ms
3. 50K requests/sec
   - Peak: 80K requests/sec
   - Average: 35K requests/sec

> Remember to mention the new alerting features!

---

**Next:** Move to APM Services page
```

## Tips for Creating Talk Tracks

1. **Be specific with URL patterns** - More specific patterns will match first
2. **Use Markdown formatting** - Make important points stand out with bold, bullets, and headings
3. **Include key metrics** - Add specific numbers or data points to reference
4. **Add transitions** - Include phrases to smoothly move between topics
5. **Keep it concise** - Presenter notes should be quick reference, not full scripts

## Development

### Testing Changes

1. Make your changes to the files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload any Datadog pages you have open

## Troubleshooting

**Popup window not opening?**
- Make sure you're on a Datadog page (*.datadoghq.com)
- Try clicking the extension icon again
- Check the Chrome console for errors
- If the window was already open, clicking the icon will bring it to focus

**Talk tracks not showing?**
- Verify your URL pattern matches the current page
- Check the pattern uses `*` wildcards correctly
- Save your changes in the options page

**URL changes not detected?**
- Make sure the popup window is open
- Refresh the page
- Reload the extension
- Check that the content script is injected (inspect page console)

**Window keeps getting in the way during screen sharing?**
- Position the popup window outside your screen share area
- Or simply close/minimize the window when not needed
- Click the extension icon again to reopen it when you need your notes

## License

MIT License - feel free to modify and customize for your needs!
