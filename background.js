// Listen for extension icon click
chrome.action.onClicked.addListener(() => {
  // Check if the extension is already open in any tab
  chrome.tabs.query({ url: chrome.runtime.getURL('index.html') }, (tabs) => {
    if (tabs.length > 0) {
      // If found, focus the existing tab
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // If not found, open in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('index.html')
      });
    }
  });
});

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROGRESS_UPDATE') {
    showNotification(message.title, message.message);
  }
  return true;
});

// Function to show notifications
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 0
  });
}

// Listen for notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Check if the extension is already open in any tab
  chrome.tabs.query({ url: chrome.runtime.getURL('index.html') }, (tabs) => {
    if (tabs.length > 0) {
      // If found, focus the existing tab
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // If not found, open in a new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('index.html')
      });
    }
  });
}); 