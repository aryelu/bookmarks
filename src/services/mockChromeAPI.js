// Mock implementation of Chrome bookmarks API
import { sampleBookmarks, generateLargeBookmarkSample } from './mockData';

// Mock storage for bookmark operations
let mockBookmarkStorage = {};

// Initialize with sample data
export const initMockBookmarks = (useTestData = false, size = 300) => {
  console.log('Initializing mock bookmarks with', useTestData ? `large test data (${size} bookmarks)` : 'sample data');
  mockBookmarkStorage = useTestData ? generateLargeBookmarkSample(size) : JSON.parse(JSON.stringify(sampleBookmarks));
  return mockBookmarkStorage;
};

// Mock chrome.bookmarks API
const mockChromeBookmarks = {
  getTree: () => {
    console.log('Mock chrome.bookmarks.getTree called');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([mockBookmarkStorage]);
      }, 50);
    });
  },
  
  getChildren: (id) => {
    console.log('Mock chrome.bookmarks.getChildren called with id:', id);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Find the node with the given id
        const findNode = (node, searchId) => {
          if (node.id === searchId) {
            return node.children || [];
          }
          if (node.children) {
            for (const child of node.children) {
              const result = findNode(child, searchId);
              if (result) return result;
            }
          }
          return null;
        };
        
        const children = findNode(mockBookmarkStorage, id);
        resolve(children || []);
      }, 50);
    });
  },
  
  create: (bookmark) => {
    console.log('Mock chrome.bookmarks.create called with:', bookmark);
    return new Promise((resolve) => {
      setTimeout(() => {
        const newBookmark = {
          ...bookmark,
          id: `mock-${Date.now()}`,
          dateAdded: Date.now(),
        };
        
        // Add to parent
        if (bookmark.parentId) {
          const findAndAddToParent = (node, parentId, newNode) => {
            if (node.id === parentId) {
              if (!node.children) node.children = [];
              node.children.push(newNode);
              return true;
            }
            if (node.children) {
              for (const child of node.children) {
                if (findAndAddToParent(child, parentId, newNode)) return true;
              }
            }
            return false;
          };
          
          findAndAddToParent(mockBookmarkStorage, bookmark.parentId, newBookmark);
        }
        
        resolve(newBookmark);
      }, 50);
    });
  },
  
  remove: (id) => {
    console.log('Mock chrome.bookmarks.remove called with id:', id);
    return new Promise((resolve) => {
      setTimeout(() => {
        const removeNode = (parent, removeId) => {
          if (!parent.children) return false;
          
          const index = parent.children.findIndex(child => child.id === removeId);
          if (index !== -1) {
            parent.children.splice(index, 1);
            return true;
          }
          
          for (const child of parent.children) {
            if (removeNode(child, removeId)) return true;
          }
          
          return false;
        };
        
        removeNode(mockBookmarkStorage, id);
        resolve();
      }, 50);
    });
  },
  
  removeTree: (id) => {
    console.log('Mock chrome.bookmarks.removeTree called with id:', id);
    // Implementation is the same as remove for our mock purposes
    return mockChromeBookmarks.remove(id);
  },
};

const mockChromeStorage = {
  sync: {
    get: (keys, callback) => {
      console.log('Mock chrome.storage.sync.get called with:', keys);
      setTimeout(() => {
        const result = {};
        if (typeof keys === 'string') {
          result[keys] = mockBookmarkStorage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            result[key] = mockBookmarkStorage[key];
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(key => {
            result[key] = mockBookmarkStorage[key] || keys[key];
          });
        }
        callback(result);
      }, 50);
    },
    
    set: (items, callback) => {
      console.log('Mock chrome.storage.sync.set called with:', items);
      setTimeout(() => {
        Object.assign(mockBookmarkStorage, items);
        if (callback) callback();
      }, 50);
    },
    
    remove: (keys, callback) => {
      console.log('Mock chrome.storage.sync.remove called with:', keys);
      setTimeout(() => {
        if (typeof keys === 'string') {
          delete mockBookmarkStorage[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(key => {
            delete mockBookmarkStorage[key];
          });
        }
        if (callback) callback();
      }, 50);
    }
  }
};

// Export the mock chrome API
export const mockChrome = {
  bookmarks: mockChromeBookmarks,
  storage: mockChromeStorage
}; 