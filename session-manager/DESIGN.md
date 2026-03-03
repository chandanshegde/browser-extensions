# Chrome Extension: Session Manager - Design & Implementation Document

## Table of Contents
1. [Overview](#overview)
2. [Chrome Extension Fundamentals](#chrome-extension-fundamentals)
3. [Project Structure](#project-structure)
4. [File Specifications](#file-specifications)
5. [Data Structures](#data-structures)
6. [Chrome APIs & JavaScript Functions](#chrome-apis--javascript-functions)
7. [Core Features Implementation](#core-features-implementation)
8. [UI/UX Design](#uiux-design)
9. [Storage Implementation](#storage-implementation)
10. [Event Handling](#event-handling)
11. [Error Handling](#error-handling)

---

## Overview

**Extension Name:** Session Manager  
**Purpose:** Save, manage, and restore browser tab sessions with full control over tab selection  
**Target Users:** Power users who work with multiple tabs and need session management  
**Manifest Version:** V3 (Manifest V3 is the current standard)

---

## Chrome Extension Fundamentals

### What is a Chrome Extension?
A Chrome extension is a collection of files that enhances browser functionality. It can:
- Add new features to Chrome
- Modify web page content
- Change browser behavior

### Required Components for Chrome Extension Development:

1. **manifest.json** - Required manifest file that defines extension properties, permissions, and components
2. **HTML files** - Popup UI, options page, or background pages
3. **JavaScript files** - Logic for extension functionality
4. **CSS files** - Styling for UI components
5. **Icons** - Extension icons (16x16, 48x48, 128x128 pixels)
6. **Other assets** - Images, fonts, etc. (optional)

### Extension Loading Process:
1. Chrome loads manifest.json
2. Permissions are requested and granted
3. Background scripts/workers are initialized
4. Browser action popup is ready to display
5. Event listeners are registered

---

## Project Structure

```
session-manager/
├── manifest.json           # Extension manifest (required)
├── popup.html              # Main popup UI
├── popup.css               # Popup styling
├── popup.js                # Popup logic (main functionality)
├── background.js           # Background script (auto-save, event handling)
├── import.html             # Import sessions UI
├── import.js               # Import functionality
├── icons/
│   ├── icon16.png          # 16x16 icon
│   ├── icon48.png          # 48x48 icon
│   └── icon128.png         # 128x128 icon
├── DESIGN.md               # This document
└── README.md               # Usage instructions
```

---

## File Specifications

### 1. manifest.json
- **Purpose:** Defines extension metadata, permissions, and components
- **Key properties:**
  - `manifest_version`: 3 (V3 is current standard)
  - `name`: Extension name
  - `version`: Version number
  - `description`: Brief description
  - `permissions`: Required permissions array
  - `action`: Popup configuration
  - `background`: Service worker configuration

### 2. popup.html
- **Purpose:** Main user interface for the extension
- **Components:**
  - Header with title and action buttons
  - Tab list container (scrollable)
  - Session name input modal
  - Saved sessions panel
  - Footer with action buttons

### 3. popup.css
- **Purpose:** Styling for popup UI
- **Key styles:**
  - CSS variables for theming
  - Scrollable list with max-height
  - Flexbox layout for tab items
  - Modal styling for inputs
  - Button states and hover effects

### 4. popup.js
- **Purpose:** Main application logic
- **Functions:**
  - Tab loading and rendering
  - Selection management
  - Session saving/loading
  - Export functionality
  - UI interactions

### 5. background.js
- **Purpose:** Background service worker for events
- **Functions:**
  - Auto-save on browser close
  - Tab update listeners
  - Session persistence

### 6. import.html & import.js
- **Purpose:** Import sessions from JSON files
- **Functions:**
  - File input handling
  - JSON parsing and validation
  - Session merging

---

## Data Structures

### Session Object with Windows (Updated)
```javascript
{
  id: string,           // UUID unique identifier
  name: string,         // User-defined or auto-generated name
  createdAt: string,    // ISO 8601 date string
  updatedAt: string,    // ISO 8601 date string
  windows: [            // Array of window objects
    {
      id: number,       // Chrome window ID
      tabs: [           // Array of tab objects in this window
        {
          id: number,   // Chrome tab ID
          url: string,  // Full URL
          title: string, // Page title
          domain: string, // Extracted domain
          favicon: string, // Favicon URL
          active: boolean, // Whether tab was active
          pinned: boolean  // Whether tab was pinned
        }
      ]
    }
  ]
}
```

### Exported Sessions File (Multiple Sessions with Windows)
```javascript
{
  version: string,      // Format version "1.0"
  exportedAt: string,   // ISO 8601 date string
  sessions: [           // Array of session objects
    { /* Session Object with Windows */ },
    { /* Session Object with Windows */ }
  ]
}
  ]
}
```

### Exported Sessions File (Multiple Sessions)
```javascript
{
  version: string,      // Format version "1.0"
  exportedAt: string,   // ISO 8601 date string
  sessions: [           // Array of session objects
    { /* Session Object */ },
    { /* Session Object */ }
  ]
}
```

### Storage Keys
```javascript
const STORAGE_KEYS = {
  SESSIONS: 'sessionManager_sessions',      // All saved sessions
  CURRENT_SELECTION: 'sessionManager_selection',  // Current tab selection
  SETTINGS: 'sessionManager_settings',     // Extension settings
  LAST_AUTO_SAVE: 'sessionManager_lastAutoSave'   // Last auto-save timestamp
};
```

### Tab Selection State
```javascript
{
  tabId: {
    url: string,
    title: string,
    domain: string,
    selected: boolean
  }
}
```

---

## Chrome APIs & JavaScript Functions

### Chrome Tab APIs

| Function | Description | Usage in Extension |
|----------|-------------|---------------------|
| `chrome.tabs.query(queryInfo)` | Get tabs matching criteria | Load all open tabs across windows |
| `chrome.tabs.create(createProperties)` | Create new tab | Restore session tabs |
| `chrome.tabs.remove(tabIds)` | Close tabs | Optional: close tabs when restoring |
| `chrome.tabs.update(tabId, updateProperties)` | Update tab properties | Update tab after creation |
| `chrome.tabs.get(tabId)` | Get tab details | Get individual tab info |
| `chrome.tabs.reload(tabIds)` | Reload tabs | Optional: refresh on restore |

### Chrome Window APIs

| Function | Description | Usage in Extension |
|----------|-------------|---------------------|
| `chrome.windows.create(createData)` | Create new window | Open session in new window |
| `chrome.windows.get(windowId)` | Get window details | Get window info |
| `chrome.windows.update(windowId, updateData)` | Update window | Focus existing window |

### Chrome Storage APIs

| Function | Description | Usage in Extension |
|----------|-------------|---------------------|
| `chrome.storage.local.get([keys], callback)` | Get stored data | Load sessions |
| `chrome.storage.local.set({key: value}, callback)` | Store data | Save sessions |
| `chrome.storage.local.remove([keys], callback)` | Remove stored data | Delete sessions |

### Chrome Runtime APIs

| Function | Description | Usage in Extension |
|----------|-------------|---------------------|
| `chrome.runtime.lastError` | Check for errors | Error handling |
| `chrome.runtime.getManifest()` | Get manifest | Version info |
| `chrome.runtime.sendMessage()` | Send to background | Cross-script communication |

### Chrome Event APIs

| Event | Description | Usage in Extension |
|-------|-------------|---------------------|
| `chrome.tabs.onCreated` | New tab created | Update tab list |
| `chrome.tabs.onRemoved` | Tab closed | Update tab list |
| `chrome.tabs.onUpdated` | Tab updated | Update tab info |
| `chrome.windows.onCreated` | Window created | Update window list |
| `chrome.windows.onRemoved` | Window closed | Handle browser close |
| `chrome.runtime.onMessage` | Message received | Background-popup communication |

### Standard JavaScript Functions Used

| Function | Description |
|----------|-------------|
| `URL()` constructor | Parse and extract domain from URL |
| `JSON.stringify()` | Convert objects to JSON for storage/export |
| `JSON.parse()` | Parse imported JSON files |
| `Blob()` | Create file for download |
| `URL.createObjectURL()` | Create download URL for blob |
| `document.createEvent()` / `new Event()` | Create custom events |
| `Array.filter()` | Filter selected tabs |
| `Array.map()` | Transform tab data |
| `Array.reduce()` | Aggregate session data |
| `Date.toISOString()` | Generate ISO dates |
| `crypto.randomUUID()` | Generate unique IDs |

---

## Core Features Implementation

### Feature 1: Get All Open Tabs Across Windows

**Implementation:**
```javascript
async function loadAllTabs() {
  const tabs = await chrome.tabs.query({});
  // Returns all tabs across all windows
  
  const tabData = tabs.map(tab => ({
    id: tab.id,
    url: tab.url,
    title: tab.title,
    domain: new URL(tab.url).hostname,
    favicon: `chrome://favicon/${tab.url}`,
    active: tab.active,
    pinned: tab.pinned
  }));
  
  return tabData;
}
```

**Internal Flow:**
1. Call `chrome.tabs.query({})` with empty queryInfo to get all tabs
2. Map each tab to extract relevant data (URL, title, domain)
3. Generate favicon URL using `chrome://favicon/` protocol
4. Return array of tab objects

**Error Handling:**
- Handle tabs with invalid URLs (about:blank, chrome:// URLs)
- Filter out chrome:// URLs that cannot be restored

---

### Feature 2: Display Tabs in Scrollable List View

**Implementation:**
```javascript
function renderTabsList(tabs) {
  const container = document.getElementById('tabs-list');
  container.innerHTML = '';
  
  tabs.forEach(tab => {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab-item';
    tabElement.dataset.tabId = tab.id;
    
    tabElement.innerHTML = `
      <input type="checkbox" class="tab-checkbox" ${tab.selected ? 'checked' : ''}>
      <img class="tab-favicon" src="${tab.favicon}" onerror="this.src='default-icon.png'">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-domain">${tab.domain}</div>
      </div>
    `;
    
    container.appendChild(tabElement);
  });
}
```

**UI Components:**
- Checkbox for selection
- Favicon image (with fallback)
- Tab title (truncated with ellipsis)
- Domain name
- Hover tooltip with full URL

**CSS Styling:**
```css
.tabs-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tab-item:hover {
  background-color: #f5f5f5;
}

.tab-item.selected {
  background-color: #e3f2fd;
}
```

---

### Feature 3: Select/Unselect Tabs

**Implementation:**
```javascript
function setupSelectionHandlers() {
  const container = document.getElementById('tabs-list');
  
  // Event delegation for checkbox clicks
  container.addEventListener('change', (e) => {
    if (e.target.classList.contains('tab-checkbox')) {
      const tabItem = e.target.closest('.tab-item');
      const tabId = parseInt(tabItem.dataset.tabId);
      toggleTabSelection(tabId, e.target.checked);
    }
  });
  
  // Click on row to toggle selection
  container.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-checkbox')) {
      const tabItem = e.target.closest('.tab-item');
      const checkbox = tabItem.querySelector('.tab-checkbox');
      checkbox.checked = !checkbox.checked;
      const tabId = parseInt(tabItem.dataset.tabId);
      toggleTabSelection(tabId, checkbox.checked);
    }
  });
}

function toggleTabSelection(tabId, isSelected) {
  const tab = allTabs.find(t => t.id === tabId);
  if (tab) {
    tab.selected = isSelected;
    const tabItem = document.querySelector(`[data-tab-id="${tabId}"]`);
    tabItem.classList.toggle('selected', isSelected);
    updateSelectedCount();
  }
}
```

**Selection Actions:**
- Click checkbox to toggle single selection
- Click row to toggle selection
- "Select All" button to select all tabs
- "Deselect All" button to clear all selections

---

### Feature 4: Save Session with Custom Name

**Implementation:**
```javascript
async function saveSession(sessionName = null) {
  const selectedTabs = allTabs.filter(tab => tab.selected);
  
  if (selectedTabs.length === 0) {
    showMessage('No tabs selected', 'error');
    return;
  }
  
  const timestamp = new Date();
  const name = sessionName || generateAutoName(timestamp);
  
  const session = {
    id: crypto.randomUUID(),
    name: name,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
    tabs: selectedTabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      domain: tab.domain,
      favicon: tab.favicon,
      active: tab.active,
      pinned: tab.pinned
    }))
  };
  
  // Get existing sessions
  const sessions = await getStoredSessions();
  sessions.push(session);
  
  // Save to storage
  await chrome.storage.local.set({
    [STORAGE_KEYS.SESSIONS]: sessions
  });
  
  showMessage(`Saved "${name}" with ${selectedTabs.length} tabs`, 'success');
}

function generateAutoName(date) {
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `Session - ${dateStr} ${timeStr}`;
}
```

**Internal Flow:**
1. Filter tabs that are selected
2. Generate session name (user-provided or auto-generated)
3. Create session object with unique ID and timestamps
4. Map selected tabs to session tab format
5. Get existing sessions from storage
6. Add new session to array
7. Save to chrome.storage.local

---

### Feature 5: View Saved Sessions

**Implementation:**
```javascript
async function loadAndRenderSessions() {
  const sessions = await getStoredSessions();
  
  const sessionsList = document.getElementById('sessions-list');
  sessionsList.innerHTML = '';
  
  sessions.forEach(session => {
    const sessionElement = document.createElement('div');
    sessionElement.className = 'session-item';
    sessionElement.dataset.sessionId = session.id;
    
    const date = new Date(session.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    sessionElement.innerHTML = `
      <div class="session-info">
        <div class="session-name">${escapeHtml(session.name)}</div>
        <div class="session-meta">
          <span class="session-date">${formattedDate}</span>
          <span class="session-count">${session.tabs.length} tabs</span>
        </div>
      </div>
      <div class="session-actions">
        <button class="btn-open-new" title="Open in New Window">New Window</button>
        <button class="btn-open-current" title="Open in Current Window">Current</button>
        <button class="btn-export" title="Export Session">Export</button>
        <button class="btn-delete" title="Delete Session">Delete</button>
      </div>
    `;
    
    sessionsList.appendChild(sessionElement);
  });
}
```

**Session Display:**
- Session name (bold)
- Creation date and time
- Number of tabs in session
- Action buttons (Open New, Open Current, Export, Delete)

---

### Feature 6: Open Session in New Window

**Implementation:**
```javascript
async function openSessionInNewWindow(sessionId) {
  const sessions = await getStoredSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session || session.tabs.length === 0) {
    showMessage('No tabs in session', 'error');
    return;
  }
  
  // Create new window with first tab
  const firstTab = session.tabs[0];
  const window = await chrome.windows.create({
    url: firstTab.url,
    focused: true
  });
  
  // Add remaining tabs
  const remainingTabs = session.tabs.slice(1);
  for (const tab of remainingTabs) {
    await chrome.tabs.create({
      windowId: window.id,
      url: tab.url,
      pinned: tab.pinned || false
    });
  }
  
  showMessage(`Opened ${session.tabs.length} tabs in new window`, 'success');
}
```

**Internal Flow:**
1. Retrieve session from storage
2. Create new window with first tab using `chrome.windows.create()`
3. Add remaining tabs using `chrome.tabs.create()` with windowId
4. Handle pinned tabs preservation
5. Show success message

---

### Feature 7: Open Session in Current Window

**Implementation:**
```javascript
async function openSessionInCurrentWindow(sessionId) {
  const sessions = await getStoredSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session || session.tabs.length === 0) {
    showMessage('No tabs in session', 'error');
    return;
  }
  
  // Get current window
  const [currentWindow] = await chrome.windows.getCurrent();
  
  // Create all tabs in current window
  for (const tab of session.tabs) {
    await chrome.tabs.create({
      windowId: currentWindow.id,
      url: tab.url,
      pinned: tab.pinned || false,
      active: false
    });
  }
  
  showMessage(`Added ${session.tabs.length} tabs to current window`, 'success');
}
```

---

### Feature 8: Delete Session

**Implementation:**
```javascript
async function deleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) {
    return;
  }
  
  const sessions = await getStoredSessions();
  const filteredSessions = sessions.filter(s => s.id !== sessionId);
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.SESSIONS]: filteredSessions
  });
  
  await loadAndRenderSessions();
  showMessage('Session deleted', 'success');
}
```

---

### Feature 9: Export Sessions to JSON File

**Implementation:**
```javascript
async function exportSessions(sessionIds = null) {
  let sessions;
  
  if (sessionIds) {
    // Export specific sessions
    const allSessions = await getStoredSessions();
    sessions = allSessions.filter(s => sessionIds.includes(s.id));
  } else {
    // Export all sessions
    sessions = await getStoredSessions();
  }
  
  if (sessions.length === 0) {
    showMessage('No sessions to export', 'error');
    return;
  }
  
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sessions: sessions
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `sessions-export-${timestamp}.json`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showMessage(`Exported ${sessions.length} session(s)`, 'success');
}
```

**Export File Structure:**
```json
{
  "version": "1.0",
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "sessions": [
    {
      "id": "uuid-1",
      "name": "Work Session",
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T09:00:00.000Z",
      "tabs": [
        {
          "url": "https://example.com",
          "title": "Example",
          "domain": "example.com",
          "favicon": "chrome://favicon/https://example.com",
          "active": false,
          "pinned": false
        }
      ]
    }
  ]
}
```

---

### Feature 10: Import Sessions from JSON File

**Implementation:**
```javascript
async function importSessions(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validate structure
        if (!validateImportData(data)) {
          throw new Error('Invalid file format');
        }
        
        const sessions = await getStoredSessions();
        const importedSessions = data.sessions.map(session => ({
          ...session,
          id: crypto.randomUUID(), // Generate new IDs
          importedAt: new Date().toISOString(),
          originalId: session.id // Keep reference to original
        }));
        
        // Merge with existing sessions
        const mergedSessions = [...sessions, ...importedSessions];
        
        await chrome.storage.local.set({
          [STORAGE_KEYS.SESSIONS]: mergedSessions
        });
        
        resolve(importedSessions.length);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function validateImportData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.version || !data.sessions) return false;
  if (!Array.isArray(data.sessions)) return false;
  
  for (const session of data.sessions) {
    if (!session.name || !session.tabs || !Array.isArray(session.tabs)) {
      return false;
    }
  }
  
  return true;
}
```

---

### Feature 11: Auto-Save on Browser Close

**Implementation (background.js):**
```javascript
// Listen for window close
chrome.windows.onRemoved.addListener(async (windowId) => {
  // Get all remaining tabs after window closes
  const tabs = await chrome.tabs.query({});
  
  if (tabs.length > 0) {
    await autoSaveSession(tabs);
  }
});

async function autoSaveSession(tabs) {
  const timestamp = new Date();
  const name = `Auto-Save ${generateAutoName(timestamp)}`;
  
  const session = {
    id: crypto.randomUUID(),
    name: name,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
    autoSaved: true,
    tabs: tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      domain: new URL(tab.url).hostname,
      favicon: `chrome://favicon/${tab.url}`,
      active: tab.active,
      pinned: tab.pinned
    })).filter(tab => isValidUrl(tab.url))
  };
  
  // Get existing sessions
  const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
  const sessions = result[STORAGE_KEYS.SESSIONS] || [];
  
  // Remove old auto-saves (keep last 5)
  const nonAutoSave = sessions.filter(s => !s.autoSaved);
  const autoSaves = sessions.filter(s => s.autoSaved)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);
  
  const mergedSessions = [...nonAutoSave, ...autoSaves, session];
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.SESSIONS]: mergedSessions,
    [STORAGE_KEYS.LAST_AUTO_SAVE]: timestamp.toISOString()
  });
  
  console.log(`Auto-saved ${session.tabs.length} tabs`);
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

