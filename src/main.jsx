import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import { BookmarkProvider } from './context/BookmarkContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BookmarkProvider>
      <App />
    </BookmarkProvider>
  </React.StrictMode>,
)
