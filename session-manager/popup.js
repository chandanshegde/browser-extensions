const STORAGE_KEYS = {
  SESSIONS: 'sessionManager_sessions',
  CURRENT_SELECTION: 'sessionManager_selection',
  SETTINGS: 'sessionManager_settings',
  LAST_AUTO_SAVE: 'sessionManager_lastAutoSave'
};

let allWindows = [];
let selectedSessionIds = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadAllTabsByWindow();
  setupEventListeners();
  await loadAndRenderSessions();
}

async function loadAllTabsByWindow() {
  try {
    const tabs = await chrome.tabs.query({});
    const windows = await chrome.windows.getAll({});
    
    const windowMap = new Map();
    windows.forEach(win => {
      windowMap.set(win.id, {
        id: win.id,
        focused: win.focused,
        tabs: []
      });
    });
    
    tabs
      .filter(tab => isValidUrl(tab.url))
      .forEach(tab => {
        const windowData = windowMap.get(tab.windowId);
        if (windowData) {
          windowData.tabs.push({
            id: tab.id,
            url: tab.url,
            title: tab.title || 'Untitled',
            domain: extractDomain(tab.url),
            favicon: `chrome://favicon/${tab.url}`,
            active: tab.active,
            pinned: tab.pinned,
            selected: true
          });
        }
      });
    
    allWindows = Array.from(windowMap.values()).filter(win => win.tabs.length > 0);
    
    renderWindowsList();
    updateSelectedCount();
  } catch (error) {
    console.error('Error loading tabs:', error);
    showMessage('Failed to load tabs', 'error');
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

function renderWindowsList() {
  const container = document.getElementById('tabs-list');
  const tabCountEl = document.getElementById('tab-count');
  
  const totalTabs = allWindows.reduce((sum, win) => sum + win.tabs.length, 0);
  tabCountEl.textContent = `${totalTabs} tabs in ${allWindows.length} window(s)`;
  
  if (allWindows.length === 0) {
    container.innerHTML = '<div class="empty-state">No open tabs</div>';
    return;
  }
  
  container.innerHTML = allWindows.map((window, winIndex) => `
    <div class="window-group" data-window-id="${window.id}">
      <div class="window-header">
        <input type="checkbox" class="window-checkbox" checked data-window-index="${winIndex}">
        <span class="window-label">Window ${winIndex + 1}</span>
        <span class="window-tab-count">${window.tabs.length} tabs</span>
      </div>
      <div class="window-tabs">
        ${window.tabs.map(tab => `
          <div class="tab-item ${tab.selected ? 'selected' : ''}" data-tab-id="${tab.id}" data-window-index="${winIndex}">
            <input type="checkbox" class="tab-checkbox" ${tab.selected ? 'checked' : ''} data-window-index="${winIndex}" data-tab-index="${window.tabs.indexOf(tab)}">
            <img class="tab-favicon" src="${tab.favicon}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23dadce0%22 width=%2216%22 height=%2216%22 rx=%222%22/><text x=%228%22 y=%2212%22 text-anchor=%22middle%22 font-size=%2210%22 fill=%22%235f6368%22>?</text></svg>'" title="${escapeHtml(tab.url)}">
            <div class="tab-info">
              <div class="tab-title" title="${escapeHtml(tab.title)}">${escapeHtml(tab.title)}</div>
              <div class="tab-domain">${escapeHtml(tab.domain)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function setupEventListeners() {
  document.getElementById('btn-refresh').addEventListener('click', async () => {
    await loadAllTabsByWindow();
    showMessage('Tabs refreshed', 'success');
  });
  
  document.getElementById('btn-select-all').addEventListener('click', () => {
    allWindows.forEach(win => {
      win.tabs.forEach(tab => tab.selected = true);
    });
    renderWindowsList();
    updateSelectedCount();
  });
  
  document.getElementById('btn-deselect-all').addEventListener('click', () => {
    allWindows.forEach(win => {
      win.tabs.forEach(tab => tab.selected = false);
    });
    renderWindowsList();
    updateSelectedCount();
  });
  
  document.getElementById('tabs-list').addEventListener('change', (e) => {
    const target = e.target;
    
    if (target.classList.contains('window-checkbox')) {
      const winIndex = parseInt(target.dataset.windowIndex);
      const isChecked = target.checked;
      allWindows[winIndex].tabs.forEach(tab => tab.selected = isChecked);
      renderWindowsList();
      updateSelectedCount();
      return;
    }
    
    if (target.classList.contains('tab-checkbox')) {
      const winIndex = parseInt(target.dataset.windowIndex);
      const tabIndex = parseInt(target.dataset.tabIndex);
      const tab = allWindows[winIndex].tabs[tabIndex];
      if (tab) {
        tab.selected = target.checked;
        const tabItem = target.closest('.tab-item');
        tabItem.classList.toggle('selected', target.checked);
        updateWindowCheckbox(winIndex);
        updateSelectedCount();
      }
    }
  });
  
  document.getElementById('tabs-list').addEventListener('click', (e) => {
    const target = e.target;
    
    if (target.closest('.window-header') && !target.classList.contains('window-checkbox')) {
      const winHeader = target.closest('.window-header');
      const checkbox = winHeader.querySelector('.window-checkbox');
      const winIndex = parseInt(checkbox.dataset.windowIndex);
      const allSelected = allWindows[winIndex].tabs.every(t => t.selected);
      allWindows[winIndex].tabs.forEach(tab => tab.selected = !allSelected);
      renderWindowsList();
      updateSelectedCount();
      return;
    }
    
    if (!target.classList.contains('tab-checkbox') && !target.classList.contains('tab-favicon')) {
      const tabItem = target.closest('.tab-item');
      if (tabItem) {
        const winIndex = parseInt(tabItem.dataset.windowIndex);
        const tabIndex = parseInt(tabItem.dataset.tabIndex);
        const tab = allWindows[winIndex].tabs[tabIndex];
        if (tab) {
          tab.selected = !tab.selected;
          const checkbox = tabItem.querySelector('.tab-checkbox');
          checkbox.checked = tab.selected;
          tabItem.classList.toggle('selected', tab.selected);
          updateWindowCheckbox(winIndex);
          updateSelectedCount();
        }
      }
    }
  });
  
  document.getElementById('btn-save-selected').addEventListener('click', () => {
    const selectedTabs = getAllSelectedTabs();
    if (selectedTabs.length === 0) {
      showMessage('No tabs selected', 'error');
      return;
    }
    document.getElementById('save-modal').classList.remove('hidden');
    document.getElementById('session-name').focus();
  });
  
  document.getElementById('btn-cancel-save').addEventListener('click', () => {
    document.getElementById('save-modal').classList.add('hidden');
    document.getElementById('session-name').value = '';
  });
  
  document.getElementById('btn-confirm-save').addEventListener('click', async () => {
    const nameInput = document.getElementById('session-name');
    const name = nameInput.value.trim();
    await saveSession(name || null);
    document.getElementById('save-modal').classList.add('hidden');
    nameInput.value = '';
  });
  
  document.getElementById('session-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-confirm-save').click();
    }
  });
  
  document.getElementById('btn-open-new').addEventListener('click', async () => {
    const selectedTabs = getAllSelectedTabs();
    if (selectedTabs.length === 0) {
      showMessage('No tabs selected', 'error');
      return;
    }
    await openSelectedInNewWindow(selectedTabs);
  });
  
  document.getElementById('btn-open-current').addEventListener('click', async () => {
    const selectedTabs = getAllSelectedTabs();
    if (selectedTabs.length === 0) {
      showMessage('No tabs selected', 'error');
      return;
    }
    await openSelectedInCurrentWindow(selectedTabs);
  });
  
  document.getElementById('btn-export-all').addEventListener('click', async () => {
    await exportSessions(null);
  });
  
  document.getElementById('btn-import').addEventListener('click', () => {
    window.open('import.html', '_blank');
  });
}

function updateWindowCheckbox(winIndex) {
  const windowGroup = document.querySelector(`.window-group[data-window-index="${winIndex}"]`);
  if (!windowGroup) return;
  
  const windowCheckbox = windowGroup.querySelector('.window-checkbox');
  const allSelected = allWindows[winIndex].tabs.every(t => t.selected);
  const someSelected = allWindows[winIndex].tabs.some(t => t.selected);
  
  windowCheckbox.checked = allSelected;
  windowCheckbox.indeterminate = someSelected && !allSelected;
}

function getAllSelectedTabs() {
  const selectedTabs = [];
  allWindows.forEach((win, winIndex) => {
    win.tabs.forEach(tab => {
      if (tab.selected) {
        selectedTabs.push({
          ...tab,
          windowIndex: winIndex
        });
      }
    });
  });
  return selectedTabs;
}

function updateSelectedCount() {
  const count = getAllSelectedTabs().length;
  document.getElementById('selected-count').textContent = count;
}

async function saveSession(sessionName = null) {
  const selectedTabs = getAllSelectedTabs();
  
  if (selectedTabs.length === 0) {
    showMessage('No tabs selected', 'error');
    return;
  }
  
  const timestamp = new Date();
  const name = sessionName || generateAutoName(timestamp);
  
  const selectedWindows = new Map();
  selectedTabs.forEach(tab => {
    if (!selectedWindows.has(tab.windowIndex)) {
      selectedWindows.set(tab.windowIndex, {
        id: tab.windowIndex,
        tabs: []
      });
    }
    const { windowIndex, ...tabData } = tab;
    selectedWindows.get(tab.windowIndex).tabs.push(tabData);
  });
  
  const windows = Array.from(selectedWindows.values()).map(win => ({
    tabs: win.tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      domain: tab.domain,
      favicon: tab.favicon,
      active: tab.active,
      pinned: tab.pinned
    }))
  }));
  
  const session = {
    id: crypto.randomUUID(),
    name: name,
    createdAt: timestamp.toISOString(),
    updatedAt: timestamp.toISOString(),
    windows: windows
  };
  
  try {
    const sessions = await getStoredSessions();
    sessions.push(session);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: sessions
    });
    
    await loadAndRenderSessions();
    showMessage(`Saved "${name}" with ${selectedTabs.length} tabs in ${windows.length} window(s)`, 'success');
  } catch (error) {
    console.error('Error saving session:', error);
    showMessage('Failed to save session', 'error');
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

async function getStoredSessions() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
  return result[STORAGE_KEYS.SESSIONS] || [];
}