**Auto-Save Behavior:**
- Triggers when any window is closed
- Only saves valid http/https URLs
- Names with "Auto-Save" prefix
- Keeps only last 5 auto-saved sessions
- Marks sessions as `autoSaved: true`

---

### Feature 12: Domain Extraction

**Implementation:**
```javascript
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    
    // Remove www. prefix
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    return domain;
  } catch {
    return 'unknown';
  }
}
```

---

## UI/UX Design

### Color Palette
```css
:root {
  --primary-color: #4285f4;
  --primary-hover: #3367d6;
  --success-color: #34a853;
  --error-color: #ea4335;
  --warning-color: #fbbc04;
  --background: #ffffff;
  --surface: #f8f9fa;
  --border: #dadce0;
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --hover-bg: #f1f3f4;
  --selected-bg: #e8f0fe;
}
```

### Layout Structure
```
+------------------------------------------+
|  Session Manager                    [X] |
+------------------------------------------+
|  [Save Current Session]  [Import]       |
+------------------------------------------+
|  Currently Open Tabs (15)               |
|  [Select All] [Deselect All]            |
|  +--------------------------------------+|
|  | [✓] 🔗 | Title          | domain.com ||
|  | [✓] 🔗 | Another Title  | other.com  ||
|  | [ ] 🔗 | Third Title    | third.com  ||
|  | ...                                  ||
|  +--------------------------------------+|
+------------------------------------------+
|  Selected: 2 tabs                        |
|  [Save Selected as Session]              |
|  [Open in New Window] [Open Current]     |
+------------------------------------------+
|  Saved Sessions                    [Export All]|
|  +--------------------------------------+|
|  | Session Name    | Jan 15 10:30 | 5 ||
|  | [New][Cur][Exp][Del]               ||
|  +--------------------------------------+|
+------------------------------------------+
```

