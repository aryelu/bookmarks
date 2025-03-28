import { useState } from 'react';

const BookmarkTree = ({ bookmark, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  
  if (!bookmark) return null;
  
  const isFolder = bookmark.type === 'folder' && bookmark.children && bookmark.children.length > 0;
  const indentStyle = { marginLeft: `${level * 16}px` };
  
  if (isFolder) {
    return (
      <div className="bookmark-folder">
        <div 
          className="folder-header" 
          style={indentStyle}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="folder-icon">
            {expanded ? '📂' : '📁'}
          </span>
          <span className="folder-title">{bookmark.title}</span>
          <span className="item-count">
            ({bookmark.children.length} items)
          </span>
        </div>
        
        {expanded && (
          <div className="folder-children">
            {bookmark.children.map((child, index) => (
              <BookmarkTree 
                key={index} 
                bookmark={child} 
                level={level + 1} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // This is a bookmark
  return (
    <div className="bookmark-item" style={indentStyle}>
      <span className="bookmark-icon">🔖</span>
      <span className="bookmark-title" title={bookmark.url}>
        <a 
          href={bookmark.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline truncate"
        >
          {bookmark.title}
        </a>
      </span>
    </div>
  );
};

export default BookmarkTree; 