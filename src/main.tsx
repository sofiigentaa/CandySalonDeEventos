import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
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

// Sin sesión iniciada no se muestra nada del salón.
function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-400">Cargando…</div>;
  }
  return user ? <App /> : <LoginScreen />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