### Modal for Session Name Input
```
+------------------------------------------+
|  Save Session                            |
+------------------------------------------+
|  Session Name: [________________]        |
|  (Leave empty for auto-generated name)  |
|                                          |
|  [Cancel]              [Save]            |
+------------------------------------------+
```

---

## Storage Implementation

### Storage Persistence
 `chrome.storage.local` IS persisted across browser close/open cycles. Data stored in `chrome.storage.local` is:
- Persisted across browser restarts
- Synced to user's Google account (if signed in and sync enabled)
- Available offline
- Not cleared when browser closes (unlike sessionStorage)

### Storage Operations
```javascript
// Get sessions
async function getStoredSessions() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
  return result[STORAGE_KEYS.SESSIONS] || [];
}

// Save sessions
async function saveToStorage(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Clear all data
async function clearAllData() {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}
```

---

## Event Handling

### Background Script Events
```javascript
// Service worker lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started');
});

// Tab events
chrome.tabs.onCreated.addListener((tab) => {
  console.log('Tab created:', tab.id);
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Tab removed:', tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    console.log('Tab URL changed:', tabId, changeInfo.url);
  }
});

// Window events
chrome.windows.onCreated.addListener((window) => {
  console.log('Window created:', window.id);
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  // Trigger auto-save when any window closes
  await handleWindowClose();
});
```

### Popup Communication
```javascript
// From popup to background
chrome.runtime.sendMessage({
  action: 'getAutoSaveStatus'
}, (response) => {
  console.log('Auto-save status:', response);
});

// In background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAutoSaveStatus') {
    chrome.storage.local.get(STORAGE_KEYS.LAST_AUTO_SAVE, (result) => {
      sendResponse({ lastAutoSave: result[STORAGE_KEYS.LAST_AUTO_SAVE] });
    });
    return true; // Keep message channel open for async response
  }
});
```

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `chrome.runtime.lastError` | API call failed | Check error message, handle gracefully |
| `Invalid URL` | Tab has non-http URL | Filter out chrome://, about:, etc. |
| `Storage quota exceeded` | Too much data | Implement session limits, cleanup |
| `File read error` | Invalid JSON | Validate before parsing |
| `Tab creation failed` | Window closed | Add try-catch, retry logic |

### Error Handling Pattern
```javascript
async function safeTabOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    console.error('Tab operation failed:', error);
    showMessage('Operation failed. Please try again.', 'error');
    return null;
  }
}

// Usage
await safeTabOperation(() => chrome.tabs.create({ url: tab.url }));
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Initial | Initial release with all features |
