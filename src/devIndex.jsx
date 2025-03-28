import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { BookmarkProvider } from './context/BookmarkContext';
import { initMockBookmarks } from './services/mockChromeAPI';
import './styles/index.css';

// Initialize mock bookmarks
initMockBookmarks();

// Development mode wrapper to show a visual indicator
const DevWrapper = () => {
  return (
    <div className="dev-wrapper">
      {/* Development mode indicator */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ff8c00',
          color: 'white',
          textAlign: 'center',
          padding: '4px 0',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 1000
        }}
      >
        DEVELOPMENT MODE
      </div>
      
      <BookmarkProvider>
        <App />
      </BookmarkProvider>
    </div>
  );
};

// Create root and render the app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DevWrapper />
  </React.StrictMode>
); 