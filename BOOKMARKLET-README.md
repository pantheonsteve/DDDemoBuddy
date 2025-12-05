# Datadog Demo Buddy - Bookmarklet Version

A simple bookmarklet tool that displays contextual talk tracks based on the current page URL. No browser extension installation required!

## Quick Start

1. **Open the configuration page:**
   - Open `bookmarklet.html` in your web browser
   - Or host it on any web server

2. **Install the bookmarklet:**
   - Make sure your bookmarks bar is visible (Cmd+Shift+B on Mac, Ctrl+Shift+B on Windows)
   - Drag the "📝 Datadog Demo Buddy" button to your bookmarks bar

3. **Configure your talk tracks:**
   - Add URL patterns and corresponding talk track content
   - Click "Save All Changes"

4. **Use it:**
   - Navigate to any page
   - Click the bookmarklet in your bookmarks bar
   - A side panel will appear with your talk track content
   - Click the × or click the bookmarklet again to close

## Features

✅ **No installation required** - Just a bookmarklet, works anywhere
✅ **Privacy-focused** - All data stored locally in your browser
✅ **Easy to configure** - Simple web interface
✅ **Pattern matching** - Use wildcards to match multiple URLs
✅ **Portable** - Works on any computer once you set it up

## URL Pattern Examples

- `*/dashboards/*` - Matches any URL containing "/dashboards/"
- `*/apm/services*` - Matches APM service pages
- `*datadoghq.com*` - Matches any Datadog page
- `*github.com/*/issues*` - Matches GitHub issues pages

## How It Works

1. Configuration is stored in your browser's localStorage
2. When you click the bookmarklet, it:
   - Reads your talk tracks from localStorage
   - Matches the current URL against your patterns
   - Displays the matching talk track in a side panel

## Usage Tips

- More specific patterns take precedence (checked in order)
- Use `*` as a wildcard to match any text
- Keep talk tracks concise for quick reference
- Test your patterns to ensure they match correctly

## Benefits over Extension

✅ Works on managed computers where extensions are blocked
✅ No corporate policy restrictions
✅ Instant setup - no approval needed
✅ Easy to share with team members
✅ No browser-specific limitations

## Sharing with Your Team

To share with others:
1. Host `bookmarklet.html` on a shared server or intranet
2. Or share the file via email/Slack
3. Everyone can set up their own talk tracks
4. Configuration is independent per user

## Technical Notes

- Uses localStorage for data persistence
- All code runs client-side
- No external dependencies
- Works in all modern browsers
- Panel positioned on right side of viewport

## Troubleshooting

**Bookmarklet doesn't work?**
- Make sure you dragged it to bookmarks (don't just click it on the config page)
- Try clicking it twice to toggle on/off

**Talk track not appearing?**
- Check that you saved your configuration
- Verify your URL pattern matches the current URL
- Look at the pattern examples and test with simpler patterns first

**Configuration lost?**
- localStorage is per-domain; if you move the config page, you'll need to reconfigure
- Consider bookmarking the config page URL

## Updates

To update the bookmarklet with new features:
1. Download the new `bookmarklet.html` file
2. Open it in your browser
3. Delete the old bookmarklet from your bookmarks bar
4. Drag the new one to your bookmarks bar
5. Your configuration will be preserved (stored in localStorage)

---

Enjoy your talk tracks! 🎯
