import { useState, useEffect } from 'react';
import { useBookmarkContext } from '../context/BookmarkContext';
import { organizeBookmarksWithOpenAI, testApiKey } from '../services/openaiService';
import { saveApiKey, loadApiKey, clearApiKey } from '../services/storageService';

const OrganizationOptions = () => {
  const [organizing, setOrganizing] = useState(false);
  const [selectedOption, setSelectedOption] = useState('category');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [rememberKey, setRememberKey] = useState(false);
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);
  
  const { 
    parsedBookmarks,
    setOrganizedBookmarks,
    moveToNextStep,
    setStatusMessage,
    isUsingCurrentBookmarks
  } = useBookmarkContext();
  
  // Load saved API key on component mount
  useEffect(() => {
    const getApiKey = async () => {
      try {
        const savedKey = await loadApiKey();
        if (savedKey) {
          setApiKey(savedKey);
          setRememberKey(true);
        }
      } catch (error) {
        console.error('Failed to load API key:', error);
      } finally {
        setKeyLoaded(true);
      }
    };
    
    getApiKey();
  }, []);
  
  const handleTestApiKey = async () => {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setKeyStatus({
        valid: false,
        message: 'Please enter an API key first'
      });
      return;
    }
    
    setTestingKey(true);
    setKeyStatus(null);
    
    try {
      const result = await testApiKey(trimmedApiKey);
      setKeyStatus(result);
      
      if (result.valid) {
        setStatusMessage('API key verified successfully!');
      } else {
        setStatusMessage(result.message, true);
      }
    } catch (error) {
      setKeyStatus({
        valid: false,
        message: error.message || 'Error testing API key'
      });
      setStatusMessage(error.message || 'Error testing API key', true);
    } finally {
      setTestingKey(false);
    }
  };
  
  const handleOrganize = async () => {
    if (!parsedBookmarks) {
      setStatusMessage('No bookmarks to organize', true);
      return;
    }
    
    // Debug log the bookmark structure
    console.log("Parsed bookmarks structure:", parsedBookmarks);
    
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setStatusMessage('OpenAI API key is required', true);
      return;
    }
    
    // Validate API key format
    if (!trimmedApiKey.startsWith('sk-') || trimmedApiKey.length < 30) {
      setStatusMessage('Invalid API key format. OpenAI API keys should start with "sk-" and be at least 30 characters', true);
      return;
    }
    
    // Count total bookmarks to warn about potential token limits
    const countTotalBookmarks = (node) => {
      if (!node.children) return 1; // It's a bookmark
      return node.children.reduce((sum, child) => sum + countTotalBookmarks(child), 0);
    };
    
    const totalBookmarks = countTotalBookmarks(parsedBookmarks);
    console.log(`Total bookmarks to organize: ${totalBookmarks}`);
    
    if (totalBookmarks > 200) {
      const confirmLarge = confirm(
        `You are about to organize ${totalBookmarks} bookmarks, which may exceed OpenAI's token limits. ` +
        `This could result in incomplete organization or errors. ` +
        `Check the browser console logs after submitting to see the full request data for manual testing. ` +
        `\n\nDo you want to continue?`
      );
      if (!confirmLarge) {
        return;
      }
    }
    
    setOrganizing(true);
    setStatusMessage('Sending to OpenAI for organization...');
    
    try {
      // Save API key if requested
      await saveApiKey(trimmedApiKey, rememberKey);
      
      const organized = await organizeBookmarksWithOpenAI(
        parsedBookmarks, 
        selectedOption, 
        trimmedApiKey
      );
      setOrganizedBookmarks(organized);
      setStatusMessage('Bookmarks organized successfully with OpenAI!');
      moveToNextStep();
    } catch (error) {
      console.error('Error organizing bookmarks:', error);
      
      // Check for token limit errors
      if (error.message.includes('context length') || error.message.includes('token')) {
        setStatusMessage(
          'Your bookmark collection is too large for the API. ' +
          'Check the browser console logs for the request data to try manually in the OpenAI playground.',
          true
        );
      } else {
        setStatusMessage(error.message || 'Organization failed. Please try again.', true);
      }
    } finally {
      setOrganizing(false);
    }
  };
  
  const handleForgetKey = async () => {
    try {
      await clearApiKey();
      setApiKey('');
      setRememberKey(false);
      setKeyStatus(null);
      setStatusMessage('API key removed from storage');
    } catch (error) {
      setStatusMessage(`Failed to remove API key: ${error.message}`, true);
    }
  };
  
  const handleDebugBookmarks = () => {
    if (!parsedBookmarks) {
      setStatusMessage('No bookmarks to debug', true);
      return;
    }

    // Count different node types
    let folderCount = 0;
    let bookmarkCount = 0;
    let otherCount = 0;
    
    const countTypes = (node) => {
      if (node.url) {
        bookmarkCount++;
      } else if (node.children) {
        folderCount++;
        node.children.forEach(countTypes);
      } else {
        otherCount++;
      }
    };
    
    countTypes(parsedBookmarks);
    
    // Log bookmark structure for debugging
    console.log("Complete bookmark structure:", parsedBookmarks);
    console.log(`Structure contains: ${folderCount} folders, ${bookmarkCount} bookmarks, ${otherCount} unknown nodes`);
    
    setStatusMessage(`Bookmark structure contains: ${folderCount} folders, ${bookmarkCount} bookmarks. Check the browser console for details.`);
  };
  
  if (!keyLoaded) {
    return <div>Loading saved settings...</div>;
  }
  
  return (
    <div>
      <p>
        {isUsingCurrentBookmarks 
          ? "Choose how you'd like your current Chrome bookmarks to be organized:" 
          : "Choose how you'd like your imported bookmarks to be organized:"}
      </p>
      
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          <input
            type="radio"
            name="organizationType"
            value="category"
            checked={selectedOption === 'category'}
            onChange={() => setSelectedOption('category')}
          />
          {' '}
          By Category (Groups similar websites)
        </label>
        
        <label style={{ display: 'block', marginBottom: '8px' }}>
          <input
            type="radio"
            name="organizationType"
            value="alphabetical"
            checked={selectedOption === 'alphabetical'}
            onChange={() => setSelectedOption('alphabetical')}
          />
          {' '}
          Alphabetical (A-Z grouping)
        </label>
        
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <input
            type="radio"
            name="organizationType"
            value="frequency"
            checked={selectedOption === 'frequency'}
            onChange={() => setSelectedOption('frequency')}
          />
          {' '}
          By Usage Pattern
        </label>
      </div>
      
      <div className="api-key-section" style={{ marginBottom: '16px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>OpenAI API Key</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}>
          Your API key is required to use OpenAI for organization.
        </p>
        
        <div style={{ display: 'flex', marginBottom: '5px' }}>
          <input 
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              // Reset key status when key changes
              if (keyStatus) setKeyStatus(null);
            }}
            placeholder="Enter your OpenAI API key"
            style={{ 
              flex: '1', 
              padding: '8px', 
              border: `1px solid ${keyStatus?.valid === false ? '#f44336' : keyStatus?.valid === true ? '#4caf50' : '#ccc'}`, 
              borderRadius: '4px'
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowApiKey(!showApiKey)}
            style={{ marginLeft: '5px' }}
          >
            {showApiKey ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {keyStatus && (
          <div 
            className="key-status" 
            style={{ 
              fontSize: '13px', 
              color: keyStatus.valid ? '#4caf50' : '#f44336',
              padding: '5px 0' 
            }}
          >
            {keyStatus.message}
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestApiKey}
            disabled={testingKey || !apiKey.trim()}
            style={{ fontSize: '12px', padding: '4px 8px', marginRight: '10px' }}
          >
            {testingKey ? 'Verifying...' : 'Verify API Key'}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDebugBookmarks}
            style={{ fontSize: '12px', padding: '4px 8px', marginRight: '10px' }}
          >
            Debug Bookmarks
          </button>
          
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
            <input 
              type="checkbox" 
              checked={rememberKey} 
              onChange={(e) => setRememberKey(e.target.checked)} 
              style={{ marginRight: '5px' }}
            />
            Remember API key
          </label>
          
          {rememberKey && (
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleForgetKey}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              Forget Key
            </button>
          )}
        </div>
        
        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
          <a 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Get an API key from OpenAI
          </a>
        </div>
      </div>

      <div className="privacy-notice" style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <strong>Privacy Notice:</strong>
        <p>
          When you use the OpenAI integration, your bookmark titles and domain names (but not full URLs) 
          are sent to OpenAI for processing. No personal information is collected or stored by our extension 
          beyond what you choose to save locally.
        </p>
        <p>
          If privacy is a concern, you can use general category names for sensitive bookmarks before exporting them.
        </p>
      </div>
      
      <button 
        className="btn" 
        onClick={handleOrganize} 
        disabled={organizing || !apiKey.trim()}
        style={{ marginTop: '16px' }}
      >
        {organizing ? 'Organizing with AI...' : 'Organize with OpenAI'}
      </button>
    </div>
  );
};

export default OrganizationOptions; 