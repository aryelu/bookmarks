import { useState, useContext } from 'react';
import { BookmarkContext } from '../context/BookmarkContext';
import { applyBookmarksToChrome } from '../services/chromeAPI';

const Preview = () => {
  const { 
    organizedBookmarks, 
    setStatusMessage, 
    isUsingCurrentBookmarks
  } = useContext(BookmarkContext);
  const [applying, setApplying] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});

  if (!organizedBookmarks) {
    return <div>No organized bookmarks to preview. Please go back and organize your bookmarks first.</div>;
  }

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleApply = async () => {
    setApplying(true);
    setStatusMessage('info', 'Applying organized bookmarks to Chrome...');
    
    try {
      await applyBookmarksToChrome(organizedBookmarks);
      setStatusMessage('success', 'Bookmarks successfully organized in Chrome!');
    } catch (error) {
      setStatusMessage('error', `Failed to apply bookmarks: ${error.message}`);
    } finally {
      setApplying(false);
    }
  };

  const renderBookmarkItem = (bookmark, level = 0) => {
    const paddingLeft = `${level * 20}px`;
    
    if (bookmark.children) {
      // It's a folder
      const isExpanded = expandedFolders[bookmark.id] !== false; // Default to expanded
      
      return (
        <div key={bookmark.id}>
          <div 
            className="folder-item" 
            style={{ 
              paddingLeft, 
              cursor: 'pointer',
              fontWeight: 'bold',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: level === 0 ? '#f0f0f0' : 'transparent',
              borderRadius: '4px',
              marginBottom: '4px'
            }}
            onClick={() => toggleFolder(bookmark.id)}
          >
            <span style={{ marginRight: '5px' }}>
              {isExpanded ? '▼' : '►'}
            </span>
            {bookmark.title || 'Untitled Folder'} ({bookmark.children.length})
          </div>
          
          {isExpanded && (
            <div style={{ marginLeft: '10px' }}>
              {bookmark.children.map(child => renderBookmarkItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    } else {
      // It's a bookmark
      return (
        <div 
          key={bookmark.id} 
          className="bookmark-item"
          style={{ 
            paddingLeft, 
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '14px'
          }}
        >
          <span style={{ 
            display: 'inline-block', 
            width: '16px', 
            height: '16px',
            marginRight: '5px',
            backgroundImage: `url(chrome://favicon/${bookmark.url})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat'
          }}></span>
          <a 
            href={bookmark.url} 
            target="_blank" 
            rel="noopener noreferrer"
            title={bookmark.title}
            style={{
              textDecoration: 'none',
              color: '#0066cc',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}
          >
            {bookmark.title || bookmark.url}
          </a>
        </div>
      );
    }
  };

  // Count the total number of bookmarks
  const countBookmarks = (node) => {
    if (!node.children) return 1; // It's a bookmark
    return node.children.reduce((sum, child) => sum + countBookmarks(child), 0);
  };

  const totalBookmarks = organizedBookmarks.children
    ? organizedBookmarks.children.reduce((sum, child) => sum + countBookmarks(child), 0)
    : 0;

  return (
    <div className="preview-container">
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px' }}>Preview of Organized Bookmarks</h3>
        <p>
          {isUsingCurrentBookmarks 
            ? "Review how your bookmarks will be organized before applying the changes to Chrome."
            : "Review how your imported bookmarks will be organized before applying them to Chrome."}
        </p>
        <div className="stats" style={{ fontSize: '14px', marginBottom: '10px' }}>
          <p>Total bookmarks: {totalBookmarks}</p>
          <p>Categories: {organizedBookmarks.children ? organizedBookmarks.children.length : 0}</p>
        </div>
      </div>
      
      <div className="preview-scrollable" style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        padding: '10px',
        marginBottom: '20px'
      }}>
        {organizedBookmarks.children && organizedBookmarks.children.map(child => 
          renderBookmarkItem(child)
        )}
      </div>
      
      <button 
        className="btn" 
        onClick={handleApply}
        disabled={applying}
      >
        {applying ? 'Applying to Chrome...' : 'Apply to Chrome Bookmarks'}
      </button>
      
      <div className="warning" style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeeba',
        borderRadius: '4px',
        fontSize: '13px'
      }}>
        <strong>Note:</strong> Applying will modify your Chrome bookmarks. 
        It's recommended to use the Export feature from the first step as a backup
        before applying changes.
      </div>
    </div>
  );
};

export default Preview; 