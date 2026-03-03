# Session Manager - Chrome Extension

A powerful Chrome extension for saving, managing, and restoring browser tab sessions with full control over tab selection and window organization.

## Features

### Current Tabs Management
- **View All Open Tabs**: See all open tabs across all windows in a grouped, scrollable list
- **Window Grouping**: Tabs are organized by their original windows
- **Tab Information**: Each tab shows favicon, page title, and domain name
- **Select/Unselect**: Click checkboxes or row to select/deselect individual tabs
- **Window Selection**: Use window-level checkboxes to select/deselect all tabs in a window
- **Bulk Selection**: Use "Select All" and "Deselect All" buttons for quick selection

### Session Saving
- **Save Current Selection**: Save selected tabs as a named session
- **Window Preservation**: Sessions are saved with their original window structure
- **Custom Names**: Provide your own session name or use auto-generated timestamp names
- **Auto-Save**: Automatically saves tabs when you close a browser window (keeps last 5 auto-saves)
- **Persistent Storage**: Sessions are stored in `chrome.storage.local` and persist across browser restarts

### Session Management
- **View Saved Sessions**: See all saved sessions with date, tab count, and window count
- **Open in New Window**: Restore a session with each original window as a separate window
- **Open in Current Window**: Add session tabs to your current window
- **Delete Sessions**: Remove unwanted sessions
- **Export Sessions**: Export single or multiple sessions as JSON files
- **Import Sessions**: Import sessions from previously exported JSON files

### Backward Compatibility
- Supports importing sessions from old export files (pre-window structure)
- Automatically converts old format to new window-based format on import

## Installation

### Development Mode (Local)
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle in the top-right corner
3. Click "Load unpacked"
4. Select the `session-manager` folder
5. The extension icon will appear in your Chrome toolbar

### Create Icons
Before loading, you'll need to add icon images to the `icons` folder:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

You can use any image editing tool to create these, or generate them from an online favicon generator.

## Usage

### Saving a Session
1. Click the Session Manager extension icon
2. Tabs are displayed grouped by their windows
3. Select the tabs you want to save (all are selected by default)
   - Click window checkbox to select/deselect all tabs in that window
   - Click individual tab checkbox to select/deselect that tab
   - Click "Select All" to select all tabs across all windows
4. Click "Save Selected"
5. Enter a session name or leave blank for auto-generated name
6. Click "Save"

### Opening a Session
1. Click the Session Manager extension icon
2. Scroll down to "Saved Sessions"
3. Click "New" to open all windows in new windows
4. Click "Curr" to add all tabs to current window

### Exporting Sessions
- **Single Session**: Click "Exp" button on a session
- **All Sessions**: Click "Export All" button

Sessions are exported as JSON files containing the window structure.

### Importing Sessions
1. Click "Import" button in the header
2. Select a JSON file exported from Session Manager
3. Review the preview (shows session count and window breakdown)
4. Click "Import Sessions"

## Data Storage

### Storage Persistence
Data stored in `chrome.storage.local` is:
- ✅ Persisted across browser restarts
- ✅ Available offline
- ✅ Synced to Google Account (if signed in and sync enabled)
- ❌ Not cleared when browser closes

### Storage Structure
```javascript
{
  sessionManager_sessions: [
    {
      id: "uuid",
      name: "Session Name",
      createdAt: "2024-01-15T10:30:00.000Z",
      windows: [
        {
          tabs: [
            {
              url: "https://example.com",
              title: "Example Page",
              domain: "example.com",
              favicon: "chrome://favicon/https://example.com",
              active: false,
              pinned: false
            }
          ]
        }
      ]
    }
  ]
}
```

### Export File Format
```javascript
{
  version: "1.0",
  exportedAt: "2024-01-15T10:30:00.000Z",
  sessions: [ /* Session objects with windows */ ]
}
```

## Auto-Save Feature

The extension automatically saves your tabs when you close a browser window:
- Triggered by `chrome.windows.onRemoved` event
- Only saves valid HTTP/HTTPS URLs
- Preserves window structure (tabs grouped by original windows)
- Names formatted as "Auto-Save Session - Jan 15 2024 10:30 AM"
- Keeps only the last 5 auto-saved sessions
- Marked with "(Auto)" indicator in the UI

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Access tab URLs, titles, and window information |
| `storage` | Save and retrieve sessions locally |

## Chrome APIs Used

- `chrome.tabs.query()` - Get all open tabs
- `chrome.tabs.create()` - Create new tabs
- `chrome.windows.create()` - Create new windows
- `chrome.windows.getAll()` - Get all windows for grouping
- `chrome.storage.local.get/set` - Store and retrieve data
- `chrome.windows.onRemoved` - Detect window close for auto-save
- `chrome.runtime.onMessage` - Communication between popup and background

## File Structure

```
session-manager/
├── manifest.json        # Extension manifest (V3)
├── popup.html           # Main popup UI
├── popup.css            # Popup styling
├── popup.js             # Main application logic
├── background.js        # Background service worker (auto-save)
├── import.html          # Import page UI
├── import.js            # Import functionality
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── DESIGN.md            # Detailed design document
└── README.md            # This file
```

## Troubleshooting

### Extension not loading
- Make sure "Developer mode" is enabled
- Check for any errors in the console
- Verify all required files are in place

### Sessions not saving
- Check Chrome storage quota (limited to ~5MB)
- Verify URL is valid (http/https only)

### Auto-save not working
- Ensure extension has proper permissions
- Auto-save only triggers when a window is closed, not just a tab

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Initial | All core features with window support |

## License

MIT License
