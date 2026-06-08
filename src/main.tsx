import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// TRIGGER FINAL MIGRATION AUTOMATICALLY IN BROWSER
setTimeout(() => {
  import('./utils/oneTimeMigration').then(m => {
    m.runOneTimeCollectionMigration('participants').then(res => console.log('Final Migration Participants:', res)).catch(console.error);
  });
}, 500);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
