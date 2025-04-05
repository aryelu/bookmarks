import React, { useContext } from 'react';
import { BookmarkContext } from '../context/BookmarkContext';
import ImportExport from './ImportExport';
import Organization from './Organization';
import CategoryEditor from './CategoryEditor';
import Preview from './Preview';
import Status from './Status';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';

// Import DevControls only in development mode
const DevControls = process.env.NODE_ENV === 'development' 
  ? React.lazy(() => import('./DevControls')) 
  : null;

function App() {
  const { currentStep, status } = useContext(BookmarkContext);
  const isDev = process.env.NODE_ENV === 'development' || process.env.IS_DEV;

  return (
    <ThemeProvider defaultTheme="system" storageKey="bookmarks-theme">
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl min-w-[400px] mx-auto p-5 font-sans">
          <header className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Bookmark Organizer</h1>
            <ThemeToggle />
          </header>

          {isDev && DevControls && (
            <React.Suspense fallback={<div>Loading dev controls...</div>}>
              <DevControls />
            </React.Suspense>
          )}

          <main className="bg-card rounded-lg shadow-md p-6 mb-6">
            <Status />
            
            <div className="space-y-6">
              <div className={`${currentStep === 1 ? 'block' : 'hidden'}`}>
                <h2 className="text-lg font-medium pb-3 mb-4 border-b border-border">1. Access Bookmarks</h2>
                {currentStep === 1 && <ImportExport />}
              </div>
              
              <div className={`${currentStep === 2 ? 'block' : 'hidden'}`}>
                <h2 className="text-lg font-medium pb-3 mb-4 border-b border-border">2. Organize</h2>
                {currentStep === 2 && <Organization />}
              </div>
              
              <div className={`${currentStep === 3 ? 'block' : 'hidden'}`}>
                <h2 className="text-lg font-medium pb-3 mb-4 border-b border-border">3. Edit Categories</h2>
                {currentStep === 3 && <CategoryEditor />}
              </div>
              
              <div className={`${currentStep === 4 ? 'block' : 'hidden'}`}>
                <h2 className="text-lg font-medium pb-3 mb-4 border-b border-border">4. Preview & Apply</h2>
                {currentStep === 4 && <Preview />}
              </div>
            </div>
          </main>
          
          <footer className="text-center text-sm text-muted-foreground py-4">
            <p>&copy; {new Date().getFullYear()} Bookmark Organizer</p>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App; 