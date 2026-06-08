import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// TRIGGER FINAL MIGRATION AND SWEEP RECOVERY AUTOMATICALLY IN BROWSER
setTimeout(() => {
  import('./utils/oneTimeMigration').then(m => {
    // 1. Recover all hidden, alternate collection or duplicate table registries (stuck yesterday)
    m.recoverAllSecretAndLockedData()
      .then(log => console.log('[Recovery Secret/Locked data sweep output]:', log))
      .catch(err => console.error('[Recovery Error]:', err));

    // 2. Run background migration for all key collections to keep Supabase primary tables synchronized
    m.runOneTimeCollectionMigration('participants')
      .then(res => console.log('Final Migration Participants:', res))
      .catch(console.error);

    m.runOneTimeCollectionMigration('orders')
      .then(res => console.log('Final Migration Book Requests (Orders) Completed:', res))
      .catch(console.error);

    m.runOneTimeCollectionMigration('results')
      .then(res => console.log('Final Migration Results Completed:', res))
      .catch(console.error);

    m.runOneTimeCollectionMigration('activityTeams')
      .then(res => console.log('Final Migration Teams Completed:', res))
      .catch(console.error);
  });
}, 500);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
