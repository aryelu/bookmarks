import { useBookmarkContext } from '../context/BookmarkContext';
import ImportExport from './ImportExport';
import OrganizationOptions from './OrganizationOptions';
import CategoryEditor from './CategoryEditor';
import Preview from './Preview';

const App = () => {
  const { currentStep, status } = useBookmarkContext();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ImportExport />;
      case 2:
        return <OrganizationOptions />;
      case 3:
        return <CategoryEditor />;
      case 4:
        return <Preview />;
      default:
        return <ImportExport />;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Access Bookmarks';
      case 2:
        return 'Organize with AI';
      case 3:
        return 'Edit Categories';
      case 4:
        return 'Preview & Apply';
      default:
        return 'Step';
    }
  };

  return (
    <div className="app-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>AI Bookmark Organizer</h1>
        <p style={{ margin: '0', color: '#666' }}>
          Intelligently organize your Chrome bookmarks with OpenAI
        </p>
      </header>

      <div className="step-indicator" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '20px',
        position: 'relative'
      }}>
        {[1, 2, 3, 4].map(step => (
          <div
            key={step}
            className={`step ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div
              className="step-number"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: currentStep === step ? '#4b84f5' : currentStep > step ? '#a3c2f8' : '#e0e0e0',
                color: currentStep >= step ? 'white' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 5px auto'
              }}
            >
              {step}
            </div>
            <div className="step-title" style={{ 
              fontSize: '12px', 
              fontWeight: currentStep === step ? 'bold' : 'normal',
              color: currentStep === step ? '#4b84f5' : '#666'
            }}>
              {step === 1 && 'Access'}
              {step === 2 && 'Organize'}
              {step === 3 && 'Edit'}
              {step === 4 && 'Apply'}
            </div>
          </div>
        ))}
        
        {/* Progress line */}
        <div className="progress-line" style={{
          position: 'absolute',
          top: '25px',
          left: '15%',
          right: '15%',
          height: '2px',
          backgroundColor: '#e0e0e0',
          zIndex: 0
        }}>
          <div style={{
            height: '100%',
            width: `${Math.max(0, (currentStep - 1) / 3) * 100}%`,
            backgroundColor: '#4b84f5',
            transition: 'width 0.3s'
          }}></div>
        </div>
      </div>

      <div className="step-content" style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '15px' }}>
          {getStepTitle()}
        </h2>
        
        {status.message && (
          <div className={`status-message ${status.isError ? 'error' : 'success'}`} style={{
            padding: '10px',
            marginBottom: '15px',
            borderRadius: '4px',
            backgroundColor: status.isError ? '#ffebee' : '#e8f5e9',
            color: status.isError ? '#c62828' : '#2e7d32',
            fontSize: '14px'
          }}>
            {status.message}
          </div>
        )}
        
        {renderStep()}
      </div>
      
      <footer style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
        <p>
          AI Bookmark Organizer | 
          <a href="https://github.com/yourusername/ai-bookmark-organizer" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px', color: '#4b84f5', textDecoration: 'none' }}>
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App; 