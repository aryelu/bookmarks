import React, { useContext } from 'react';
import { BookmarkContext } from '../context/BookmarkContext';
import ImportExport from './ImportExport';
import Organization from './Organization';
import CategoryEditor from './CategoryEditor';
import Preview from './Preview';
import Status from './Status';
import '../styles/App.css';

// Import DevControls only in development mode
const DevControls = process.env.NODE_ENV === 'development' 
  ? React.lazy(() => import('./DevControls')) 
  : null;

function App() {
  const { currentStep, status } = useContext(BookmarkContext);
  const isDev = process.env.NODE_ENV === 'development' || process.env.IS_DEV;

  return (
    <div className="App">
      <header>
        <h1>Bookmark Organizer</h1>
      </header>

      {isDev && DevControls && (
        <React.Suspense fallback={<div>Loading dev controls...</div>}>
          <DevControls />
        </React.Suspense>
      )}

      <main>
        <Status />
        
        <div className="steps-container">
          <div className={`step ${currentStep === 1 ? 'active' : ''}`}>
            <h2 className="step-title">1. Access Bookmarks</h2>
            {currentStep === 1 && <ImportExport />}
          </div>
          
          <div className={`step ${currentStep === 2 ? 'active' : ''}`}>
            <h2 className="step-title">2. Organize</h2>
            {currentStep === 2 && <Organization />}
          </div>
          
          <div className={`step ${currentStep === 3 ? 'active' : ''}`}>
            <h2 className="step-title">3. Edit Categories</h2>
            {currentStep === 3 && <CategoryEditor />}
          </div>
          
          <div className={`step ${currentStep === 4 ? 'active' : ''}`}>
            <h2 className="step-title">4. Preview & Apply</h2>
            {currentStep === 4 && <Preview />}
          </div>
        </div>
      </main>
      
      <footer>
        <p>&copy; {new Date().getFullYear()} Bookmark Organizer</p>
      </footer>
    </div>
  );
}

export default App; 