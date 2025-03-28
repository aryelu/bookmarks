// Notification service for Chrome extension

export const NotificationType = {
  PROGRESS: 'PROGRESS',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR'
};

export const sendNotification = (type, title, message) => {
  chrome.runtime.sendMessage({
    type: 'PROGRESS_UPDATE',
    title,
    message
  });
};

export const notifyProgress = (message) => {
  sendNotification(NotificationType.PROGRESS, 'Bookmark Organizer', message);
};

export const notifySuccess = (message) => {
  sendNotification(NotificationType.SUCCESS, 'Success', message);
};

export const notifyError = (message) => {
  sendNotification(NotificationType.ERROR, 'Error', message);
}; 