import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// كود إجباري لتحديث المتصفح تلقائياً عند نزول نسخة جديدة
const CURRENT_VERSION = "v1.2.0-church-lock"; // المبرمج يغير الرقم ده مع كل رفعة

if (localStorage.getItem("app_version") !== CURRENT_VERSION) {
  localStorage.setItem("app_version", CURRENT_VERSION);
  window.location.reload(); // بيعمل ريفريش إجباري للمتصفح ويمسح الكاش تلقائياً
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
