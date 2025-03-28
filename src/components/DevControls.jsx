import React, { useState, useContext } from 'react';
import { BookmarkContext } from '../context/BookmarkContext';
import { initMockBookmarks } from '../services/mockChromeAPI';

const DevControls = () => {
  const [dataSize, setDataSize] = useState(300);
  const [mockApiKey, setMockApiKey] = useState(localStorage.getItem('mockApiKey') || '');
  const { 
    setOriginalBookmarks, 
    setParsedBookmarks,
    moveToNextStep,
    setStatusMessage
  } = useContext(BookmarkContext);

  const handleLoadSampleData = () => {
    const bookmarks = initMockBookmarks(false);
    setOriginalBookmarks(bookmarks);
    setParsedBookmarks(bookmarks);
    setStatusMessage('success', 'Sample bookmarks loaded! You can now proceed to the next step.');
    moveToNextStep();
  };

  const handleLoadLargeData = () => {
    const size = parseInt(dataSize, 10) || 300;
    const bookmarks = initMockBookmarks(true, size);
    setOriginalBookmarks(bookmarks);
    setParsedBookmarks(bookmarks);
    setStatusMessage('success', `Large sample with ${size} bookmarks loaded! You can now proceed to the next step.`);
    moveToNextStep();
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('mockApiKey', mockApiKey);
    setStatusMessage('success', 'OpenAI API key saved to localStorage.');
  };

  const handleCopyApiRequest = () => {
    const requestText = `curl -X POST https://api.openai.com/v1/chat/completions \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer YOUR_API_KEY" \\
-d '{
  "model": "gpt-3.5-turbo-16k",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant for organizing bookmarks into a logical folder structure."
    },
    {
      "role": "user",
      "content": "Please organize these bookmarks into a logical folder structure. Keep the existing structure where it makes sense, but feel free to reorganize where needed for better organization: [BOOKMARKS JSON HERE]"
    }
  ],
  "temperature": 0.7
}'`;
    
    navigator.clipboard.writeText(requestText);
    setStatusMessage('success', 'API request copied to clipboard!');
  };

  return (
    <div style={{ 
      background: '#f0f8ff', 
      padding: '15px', 
      margin: '15px 0', 
      border: '1px solid #ccc',
      borderRadius: '5px'
    }}>
      <h3>Development Controls</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button onClick={handleLoadSampleData} style={{ marginRight: '10px' }}>
          Load Sample Data
        </button>
        
        <button onClick={handleLoadLargeData}>
          Load Large Sample
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
          <label htmlFor="dataSize" style={{ marginRight: '10px' }}>Sample Size:</label>
          <input 
            type="number" 
            id="dataSize"
            value={dataSize} 
            onChange={(e) => setDataSize(e.target.value)}
            style={{ width: '70px' }}
          />
          <span style={{ marginLeft: '10px' }}>bookmarks</span>
        </div>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <h4>Mock OpenAI API</h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <label htmlFor="apiKey" style={{ marginRight: '10px' }}>API Key:</label>
          <input 
            type="password" 
            id="apiKey"
            value={mockApiKey} 
            onChange={(e) => setMockApiKey(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleSaveApiKey} style={{ marginLeft: '10px' }}>
            Save Key
          </button>
        </div>
        
        <button onClick={handleCopyApiRequest}>
          Copy OpenAI Request Template
        </button>
      </div>
    </div>
  );
};

export default DevControls; 