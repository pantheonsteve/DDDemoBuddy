# Quick Reference Card 📋

## 🎯 Most Common Actions

| Action | How To |
|--------|--------|
| **Find a track** | Type in search box |
| **Add new track** | Click "+ Add New Talk Track" |
| **Edit track** | Click on track title to expand |
| **Delete track** | Expand track → Delete button |
| **Reorder tracks** | Drag the ⋮⋮ handle |
| **Save changes** | Click "💾 Save All Changes" |

---

## 🔍 Search & Filter

```
Search box: Type anything to filter
Category: Dropdown to filter by product
Expand All: Open all visible tracks
Collapse All: Close all tracks
```

---

## ✏️ Formatting Shortcuts

| Shortcut | Result |
|----------|--------|
| `Ctrl+B` (Cmd+B) | **Bold** |
| `Ctrl+I` (Cmd+I) | *Italic* |
| `Ctrl+U` (Cmd+U) | <u>Underline</u> |
| **B** button | **Bold** |
| **I** button | *Italic* |
| **U** button | <u>Underline</u> |
| **• List** button | - Bullet list |
| **H** button | ## Heading |

---

## 🏷️ Categories

| Category | Color | Use For |
|----------|-------|---------|
| Dashboards | Purple | Dashboard pages |
| APM | Blue | Tracing & services |
| Logs | Green | Log analysis |
| Infrastructure | Orange | Hosts, containers |
| RUM | Pink | Real user monitoring |
| Synthetics | Purple | Synthetic tests |
| Security | Red | Security monitoring |
| Monitors | Yellow | Alerts & monitors |
| Other | Gray | Everything else |

---

## ☑️ Bulk Actions

```
1. Check boxes on tracks you want to edit
2. Bulk actions bar appears
3. Choose action:
   - Change Category
   - Delete Selected
4. Deselect All when done
```

---

## 📤 Import/Export

### Export (Backup)
```
1. Click "Export" button
2. Save JSON file
3. Keep it safe!
```

### Import (Restore)
```
1. Click "Import" button
2. Select JSON file
3. Confirm to add tracks
```

**Note:** Import *adds* tracks, doesn't replace them!

---

## 🧪 Test URL Patterns

```
1. Paste URL in tester box
2. Click "Test"
3. Results show:
   ✅ Match found
   ⚠️ Multiple matches (conflict!)
   ❌ No match
```

---

## 📝 Track Fields

| Field | Required? | Purpose |
|-------|-----------|---------|
| **Title** | Optional | Quick identification |
| **Category** | Required | Organization |
| **URL Pattern** | Required | Which pages to match |
| **Content** | Optional | Your talk track notes |

---

## 🎯 URL Pattern Examples

```
*/dashboards/*              → All dashboard pages
*/apm/services              → APM services page exactly
*/logs*                     → Any page starting with /logs
*app.datadoghq.com/apm/*   → APM on specific domain
*/dashboard/abc-123-xyz     → Specific dashboard ID
```

**Tip:** More specific patterns should come first (drag to reorder)

---

## 💡 Pro Tips

1. **Export often** - It's your backup!
2. **Use descriptive titles** - Future you will thank you
3. **Categorize everything** - Makes filtering powerful
4. **Test your patterns** - Avoid conflicts
5. **Collapse when done** - Keep interface clean
6. **Drag to reorder** - Put important tracks first

---

## ⚡ Workflow Examples

### Starting Your Demo
```
1. Search: "intro"
2. Expand matching track
3. Review talk track
4. Close options page
5. Start demo!
```

### Adding New Demo
```
1. Click "+ Add New Talk Track"
2. Title: "New Feature Demo"
3. Category: APM
4. URL Pattern: */apm/new-feature*
5. Add talk track content
6. Save
```

### Organizing Existing Tracks
```
1. Export (backup)
2. Add titles to all tracks
3. Assign categories
4. Drag to reorder
5. Test URL patterns
6. Save
7. Export again
```

### Bulk Cleanup
```
1. Search: "old"
2. Select all results
3. Delete selected
4. Or change category
5. Save
```

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't find track | Check search/filter settings |
| Multiple matches | Use URL tester, make patterns specific |
| Tracks disappeared | Check if filtered, clear search |
| Lost changes | Import last export |
| Extension not working | Reload at chrome://extensions/ |

---

## 🎓 Learning Path

**Day 1:** Basic usage
- Add tracks
- Use search
- Save changes

**Day 2:** Organization
- Add titles
- Assign categories
- Try filtering

**Day 3:** Advanced
- Bulk actions
- Import/export
- URL testing

**Day 4:** Mastery
- Drag & drop
- Keyboard shortcuts
- Optimize workflow

---

## 📱 Quick Start Checklist

- [ ] Install extension
- [ ] Add first track with title
- [ ] Assign a category
- [ ] Test the URL pattern
- [ ] Add formatted content
- [ ] Save changes
- [ ] Export backup
- [ ] Test in popup window

---

## 🔗 More Resources

- **FEATURE-GUIDE.md** - Complete feature documentation
- **MIGRATION-GUIDE.md** - Upgrading from old version
- **MARKDOWN-EXAMPLES.md** - Formatting examples
- **QUICKSTART.md** - Getting started guide

---

**Print this page and keep it handy!** 📄

