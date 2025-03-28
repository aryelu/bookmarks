import React, { useContext } from 'react';
import { BookmarkContext } from '../context/BookmarkContext';

const Status = () => {
  const { status } = useContext(BookmarkContext);
  
  // Don't render anything if there's no message
  if (!status.message) {
    return null;
  }
  
  // Determine CSS class based on status type
  const statusClass = `status ${status.type}`;
  
  return (
    <div className={statusClass}>
      {status.message}
    </div>
  );
};

export default Status; 