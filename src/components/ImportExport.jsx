import { useState } from 'react';
import { useBookmarkContext } from '../context/BookmarkContext';
import { exportBookmarks, getCurrentBookmarks } from '../services/chromeAPI';

const ImportExport = () => {
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const { 
    setParsedBookmarks, 
    moveToNextStep, 
    setStatusMessage,
    setIsUsingCurrentBookmarks
  } = useBookmarkContext();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setParsedBookmarks(parsed);
        
        // Count bookmarks to show in status
        const count = countBookmarks(parsed);
        setStatusMessage(`Imported ${count} bookmarks successfully`);
        setIsUsingCurrentBookmarks(false);
        moveToNextStep();
      } catch (error) {
        setStatusMessage(`Failed to parse bookmarks: ${error.message}`, true);
      }
    };
    
    reader.onerror = () => {
      setStatusMessage('Error reading file', true);
    };
    
    reader.readAsText(file);
  };

  const handleExport = async () => {
    try {
      const success = await exportBookmarks();
      if (success) {
        setStatusMessage('Bookmarks exported successfully! Check your downloads folder.');
      }
    } catch (error) {
      setStatusMessage(`Export failed: ${error.message}`, true);
    }
  };
  
  const handleCurrentBookmarks = async () => {
    setLoadingCurrent(true);
    setStatusMessage('Loading your current Chrome bookmarks...');
    
    try {
      const bookmarks = await getCurrentBookmarks();
      setParsedBookmarks(bookmarks);
      
      // Count bookmarks to show in status
      const count = countBookmarks(bookmarks);
      setStatusMessage(`Loaded ${count} bookmarks from Chrome successfully`);
      setIsUsingCurrentBookmarks(true);
      moveToNextStep();
    } catch (error) {
      setStatusMessage(`Failed to load Chrome bookmarks: ${error.message}`, true);
    } finally {
      setLoadingCurrent(false);
    }
  };
  
  // Helper function to count bookmarks
  const countBookmarks = (node) => {
    if (!node.children) return 1; // It's a bookmark
    return node.children.reduce((sum, child) => sum + countBookmarks(child), 0);
  };

  return (
    <div>
      <h3>Access Your Bookmarks</h3>
      
      <div style={{ marginBottom: "20px" }}>
        <h4>Option 1: Use Current Bookmarks</h4>
        <p>
          Work directly with your current Chrome bookmarks. The extension will access
          your current bookmarks and allow you to organize them with AI.
        </p>
        <button 
          className="btn" 
          onClick={handleCurrentBookmarks}
          disabled={loadingCurrent}
        >
          {loadingCurrent ? 'Loading Current Bookmarks...' : 'Use Current Bookmarks'}
        </button>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <h4>Option 2: Import Bookmarks File</h4>
        <p>
          Import a bookmarks file (JSON format) that you've previously exported from Chrome.
        </p>
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'block', margin: '10px 0' }}
        />
      </div>
      
      <hr style={{ margin: '20px 0' }} />
      
      <div>
        <h4>Backup Your Bookmarks</h4>
        <p>
          It's recommended to backup your bookmarks before making any changes.
          This will download a JSON file of your current Chrome bookmarks.
        </p>
        <button className="btn" onClick={handleExport}>
          Export Chrome Bookmarks
        </button>
      </div>
    </div>
  );
};

export default ImportExport; 