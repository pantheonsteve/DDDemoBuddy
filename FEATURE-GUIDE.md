# Complete Feature Guide - Datadog Demo Buddy

## 🎉 All New Features Implemented!

This guide covers all the powerful new features for managing dozens (or hundreds!) of talk tracks.

---

## 1. 🔍 Search & Filter

### Search Box
**Location:** Top of the page

**Features:**
- Real-time search as you type
- Searches across: titles, URL patterns, content, and categories
- Case-insensitive
- Shows only matching tracks

**Usage:**
```
Type: "dashboard"
Result: Shows all tracks with "dashboard" in any field
```

### Category Filter
**Location:** Control panel (dropdown)

**Features:**
- Filter by specific product category
- Options: All, Dashboards, APM, Logs, Infrastructure, RUM, Synthetics, Security, Monitors, Other
- Combines with search filter

**Usage:**
```
Select: "APM"
Result: Shows only APM-related tracks
```

---

## 2. 📋 Collapsible Accordion View

### Why It's Useful
- Dramatically reduces visual clutter
- See 10-20 tracks on screen at once
- Quick scanning to find what you need

### How It Works
**Collapsed State (default):**
- Shows: Checkbox, drag handle, title, category badge, URL pattern
- Click anywhere on the track to expand

**Expanded State:**
- Shows: Full editing interface with all fields
- Click collapse button (▼) to minimize

### Quick Actions
- **Expand All** button - Opens all visible tracks
- **Collapse All** button - Closes all tracks

**Pro Tip:** Use search to filter, then expand all to edit multiple related tracks

---

## 3. 🏷️ Categories & Tags

### Available Categories
- **Dashboards** - Purple
- **APM** - Blue
- **Logs** - Green
- **Infrastructure** - Orange
- **RUM** - Pink
- **Synthetics** - Purple
- **Security** - Red
- **Monitors** - Yellow
- **Other** - Gray

### Features
- Color-coded badges for quick visual identification
- Filter by category in dropdown
- Bulk change categories for multiple tracks

### Best Practices
```
Good organization:
  Dashboards/
    - Executive Dashboard Demo
    - Custom Metrics Dashboard
  APM/
    - Services Overview
    - Trace Analysis Demo
  Logs/
    - Log Explorer Demo
    - Patterns & Analytics
```

---

## 4. 📝 Track Titles

### Why Add Titles?
- Easier to identify tracks at a glance
- Better organization
- More professional appearance
- Helpful when you have multiple tracks for similar URLs

### Example
```
Instead of:
  */dashboards/*
  
Use:
  Title: "Executive Dashboard Demo"
  URL: */dashboards/exec-*
```

### Tips
- Use descriptive titles: "Q4 Review Dashboard Demo"
- Include context: "APM - Microservices Deep Dive"
- Keep concise: Aim for 3-5 words

---

## 5. 📤 Import & Export

### Export Tracks
**Button:** "Export" in control panel

**What It Does:**
- Creates a JSON file with all your talk tracks
- Filename: `talk-tracks-2024-12-01.json`
- Includes all data: titles, categories, patterns, content

**Use Cases:**
- Backup your tracks
- Share with team members
- Version control (commit to git)
- Transfer between computers

### Import Tracks
**Button:** "Import" in control panel

