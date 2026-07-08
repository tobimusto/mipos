import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
          <div className="bg-surface border border-border p-8 rounded-2xl max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Algo salió mal</h1>
            <p className="text-muted mb-6">
              Ocurrió un error inesperado. Por favor, recargá la página para intentar nuevamente.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-6 rounded-xl transition-colors w-full"
            >
              Recargar página
            </button>
            {import.meta.env.DEV && (
              <div className="mt-6 text-left bg-black/50 p-4 rounded-xl overflow-auto text-sm md:text-[15px] text-red-400">
                <p className="font-bold mb-2">{this.state.error?.toString()}</p>
                <pre>{this.state.error?.stack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
