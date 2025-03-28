import { createContext, useState, useContext } from 'react';

export const BookmarkContext = createContext();

export const useBookmarkContext = () => useContext(BookmarkContext);

export const BookmarkProvider = ({ children }) => {
  const [originalBookmarks, setOriginalBookmarks] = useState(null);
  const [parsedBookmarks, setParsedBookmarks] = useState(null);
  const [organizedBookmarks, setOrganizedBookmarks] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isUsingCurrentBookmarks, setIsUsingCurrentBookmarks] = useState(false);
  
  const setStatusMessage = (type, message) => {
    // Validate type
    const validTypes = ['success', 'error', 'info', 'warning'];
    const statusType = validTypes.includes(type) ? type : 'info';
    
    setStatus({ message, type: statusType });
    
    // Automatically clear success and info messages after 5 seconds
    if (statusType === 'success' || statusType === 'info') {
      setTimeout(() => {
        setStatus(prev => {
          // Only clear if it's the same message (prevent clearing newer messages)
          if (prev.message === message) {
            return { message: '', type: '' };
          }
          return prev;
        });
      }, 5000);
    }
  };
  
  const clearStatusMessage = () => {
    setStatus({ message: '', type: '' });
  };
  
  const moveToNextStep = () => {
    setCurrentStep(prev => prev + 1);
  };
  
  const moveToStep = (step) => {
    setCurrentStep(step);
  };
  
  const value = {
    originalBookmarks,
    setOriginalBookmarks,
    parsedBookmarks,
    setParsedBookmarks,
    organizedBookmarks,
    setOrganizedBookmarks,
    currentStep,
    moveToNextStep,
    moveToStep,
    status,
    setStatusMessage,
    clearStatusMessage,
    isUsingCurrentBookmarks,
    setIsUsingCurrentBookmarks
  };
  
  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}; 