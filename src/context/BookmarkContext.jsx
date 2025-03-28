import { createContext, useState, useContext } from 'react';

const BookmarkContext = createContext();

export const useBookmarkContext = () => useContext(BookmarkContext);

export const BookmarkProvider = ({ children }) => {
  const [originalBookmarks, setOriginalBookmarks] = useState(null);
  const [parsedBookmarks, setParsedBookmarks] = useState(null);
  const [organizedBookmarks, setOrganizedBookmarks] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState({ message: '', isError: false });
  const [isUsingCurrentBookmarks, setIsUsingCurrentBookmarks] = useState(false);
  
  const setStatusMessage = (message, isError = false) => {
    setStatus({ message, isError });
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
    isUsingCurrentBookmarks,
    setIsUsingCurrentBookmarks
  };
  
  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}; 