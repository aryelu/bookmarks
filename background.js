// Listen for extension icon click
chrome.action.onClicked.addListener(() => {
  // Open the extension in a new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
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
    message: message
  });
}

// Listen for notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open the extension in a new tab when notification is clicked
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
}); 