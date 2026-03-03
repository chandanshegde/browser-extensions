const STORAGE_KEYS = {
  SESSIONS: 'sessionManager_sessions'
};

let parsedData = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
  setupEventListeners();
}

function setupEventListeners() {
  const uploadSection = document.getElementById('upload-section');
  const fileInput = document.getElementById('file-input');
  
  uploadSection.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });
  
  uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('drag-over');
  });
  
  uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('drag-over');
  });
  
  uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  document.getElementById('btn-import').addEventListener('click', async () => {
    if (parsedData) {
      await importSessions();
    }
  });
}

function handleFile(file) {
  if (!file.name.endsWith('.json')) {
    showMessage('Please select a JSON file', 'error');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      parsedData = JSON.parse(e.target.result);
      
      if (!validateImportData(parsedData)) {
        showMessage('Invalid file format. Please select a valid Session Manager export file.', 'error');
        parsedData = null;
        return;
      }
      
      displayPreview(parsedData);
      showMessage(`Found ${parsedData.sessions.length} session(s) to import`, 'success');
    } catch (error) {
      console.error('Error parsing JSON:', error);
      showMessage('Failed to parse JSON file', 'error');
      parsedData = null;
    }
  };
  
  reader.onerror = () => {
    showMessage('Failed to read file', 'error');
  };
  
  reader.readAsText(file);
}

function validateImportData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.version || !data.sessions) return false;
  if (!Array.isArray(data.sessions)) return false;
  
  for (const session of data.sessions) {
    if (!session.name) return false;
    
    if (session.windows && Array.isArray(session.windows)) {
      for (const window of session.windows) {
        if (!window.tabs || !Array.isArray(window.tabs)) {
          return false;
        }
        for (const tab of window.tabs) {
          if (!tab.url || !tab.title) {
            return false;
          }
        }
      }
    } else if (session.tabs && Array.isArray(session.tabs)) {
      for (const tab of session.tabs) {
        if (!tab.url || !tab.title) {
          return false;
        }
      }
    } else {
      return false;
    }
  }
  
  return true;
}

function displayPreview(data) {
  const previewSection = document.getElementById('preview-section');
  const sessionsPreview = document.getElementById('sessions-preview');
  
  previewSection.classList.remove('hidden');
  
  sessionsPreview.innerHTML = data.sessions.map(session => {
    const date = new Date(session.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let totalTabs = 0;
    let windowCount = 0;
    
    if (session.windows && Array.isArray(session.windows)) {
      windowCount = session.windows.length;
      totalTabs = session.windows.reduce((sum, w) => sum + (w.tabs ? w.tabs.length : 0), 0);
    } else if (session.tabs && Array.isArray(session.tabs)) {
      windowCount = 1;
      totalTabs = session.tabs.length;
    }
    
    return `
      <div class="session-preview-item">
        <div class="session-preview-name">${escapeHtml(session.name)}</div>
        <div class="session-preview-meta">${formattedDate} • ${totalTabs} tabs in ${windowCount} window(s)</div>
      </div>
    `;
  }).join('');
}

async function importSessions() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
    const sessions = result[STORAGE_KEYS.SESSIONS] || [];
    
    const importedSessions = parsedData.sessions.map(session => {
      let windowsData;
      
      if (session.windows && Array.isArray(session.windows)) {
        windowsData = session.windows;
      } else if (session.tabs && Array.isArray(session.tabs)) {
        windowsData = [{
          tabs: session.tabs.map(tab => ({
            url: tab.url,
            title: tab.title,
            domain: tab.domain,
            favicon: tab.favicon,
            active: tab.active || false,
            pinned: tab.pinned || false
          }))
        }];
      } else {
        windowsData = [{ tabs: [] }];
      }
      
      return {
        id: crypto.randomUUID(),
        name: session.name,
        createdAt: session.createdAt,
        updatedAt: new Date().toISOString(),
        windows: windowsData,
        importedAt: new Date().toISOString(),
        originalId: session.id
      };
    });
    
    const mergedSessions = [...sessions, ...importedSessions];
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: mergedSessions
    });
    
    showMessage(`Successfully imported ${importedSessions.length} session(s)`, 'success');
    
    setTimeout(() => {
      window.location.href = 'popup.html';
    }, 1500);
    
  } catch (error) {
    console.error('Error importing sessions:', error);
    showMessage('Failed to import sessions', 'error');
  }
}

function showMessage(text, type = 'success') {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  
  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 5000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
