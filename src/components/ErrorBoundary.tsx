import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global safety net: without this, any uncaught error while rendering a modal
 * (EventModal, RemindersModal, etc.) unmounts the whole React tree and leaves
 * a blank white page with zero explanation. This catches that and shows a
 * recoverable screen instead, plus logs the real error to the console so it
 * can be diagnosed.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed with an uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Ocurrió un error inesperado</h2>
              <p className="text-xs text-slate-500 mt-1">
                Algo falló al mostrar esta pantalla. Tus datos guardados no se perdieron. Probá recargar la página.
              </p>
              {this.state.error && (
                <p className="text-[10px] text-slate-400 mt-2 font-mono break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recargar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
