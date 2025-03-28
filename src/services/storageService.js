// Simple storage service for Chrome extension

// Save API key to Chrome storage (with user permission)
export const saveApiKey = (apiKey, rememberKey = false) => {
  return new Promise((resolve, reject) => {
    if (!rememberKey) {
      // Don't save if user doesn't want to remember
      resolve();
      return;
    }
    
    try {
      // Use chrome.storage.sync to sync across devices
      chrome.storage.sync.set({ 'openai_api_key': apiKey }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Load API key from Chrome storage
export const loadApiKey = () => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(['openai_api_key'], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.openai_api_key || '');
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Clear stored API key
export const clearApiKey = () => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.remove(['openai_api_key'], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}; 