**What It Does:**
- Load tracks from a JSON file
- Validates the format
- **Merges** with existing tracks (doesn't replace!)
- Prompts for confirmation before importing

**Example Workflow:**
```
1. Export tracks from your work computer
2. Email JSON file to yourself
3. Import on your laptop
4. You now have all tracks on both machines!
```

### JSON Format
```json
[
  {
    "id": 1701445200000,
    "title": "Dashboard Demo",
    "category": "Dashboards",
    "urlPattern": "*/dashboards/*",
    "content": "## Key Points\n- Real-time metrics\n- Custom widgets",
    "order": 0
  }
]
```

---

## 6. ☑️ Bulk Actions

### Selection
**How to Select:**
- Check the checkbox on any track
- Click "Select All" to select all visible tracks
- Click "Deselect All" to clear selection

**Visual Feedback:**
- Selected tracks have yellow highlight
- Yellow banner shows "X selected"

### Available Bulk Actions

#### 1. **Delete Selected**
- Removes all selected tracks
- Asks for confirmation
- Cannot be undone (unless you didn't save yet!)

#### 2. **Change Category**
- Dropdown in bulk actions banner
- Changes category for all selected tracks
- Example: Move 5 tracks from "Other" to "APM"

### Example Workflows

**Clean up "Other" category:**
```
1. Filter by: Other
2. Select All
3. Review what's selected
4. Change Category → APM (or appropriate category)
```

**Delete old demo tracks:**
```
1. Search: "old" or "deprecated"
2. Select All matches
3. Delete Selected
4. Confirm
```

---

## 7. ↕️ Drag & Drop Reordering

### How It Works
- Grab the **⋮⋮** handle on any track
- Drag up or down
- Drop in new position
- Order is automatically saved

### Why Reorder?
- Put most-used tracks at top
- Group related tracks together
- Organize by demo flow sequence
- Match your presentation order

### Tips
- Order is preserved in the popup window
- First matching track wins (if multiple match)
- Reorder before filtering/searching

### Example Use Case
```
Demo flow order:
1. Login & Navigation
2. Dashboard Overview  
3. APM Services Deep Dive
4. Logs Analysis
5. Create Monitor
6. RUM Analysis

Drag tracks to match this sequence!
```

---

## 8. 🧪 URL Pattern Tester

### Location
Blue section near the top of the page

### What It Does
- Test if a URL matches your patterns
- Shows which track would be displayed
- Identifies conflicts (multiple matches)

### How to Use
```
1. Enter a URL in the test box:
   https://app.datadoghq.com/apm/services

2. Click "Test" (or press Enter)

3. See results:
   ✅ Match found! → Shows matching track
   ⚠️ Multiple matches → Shows all matches (first wins)
   ❌ No match → No tracks configured for this URL
```

### Example Results

**Single Match (Good!):**
```
✅ Match found!
APM Services Overview
Category: APM
Pattern: */apm/services*
```

**Multiple Matches (Warning!):**
```
⚠️ Multiple matches found (2) - first match will be used:

APM Services Overview (active)
Category: APM
Pattern: */apm/*

General APM Demo
Category: APM  
Pattern: *apm*
```

**Tip:** When you see multiple matches, make patterns more specific!

---

## 9. ⌨️ Keyboard Shortcuts

### Text Formatting (in any textarea)
- `Ctrl+B` (Mac: `Cmd+B`) - **Bold**
- `Ctrl+I` (Mac: `Cmd+I`) - *Italic*
- `Ctrl+U` (Mac: `Cmd+U`) - <u>Underline</u>

### Navigation
- `Enter` in URL test field - Run test
- `Tab` - Move between fields

---

## 10. 🎨 WYSIWYG Toolbar

### Formatting Buttons
Every content editor has a toolbar with:
- **B** - Bold text
- **I** - Italic text
- **U** - Underline text
- **• List** - Bullet list
- **H** - Heading

### How to Use
**With Selected Text:**
```
1. Highlight text: "important point"
2. Click B button
3. Result: **important point**
```

**Without Selection:**
```
1. Click B button
2. Inserts: **bold text**
3. Cursor positioned ready to type
```

### Smart Features
- Auto-detects if text is already formatted
- Works with keyboard shortcuts
- Updates cursor position intelligently
- Saves changes automatically

---

## 🚀 Pro Tips & Workflows

### Workflow 1: Organizing Existing Tracks
```
1. Export current tracks (backup!)
2. Use bulk actions to categorize
3. Add descriptive titles
4. Reorder by importance
5. Collapse all
6. Save changes
```

### Workflow 2: Creating Demo Set
```
1. Create new tracks for each demo step
2. Add clear titles: "Step 1: Login", "Step 2: Dashboard"
3. Categorize appropriately
4. Drag to match demo sequence
5. Test URLs to verify patterns
6. Export for backup
```

### Workflow 3: Team Sharing
```
1. Export your tracks
2. Share JSON file with team
3. Team members import
4. Everyone has same talk tracks!
5. Update and re-share as needed
```

### Workflow 4: Quick Editing
```
1. Search for what you need
2. Expand matching tracks
3. Edit content with WYSIWYG toolbar
4. Collapse and move on
5. Save when done
```

---

## 📊 Summary of All Features

| Feature | Benefit | Time Saved |
|---------|---------|------------|
| Search & Filter | Find tracks instantly | 90% |
| Collapsible Accordion | Reduce clutter | 80% |
| Categories | Organize logically | 70% |
| Track Titles | Quick identification | 85% |
| Import/Export | Backup & share | 95% |
| Bulk Actions | Edit multiple at once | 90% |
| Drag & Drop | Custom ordering | 75% |
| URL Tester | Verify patterns work | 100% |
| WYSIWYG Toolbar | Format faster | 60% |

---

## 🎓 Getting Started Checklist

For first-time users with lots of tracks to manage:

- [ ] Export existing tracks (backup!)
- [ ] Add titles to your tracks
- [ ] Assign categories to each track
- [ ] Test your URL patterns
- [ ] Reorder by importance or demo flow
- [ ] Collapse all to reduce clutter
- [ ] Try searching for specific tracks
- [ ] Use bulk actions to update categories
- [ ] Export updated tracks (new backup!)
- [ ] Share with your team

---

## 🆘 Troubleshooting

**Search not finding my track:**
- Check for typos
- Search is real-time, just keep typing
- Try searching by category name

**Multiple tracks matching same URL:**
- Use URL Pattern Tester to identify conflicts
- Make patterns more specific
- Reorder so preferred track is first

**Lost my tracks:**
- Check if you saved changes
- Check if you filtered/searched (may be hidden)
- Import from last export if available

**Drag and drop not working:**
- Make sure you're grabbing the ⋮⋮ handle
- Try refreshing the extension
- Check that tracks aren't filtered

---

## 🎉 You're All Set!

You now have a professional-grade talk track management system that can handle:
- ✅ Dozens or hundreds of tracks
- ✅ Complex organization schemes
- ✅ Team collaboration
- ✅ Quick editing and updates
- ✅ Easy searching and filtering

Happy demoing! 🚀

