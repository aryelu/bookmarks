/**
 * Chrome Bookmarks API service
 */

// Function to retrieve current bookmarks directly from Chrome
export const getCurrentBookmarks = () => {
  return new Promise((resolve, reject) => {
    if (!chrome.bookmarks) {
      reject(new Error('Chrome bookmarks API not available'));
      return;
    }

    chrome.bookmarks.getTree((results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const transformedBookmarks = transformChromeBookmarks(results[0]);
      resolve(transformedBookmarks);
    });
  });
};

// Helper function to transform Chrome's bookmark tree to our format
const transformChromeBookmarks = (node) => {
  // Create root folder
  const result = {
    id: node.id,
    title: 'Chrome Bookmarks',
    children: []
  };
  
  // Process all children
  if (node.children) {
    // Usually, Chrome has two root folders: Bookmarks Bar and Other Bookmarks
    for (const child of node.children) {
      processBookmarkNode(child, result.children);
    }
  }
  
  return result;
};

// Process each node in the bookmarks tree
const processBookmarkNode = (node, targetArray) => {
  if (node.url) {
    // It's a bookmark
    targetArray.push({
      id: node.id,
      title: node.title,
      url: node.url,
      dateAdded: node.dateAdded,
      type: 'bookmark'
    });
  } else {
    // It's a folder
    const folder = {
      id: node.id,
      title: node.title,
      children: [],
      type: 'folder'
    };
    
    if (node.children) {
      for (const child of node.children) {
        processBookmarkNode(child, folder.children);
      }
    }
    
    targetArray.push(folder);
  }
};

// Apply organized bookmarks to Chrome
export const applyBookmarksToChrome = (organizedBookmarks) => {
  return new Promise((resolve, reject) => {
    if (!chrome.bookmarks) {
      reject(new Error('Chrome bookmarks API not available'));
      return;
    }

    // First, get all existing bookmarks to find the root folders
    chrome.bookmarks.getTree(async (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      try {
        const rootNode = results[0];
        // The first child is usually the bookmark bar (id '1')
        const bookmarkBarId = rootNode.children[0].id;
        
        // Clear bookmark bar except for special folders
        await clearBookmarkFolder(bookmarkBarId);
        
        // Create folders and add bookmarks based on organized structure
        await createOrganizedBookmarks(organizedBookmarks, bookmarkBarId);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Clear a bookmark folder
const clearBookmarkFolder = (folderId) => {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getChildren(folderId, async (children) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      try {
        // Remove each child
        for (const child of children) {
          await removeBookmarkNode(child.id);
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Remove a bookmark node (folder or bookmark)
const removeBookmarkNode = (nodeId) => {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.remove(nodeId, () => {
      if (chrome.runtime.lastError) {
        // If can't remove directly, it might be a folder
        chrome.bookmarks.removeTree(nodeId, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
};

// Create organized bookmarks structure
const createOrganizedBookmarks = async (organizedNode, parentId) => {
  if (!organizedNode.children) return;
  
  for (const child of organizedNode.children) {
    if (child.url) {
      // It's a bookmark
      await createBookmark(child.title, child.url, parentId);
    } else {
      // It's a folder
      const newFolder = await createBookmarkFolder(child.title, parentId);
      if (child.children && child.children.length > 0) {
        await createOrganizedBookmarks(child, newFolder.id);
      }
    }
  }
};

// Create a bookmark folder
const createBookmarkFolder = (title, parentId) => {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create({
      parentId: parentId,
      title: title
    }, (newFolder) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(newFolder);
      }
    });
  });
};

// Create a bookmark
const createBookmark = (title, url, parentId) => {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create({
      parentId: parentId,
      title: title,
      url: url
    }, (newBookmark) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(newBookmark);
      }
    });
  });
};

export const exportBookmarks = () => {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        // Generate HTML export
        const html = convertBookmarksToHtml(bookmarkTreeNodes);
        
        // Create and trigger download
        const blob = new Blob([html], {type: 'text/html'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chrome_bookmarks_${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        
        resolve(bookmarkTreeNodes);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export const replaceBookmarks = (newBookmarks) => {
  return new Promise((resolve, reject) => {
    try {
      // First, clear existing bookmarks
      clearBookmarkFolder('1') // Bookmarks Bar
        .then(() => clearBookmarkFolder('2')) // Other Bookmarks
        .then(() => {
          // Now add new bookmarks
          addBookmarksToChrome(newBookmarks)
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
};

const addBookmarksToChrome = (bookmarks) => {
  return new Promise((resolve, reject) => {
    // Add the bookmarks to the Bookmarks Bar
    const targetId = '1'; // Bookmarks Bar
    
    if (!bookmarks.children || bookmarks.children.length === 0) {
      resolve();
      return;
    }
    
    let processed = 0;
    
    bookmarks.children.forEach((child) => {
      addBookmarkNode(child, targetId)
        .then(() => {
          processed++;
          if (processed === bookmarks.children.length) {
            resolve();
          }
        })
        .catch(reject);
    });
  });
};

const addBookmarkNode = (node, parentId) => {
  return new Promise((resolve, reject) => {
    if (node.type === 'folder') {
      // Create a folder
      chrome.bookmarks.create({
        parentId: parentId,
        title: node.title
      }, (newFolder) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        if (!node.children || node.children.length === 0) {
          resolve();
          return;
        }
        
        let processed = 0;
        
        node.children.forEach((child) => {
          addBookmarkNode(child, newFolder.id)
            .then(() => {
              processed++;
              if (processed === node.children.length) {
                resolve();
              }
            })
            .catch(reject);
        });
      });
    } else if (node.type === 'bookmark') {
      // Create a bookmark
      chrome.bookmarks.create({
        parentId: parentId,
        title: node.title,
        url: node.url
      }, (newBookmark) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    } else {
      resolve(); // Unknown type, just resolve
    }
  });
};

const convertBookmarksToHtml = (bookmarkTreeNodes) => {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>`;

  function processNode(node, indent) {
    const indentStr = '    '.repeat(indent);
    
    if (node.children) {
      // This is a folder
      if (node.title) { // Skip root nodes
        html += `${indentStr}<DT><H3>${escapeHtml(node.title)}</H3>\n`;
        html += `${indentStr}<DL><p>\n`;
      }
      
      node.children.forEach(child => {
        processNode(child, indent + 1);
      });
      
      if (node.title) {
        html += `${indentStr}</DL><p>\n`;
      }
    } else if (node.url) {
      // This is a bookmark
      html += `${indentStr}<DT><A HREF="${escapeHtml(node.url)}">${escapeHtml(node.title)}</A>\n`;
    }
  }
  
  bookmarkTreeNodes.forEach(root => {
    processNode(root, 1);
  });
  
  html += `</DL><p>`;
  return html;
};

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
} 