async function loadAndRenderSessions() {
  const sessions = await getStoredSessions();
  const container = document.getElementById('sessions-list');
  
  if (sessions.length === 0) {
    container.innerHTML = '<div class="no-sessions">No saved sessions yet</div>';
    return;
  }
  
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  container.innerHTML = sortedSessions.map(session => {
    const date = new Date(session.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const isAutoSave = session.name && session.name.includes('Auto-Save');
    const totalTabs = session.windows ? session.windows.reduce((sum, w) => sum + w.tabs.length, 0) : 0;
    const windowCount = session.windows ? session.windows.length : 1;
    
    return `
      <div class="session-item" data-session-id="${session.id}">
        <div class="session-info">
          <div class="session-name">
            ${escapeHtml(session.name)}
            ${isAutoSave ? '<span class="auto-save"> (Auto)</span>' : ''}
          </div>
          <div class="session-meta">
            <span class="session-date">${formattedDate}</span>
            <span class="session-count">${totalTabs} tabs in ${windowCount} window(s)</span>
          </div>
        </div>
        <div class="session-actions">
          <button class="btn btn-small btn-secondary btn-open-new" title="Open in New Window">New</button>
          <button class="btn btn-small btn-secondary btn-open-current" title="Open in Current Window">Curr</button>
          <button class="btn btn-small btn-outline btn-export" title="Export Session">Exp</button>
          <button class="btn btn-small btn-outline btn-delete" title="Delete Session">Del</button>
        </div>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.session-item').forEach(item => {
    const sessionId = item.dataset.sessionId;
    
    item.querySelector('.btn-open-new').addEventListener('click', async (e) => {
      e.stopPropagation();
      await openSessionInNewWindow(sessionId);
    });
    
    item.querySelector('.btn-open-current').addEventListener('click', async (e) => {
      e.stopPropagation();
      await openSessionInCurrentWindow(sessionId);
    });
    
    item.querySelector('.btn-export').addEventListener('click', async (e) => {
      e.stopPropagation();
      await exportSessions([sessionId]);
    });
    
    item.querySelector('.btn-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteSession(sessionId);
    });
  });
}

async function openSessionInNewWindow(sessionId) {
  const sessions = await getStoredSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) {
    showMessage('Session not found', 'error');
    return;
  }
  
  let windows;
  if (session.windows && Array.isArray(session.windows) && session.windows.length > 0) {
    windows = session.windows;
  } else if (session.tabs && Array.isArray(session.tabs)) {
    windows = [{ tabs: session.tabs }];
  } else {
    showMessage('No tabs in session', 'error');
    return;
  }
  
  try {
    let firstTabCreated = false;
    
    for (const win of windows) {
      if (!win.tabs || win.tabs.length === 0) continue;
      
      if (!firstTabCreated) {
        const firstTab = win.tabs[0];
        const newWindow = await chrome.windows.create({
          url: firstTab.url,
          focused: true
        });
        
        const remainingTabs = win.tabs.slice(1);
        for (const tab of remainingTabs) {
          await chrome.tabs.create({
            windowId: newWindow.id,
            url: tab.url,
            pinned: tab.pinned || false
          });
        }
        firstTabCreated = true;
      } else {
        const newWindow = await chrome.windows.create({
          url: win.tabs[0].url
        });
        
        const remainingTabs = win.tabs.slice(1);
        for (const tab of remainingTabs) {
          await chrome.tabs.create({
            windowId: newWindow.id,
            url: tab.url,
            pinned: tab.pinned || false
          });
        }
      }
    }
    
    const totalTabs = windows.reduce((sum, w) => sum + (w.tabs ? w.tabs.length : 0), 0);
    showMessage(`Opened ${totalTabs} tabs in ${windows.length} new window(s)`, 'success');
  } catch (error) {
    console.error('Error opening session:', error);
    showMessage('Failed to open session', 'error');
  }
}

async function openSessionInCurrentWindow(sessionId) {
  const sessions = await getStoredSessions();
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) {
    showMessage('Session not found', 'error');
    return;
  }
  
  let windows;
  if (session.windows && Array.isArray(session.windows) && session.windows.length > 0) {
    windows = session.windows;
  } else if (session.tabs && Array.isArray(session.tabs)) {
    windows = [{ tabs: session.tabs }];
  } else {
    showMessage('No tabs in session', 'error');
    return;
  }
  
  try {
    const [currentWindow] = await chrome.windows.getCurrent();
    
    for (const win of windows) {
      if (!win.tabs) continue;
      for (const tab of win.tabs) {
        await chrome.tabs.create({
          windowId: currentWindow.id,
          url: tab.url,
          pinned: tab.pinned || false,
          active: false
        });
      }
    }
    
    const totalTabs = windows.reduce((sum, w) => sum + (w.tabs ? w.tabs.length : 0), 0);
    showMessage(`Added ${totalTabs} tabs to current window`, 'success');
  } catch (error) {
    console.error('Error opening session:', error);
    showMessage('Failed to open session', 'error');
  }
}

async function openSelectedInNewWindow(tabs) {
  try {
    const tabsByWindow = new Map();
    tabs.forEach(tab => {
      if (!tabsByWindow.has(tab.windowIndex)) {
        tabsByWindow.set(tab.windowIndex, []);
      }
      tabsByWindow.get(tab.windowIndex).push(tab);
    });
    
    let firstWindow = true;
    
    for (const [winIndex, winTabs] of tabsByWindow) {
      if (winTabs.length === 0) continue;
      
      if (firstWindow) {
        const firstTab = winTabs[0];
        const newWindow = await chrome.windows.create({
          url: firstTab.url,
          focused: true
        });
        
        const remainingTabs = winTabs.slice(1);
        for (const tab of remainingTabs) {
          await chrome.tabs.create({
            windowId: newWindow.id,
            url: tab.url,
            pinned: tab.pinned || false
          });
        }
        firstWindow = false;
      } else {
        const newWindow = await chrome.windows.create({
          url: winTabs[0].url
        });
        
        const remainingTabs = winTabs.slice(1);
        for (const tab of remainingTabs) {
          await chrome.tabs.create({
            windowId: newWindow.id,
            url: tab.url,
            pinned: tab.pinned || false
          });
        }
      }
    }
    
    showMessage(`Opened ${tabs.length} tabs in new window(s)`, 'success');
  } catch (error) {
    console.error('Error opening tabs:', error);
    showMessage('Failed to open tabs', 'error');
  }
}

async function openSelectedInCurrentWindow(tabs) {
  try {
    const [currentWindow] = await chrome.windows.getCurrent();
    
    for (const tab of tabs) {
      await chrome.tabs.create({
        windowId: currentWindow.id,
        url: tab.url,
        pinned: tab.pinned || false,
        active: false
      });
    }
    
    showMessage(`Added ${tabs.length} tabs to current window`, 'success');
  } catch (error) {
    console.error('Error opening tabs:', error);
    showMessage('Failed to open tabs', 'error');
  }
}

async function deleteSession(sessionId) {
  if (!confirm('Are you sure you want to delete this session?')) {
    return;
  }
  
  try {
    const sessions = await getStoredSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: filteredSessions
    });
    
    await loadAndRenderSessions();
    showMessage('Session deleted', 'success');
  } catch (error) {
    console.error('Error deleting session:', error);
    showMessage('Failed to delete session', 'error');
  }
}

async function exportSessions(sessionIds = null) {
  try {
    let sessions;
    
    if (sessionIds) {
      const allSessions = await getStoredSessions();
      sessions = allSessions.filter(s => sessionIds.includes(s.id));
    } else {
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
  } catch (error) {
    console.error('Error exporting sessions:', error);
    showMessage('Failed to export sessions', 'error');
  }
}

function showMessage(text, type = 'success') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  
  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
