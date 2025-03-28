import React, { useState, useContext } from 'react';
import { BookmarkContext } from '../context/BookmarkContext';
import { organizeBookmarksWithOpenAI, processLargeBookmarkCollection } from '../services/openaiService';

const Organization = () => {
  const { 
    parsedBookmarks, 
    setOrganizedBookmarks, 
    moveToNextStep, 
    setStatusMessage 
  } = useContext(BookmarkContext);
  
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gpt-3.5-turbo-16k');
  const [temperature, setTemperature] = useState(0.7);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [organizationType, setOrganizationType] = useState('category');
  const [useBatchProcessing, setUseBatchProcessing] = useState(true);
  const [customInstructions, setCustomInstructions] = useState(
    'Organize these bookmarks into logical categories. Create folder hierarchy where appropriate. Group similar sites together.'
  );

  const handleOrganize = async () => {
    if (!apiKey) {
      setStatusMessage('error', 'Please enter your OpenAI API key.');
      return;
    }

    if (!parsedBookmarks) {
      setStatusMessage('error', 'No bookmarks to organize. Please import bookmarks first.');
      return;
    }

    // Save API key for future use
    localStorage.setItem('openai_api_key', apiKey);
    
    setLoading(true);
    setStatusMessage('info', 'Processing your bookmarks. This may take a minute...');

    try {
      let organizedData;
      try {
        // Count total bookmarks to determine processing method
        const bookmarkCount = countBookmarks(parsedBookmarks);
        
        if (bookmarkCount > 100 && useBatchProcessing) {
          // For large collections, use batch processing
          setStatusMessage('info', `Processing ${bookmarkCount} bookmarks in batches. This may take several minutes...`);
          organizedData = await processLargeBookmarkCollection(
            parsedBookmarks,
            organizationType,
            apiKey
          );
        } else {
          // For smaller collections or if batch processing is disabled
          organizedData = await organizeBookmarksWithOpenAI(
            parsedBookmarks,
            organizationType,
            apiKey
          );
        }
      } catch (apiError) {
        console.error('Error from OpenAI API:', apiError);
        
        // Check if it's a JSON parsing error
        if (apiError.message && apiError.message.includes('Failed to parse AI response')) {
          setStatusMessage('error', 'Failed to parse the AI response. This is usually due to a malformed response from OpenAI. Try enabling batch processing for large bookmark collections.');
          
          // Create a default fallback organization if the parsing failed
          organizedData = createFallbackOrganization(parsedBookmarks);
          setStatusMessage('warning', 'Using fallback organization due to API response parsing issues. Your bookmarks are organized alphabetically.');
        } else {
          // For other errors, just throw the error to be caught by the outer catch
          throw apiError;
        }
      }
      
      setOrganizedBookmarks(organizedData);
      setStatusMessage('success', 'Bookmarks organized successfully!');
      moveToNextStep();
    } catch (error) {
      console.error('Error organizing bookmarks:', error);
      setStatusMessage('error', `Error: ${error.message || 'Failed to organize bookmarks'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Count the total number of bookmarks in the tree
  const countBookmarks = (node) => {
    if (!node) return 0;
    if (!node.children) return node.url ? 1 : 0;
    return node.children.reduce((sum, child) => sum + countBookmarks(child), 0);
  };
  
  // Fallback function to create a basic organization when OpenAI fails
  const createFallbackOrganization = (bookmarks) => {
    // Create a simple alphabetical organization
    const alphabetFolders = {};
    const rootChildren = [];
    
    // Helper function to process each bookmark
    const processBookmark = (node, path = '') => {
      if (node.url) {
        // It's a bookmark - get first letter
        const firstLetter = (node.title || 'Other').charAt(0).toUpperCase();
        const letterFolder = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
        
        // Create or get the letter folder
        if (!alphabetFolders[letterFolder]) {
          alphabetFolders[letterFolder] = {
            id: `folder-${letterFolder}`,
            title: letterFolder,
            type: 'folder',
            children: []
          };
          rootChildren.push(alphabetFolders[letterFolder]);
        }
        
        // Add bookmark to the letter folder
        alphabetFolders[letterFolder].children.push({
          id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title: node.title || 'Untitled',
          url: node.url,
          type: 'bookmark'
        });
      } else if (node.children) {
        // Process each child
        node.children.forEach(child => processBookmark(child, path + ' > ' + (node.title || 'Folder')));
      }
    };
    
    // Start processing from the root
    if (bookmarks.children) {
      bookmarks.children.forEach(child => processBookmark(child));
    } else {
      processBookmark(bookmarks);
    }
    
    // Sort folders alphabetically
    rootChildren.sort((a, b) => {
      // Put # at the end
      if (a.title === '#') return 1;
      if (b.title === '#') return -1;
      return a.title.localeCompare(b.title);
    });
    
    // Create the root structure
    return {
      id: 'root',
      title: 'Bookmarks Bar',
      type: 'folder',
      children: rootChildren
    };
  };

  return (
    <div className="organization-container">
      <div className="api-key-section">
        <label htmlFor="apiKey">
          OpenAI API Key:
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </label>
        <p className="api-key-note">
          Your API key is stored locally in your browser and never sent to our servers.
        </p>
      </div>

      <div className="organization-options">
        <h3>Organization Options</h3>
        
        <div className="option-group">
          <label htmlFor="organizationType">
            Organization Type:
            <select
              id="organizationType"
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
            >
              <option value="category">Category-based (recommended)</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="domain">Domain-based</option>
            </select>
          </label>
        </div>

        <div className="option-group">
          <label htmlFor="model">
            Model:
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo (16k context)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (8k context)</option>
              <option value="gpt-4">GPT-4 (8k context)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo (128k context)</option>
            </select>
          </label>
        </div>

        <div className="option-group">
          <label htmlFor="temperature">
            Temperature: {temperature}
            <input
              type="range"
              id="temperature"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
          </label>
          <p className="option-description">
            Lower values (0) make output more focused and deterministic. Higher values (1) make output more creative and varied.
          </p>
        </div>
        
        <div className="option-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useBatchProcessing}
              onChange={(e) => setUseBatchProcessing(e.target.checked)}
            />
            Use batch processing for large collections
          </label>
          <p className="option-description">
            Processes large bookmark collections in smaller batches. Recommended for collections with more than 100 bookmarks.
          </p>
        </div>
      </div>

      <div className="action-buttons">
        <button
          onClick={handleOrganize}
          disabled={loading || !apiKey || !parsedBookmarks}
        >
          {loading ? 'Processing...' : 'Organize Bookmarks'}
        </button>
      </div>
    </div>
  );
};

export default Organization; 