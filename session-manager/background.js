const STORAGE_KEYS = {
  SESSIONS: 'sessionManager_sessions',
  LAST_AUTO_SAVE: 'sessionManager_lastAutoSave'
};

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Session Manager extension installed:', details.reason);
  
  if (details.reason === 'install') {
    chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: []
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Session Manager: Browser started');
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    const tabs = await chrome.tabs.query({});
    const windows = await chrome.windows.getAll({});
    
    const validTabs = tabs.filter(tab => isValidUrl(tab.url));
    
    if (validTabs.length > 0) {
      await autoSaveSessionWithWindows(validTabs, windows);
    }
  } catch (error) {
    console.error('Auto-save error:', error);
  }
});

async function autoSaveSessionWithWindows(tabs, windows) {
  const timestamp = new Date();
  const name = `Auto-Save ${generateAutoName(timestamp)}`;
  
  const windowMap = new Map();
  windows.forEach(win => {
    windowMap.set(win.id, {
      id: win.id,
      tabs: []
    });
  });
  
  tabs.forEach(tab => {
    if (windowMap.has(tab.windowId)) {
      windowMap.get(tab.windowId).tabs.push({
        url: tab.url,
        title: tab.title || 'Untitled',
        domain: extractDomain(tab.url),
        favicon: `chrome://favicon/${tab.url}`,
        active: tab.active,
        pinned: tab.pinned
      });
    }
  });
  
  const windowsData = Array.from(windowMap.values())
    .filter(win => win.tabs.length > 0)
    .map(win => ({
      tabs: win.tabs
    }));
  
  const session = {
    id: crypto.randomUUID(),
    name: name,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
    autoSaved: true,
    windows: windowsData
  };
  
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
    let sessions = result[STORAGE_KEYS.SESSIONS] || [];
    
    const nonAutoSave = sessions.filter(s => !s.autoSaved);
    const autoSaves = sessions.filter(s => s.autoSaved)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);
    
    sessions = [...nonAutoSave, ...autoSaves, session];
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: sessions,
      [STORAGE_KEYS.LAST_AUTO_SAVE]: timestamp.toISOString()
    });
    
    const totalTabs = windowsData.reduce((sum, w) => sum + w.tabs.length, 0);
    console.log(`Session Manager: Auto-saved ${totalTabs} tabs in ${windowsData.length} window(s)`);
  } catch (error) {
    console.error('Failed to auto-save session:', error);
  }
}

function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    return domain;
  } catch {
    return 'unknown';
  }
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAutoSaveStatus') {
    chrome.storage.local.get(STORAGE_KEYS.LAST_AUTO_SAVE, (result) => {
      sendResponse({ 
        lastAutoSave: result[STORAGE_KEYS.LAST_AUTO_SAVE] 
      });
    });
    return true;
  }
  
  if (message.action === 'getAllSessions') {
    chrome.storage.local.get(STORAGE_KEYS.SESSIONS, (result) => {
      sendResponse({ 
        sessions: result[STORAGE_KEYS.SESSIONS] || [] 
      });
    });
    return true;
  }
});
