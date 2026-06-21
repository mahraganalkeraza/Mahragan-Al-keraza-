import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Build Version Identifier: v1.1.2-church-lock-fix-v4 (Trigger Production Recompile)
const CURRENT_APP_VERSION = "v1.1.2-church-lock-fix-v4";
const storedAppVersion = localStorage.getItem('__system_app_version__');

if (storedAppVersion !== CURRENT_APP_VERSION) {
  localStorage.setItem('__system_app_version__', CURRENT_APP_VERSION);
  // Optional: Unregister obsolete service workers if present and trigger a hard reload
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).finally(() => {
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
