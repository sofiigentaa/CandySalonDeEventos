import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import './index.css';

// Guard against cross-origin property inspection errors in sandboxed iframes
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || (event.error && event.error.message) || '';
    if (
      msg.includes('cross-origin') ||
      msg.includes('$$typeof') ||
      msg.includes('Permission denied')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('Safely handled cross-origin security exception:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
