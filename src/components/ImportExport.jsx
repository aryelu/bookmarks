import React, { useState, useContext } from 'react';
import { BookmarkContext } from '../context/BookmarkContext';
import { getCurrentBookmarks, applyBookmarksToChrome, exportBookmarks } from '../services/chromeAPI';

const ImportExport = () => {
  const { 
    setParsedBookmarks, 
    moveToNextStep, 
    setStatusMessage 
  } = useContext(BookmarkContext);
  
  const [loading, setLoading] = useState(false);

  const handleGetCurrentBookmarks = async () => {
    setLoading(true);
    setStatusMessage('info', 'Accessing Chrome bookmarks...');
    
    try {
      const bookmarks = await getCurrentBookmarks();
      setParsedBookmarks(bookmarks);
      setStatusMessage('success', 'Bookmarks loaded successfully!');
      moveToNextStep();
    } catch (error) {
      console.error('Error accessing bookmarks:', error);
      setStatusMessage('error', `Error: ${error.message || 'Failed to access bookmarks'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="space-y-8">
        <div className="option-group">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Option 1: Use Current Bookmarks</h3>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-700 mb-4">
              Work directly with your current Chrome bookmarks. The extension will access your 
              current bookmarks and allow you to organize them with AI.
            </p>
            <button
              onClick={handleGetCurrentBookmarks}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Use Current Bookmarks'}
            </button>
          </div>
        </div>
        
        <div className="option-group">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Option 2: Export Bookmarks</h3>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-700 mb-4">
              Export your current Chrome bookmarks to a JSON file.
            </p>
            <button
              onClick={exportBookmarks}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Export Bookmarks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExport; 