# Quick Start Guide

## Step 1: Load the Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Toggle **Developer mode** ON (top right corner)
4. Click **Load unpacked**
5. Navigate to and select the `demoextension` folder
6. The extension should now appear in your extensions list

## Step 2: Pin the Extension (Recommended)

1. Click the puzzle piece icon in Chrome's toolbar
2. Find "Datadog Demo Buddy"
3. Click the pin icon to keep it visible

## Step 3: Configure Your First Talk Track

1. Right-click the extension icon → **Options**
2. In the URL Pattern field, enter: `*/dashboards/*`
3. In the Talk Track Content field, enter (using Markdown formatting):

```markdown
# Dashboard Overview

## Key Points
- **Real-time metrics** - Updates every second
- *Customizable widgets* - Drag and drop
- Time range selector (top right)

> Start with: "Welcome to our main dashboard..."
```

4. Click **Save All Changes**

**✨ Pro Tip:** The extension supports full Markdown formatting! Use `**bold**`, `*italic*`, lists, headings, and more.

## Step 4: Test It Out

1. Navigate to any Datadog dashboard page
2. Click the Datadog Demo Buddy extension icon
3. A popup window will open showing your formatted talk track
4. Navigate to different pages to see the window update automatically
5. Position the window where you can reference it during demos

## Step 5: Add More Talk Tracks

1. Go back to Options
2. Click **+ Add New Talk Track**
3. Add patterns for different pages:
   - `*/apm/services*` for APM pages
   - `*/infrastructure*` for infrastructure pages
   - `*/monitors*` for monitors pages

## Tips for Success

✅ **Test your patterns** - Make sure they match the URLs you visit

✅ **Be specific** - More specific patterns (like `*/dashboard/my-dashboard-id*`) take precedence

✅ **Use wildcards** - The `*` matches any text in that position

✅ **Use Markdown** - Format with **bold**, *italic*, lists, and headings for easy reading

✅ **Keep it concise** - You want quick reference notes, not full paragraphs

✅ **Save often** - Click Save after making changes

✅ **Hide when sharing** - Position the popup window outside your screen share area

## Troubleshooting

**Popup window not opening?**
- Make sure you're on a *.datadoghq.com page
- Check that the extension is enabled
- If already open, clicking the icon will focus the existing window

**Talk track not showing?**
- Verify your URL pattern matches the current URL
- Check the current URL in the window header
- Make sure you clicked Save

**Changes not appearing?**
- Refresh the extension: go to chrome://extensions/ and click the refresh icon
- Reload the Datadog page

**Want to learn more about Markdown?**
- Check out `MARKDOWN-EXAMPLES.md` for comprehensive examples
- See the Options page for quick Markdown reference

Happy presenting! 🎯
