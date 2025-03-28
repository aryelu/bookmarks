export const parseBookmarksHtml = (html) => {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Function to recursively extract bookmarks
  function extractBookmarks(parent) {
    const result = {
      type: 'folder',
      title: parent.querySelector('h3')?.textContent || 'Bookmarks',
      children: []
    };
    
    // Process all direct children
    let currentElement = parent.firstElementChild;
    
    while (currentElement) {
      if (currentElement.tagName === 'DT') {
        const h3 = currentElement.querySelector('h3');
        const a = currentElement.querySelector('a');
        
        if (h3) {
          // This is a folder
          const dl = currentElement.querySelector('dl');
          if (dl) {
            const folder = extractBookmarks(dl);
            folder.title = h3.textContent;
            result.children.push(folder);
          }
        } else if (a) {
          // This is a bookmark
          result.children.push({
            type: 'bookmark',
            title: a.textContent || 'Untitled',
            url: a.getAttribute('href') || '#'
          });
        }
      }
      
      currentElement = currentElement.nextElementSibling;
    }
    
    return result;
  }
  
  // Get the main DL element
  const mainDL = doc.querySelector('dl');
  if (!mainDL) {
    throw new Error('Invalid bookmarks file format');
  }
  
  return extractBookmarks(mainDL);
}; 