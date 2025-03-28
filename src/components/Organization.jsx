import React, { useState, useContext } from 'react';
import { BookmarkContext } from '../context/BookmarkContext';
import { organizeBookmarksWithOpenAI, processLargeBookmarkCollection } from '../services/openaiService';

const Organization = () => {
  const { 
    parsedBookmarks, 
    setOrganizedBookmarks, 
    moveToNextStep, 
    setStatusMessage,
    resetToStart 
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

  const handleReset = () => {
    setLoading(false);
    setStatusMessage('info', 'Reset to start. You can try organizing again with different settings.');
    resetToStart();
  };

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
    
    // Count total bookmarks before processing
    const originalBookmarkCount = countBookmarks(parsedBookmarks);
    console.log(`Starting organization of ${originalBookmarkCount} bookmarks using ${model}`);

    try {
      let organizedData;
      try {
        // Count total bookmarks to determine processing method
        const bookmarkCount = countBookmarks(parsedBookmarks);
        
        if (bookmarkCount > 150 && useBatchProcessing) {
          // For large collections, use batch processing
          setStatusMessage('info', `Processing ${bookmarkCount} bookmarks in batches using ${model}. This will preserve hierarchy where possible.`);
          organizedData = await processLargeBookmarkCollection(
            parsedBookmarks,
            organizationType,
            apiKey,
            model,
            temperature
          );
        } else {
          // For smaller collections or if batch processing is disabled
          setStatusMessage('info', `Processing ${bookmarkCount} bookmarks using ${model}...`);
          organizedData = await organizeBookmarksWithOpenAI(
            parsedBookmarks,
            organizationType,
            apiKey,
            model,
            temperature
          );
        }
      } catch (apiError) {
        console.error('Error from OpenAI API:', apiError);
        
        // Check if it's a JSON parsing error
        if (apiError.message && apiError.message.includes('Failed to parse AI response')) {
          setStatusMessage('error', 'Failed to parse the AI response. This could be due to the complexity of your bookmarks. Try enabling batch processing or using a more capable model like GPT-4.');
          
          // Create a default fallback organization if the parsing failed
          organizedData = createFallbackOrganization(parsedBookmarks);
          setStatusMessage('warning', 'Using fallback organization due to API response parsing issues. Your bookmarks are organized alphabetically.');
        } else {
          // For other errors, just throw the error to be caught by the outer catch
          throw apiError;
        }
      }
      
      // Verify that all bookmarks were included in the response
      const organizedBookmarkCount = countBookmarks(organizedData);
      console.log(`Organized bookmark count: ${organizedBookmarkCount} of ${originalBookmarkCount}`);
      
      if (organizedBookmarkCount < originalBookmarkCount * 0.95) {
        // If more than 5% of bookmarks are missing, add a warning
        setStatusMessage('warning', `Warning: Only ${organizedBookmarkCount} of ${originalBookmarkCount} bookmarks were organized. Some bookmarks may be missing. Consider trying again with different settings.`);
      } else {
        setStatusMessage('success', 'Bookmarks organized successfully!');
      }
      
      setOrganizedBookmarks(organizedData);
      moveToNextStep();
    } catch (error) {
      console.error('Error organizing bookmarks:', error);
      
      // Handle specific error types
      if (error.message.includes('context length') || error.message.includes('token')) {
        setStatusMessage('error', 'Your bookmark collection is too large for the API. Try enabling batch processing or using a model with larger context window.');
      } else if (error.message.includes('API key') || error.message.includes('quota')) {
        setStatusMessage('error', 'API key error. Please check your OpenAI API key and quota.');
      } else if (error.message.includes('Rate limit')) {
        setStatusMessage('error', 'Rate limit exceeded. Please wait a few minutes before trying again.');
      } else {
        setStatusMessage('error', `Error: ${error.message || 'Failed to organize bookmarks'}`);
      }
      
      // Don't move to next step on error
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
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
          OpenAI API Key:
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </label>
        <p className="mt-2 text-sm text-gray-500">
          Your API key is stored locally in your browser and never sent to our servers.
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Organization Options</h3>
        
        <div className="space-y-2">
          <label htmlFor="organizationType" className="block text-sm font-medium text-gray-700">
            Organization Type:
            <select
              id="organizationType"
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="category">Category-based (recommended)</option>
              <option value="alphabetical">Alphabetical</option>
              <option value="domain">Domain-based (group by website)</option>
            </select>
          </label>
          <div className="mt-3 text-sm text-gray-600">
            Choose how you want your bookmarks organized:
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><span className="font-semibold">Category-based:</span> Organizes by content and purpose (e.g., "Development", "Finance")</li>
              <li><span className="font-semibold">Alphabetical:</span> Arranges bookmarks by first letter of title</li>
              <li><span className="font-semibold">Domain-based:</span> Groups by website/service (e.g., "Google", "GitHub")</li>
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="model" className="block text-sm font-medium text-gray-700">
            Model:
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 (Basic, Faster)</option>
              <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16k (Recommended, Good Balance)</option>
              <option value="gpt-4">GPT-4 (High Quality, Slower, More Expensive)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo (Latest, Best Quality, Most Expensive)</option>
            </select>
          </label>
          <p className="mt-2 text-sm text-gray-600">
            Advanced models like GPT-4 provide better organization quality but cost more tokens. 
            GPT-4 models may require specific API access rights in your OpenAI account.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
            Temperature: {temperature}
            <input
              type="range"
              id="temperature"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="mt-2 block w-full"
            />
          </label>
          <p className="mt-2 text-sm text-gray-600">
            Lower values (0) make output more focused and deterministic. Higher values (1) make output more creative and varied.
          </p>
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={useBatchProcessing}
              onChange={(e) => setUseBatchProcessing(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mr-2"
            />
            Use batch processing for large collections
          </label>
          <p className="mt-2 text-sm text-gray-600">
            Processes large bookmark collections in smaller batches. Recommended for collections with more than 100 bookmarks.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <button
          onClick={handleOrganize}
          disabled={loading || !apiKey || !parsedBookmarks}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Organize Bookmarks'}
        </button>
        
        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Reset & Start Over
        </button>
      </div>
    </div>
  );
};

export default Organization; 