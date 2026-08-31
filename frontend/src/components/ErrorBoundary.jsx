import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-background font-sans text-foreground">
          <div className="max-w-md w-full bg-white border border-border rounded-xl shadow-card p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-railway-red font-bold text-sm">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-railway-red border border-red-200 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
              </div>
              <span>Unexpected View Error</span>
            </div>
            
            <p className="text-xs text-muted leading-relaxed">
              An unexpected render error occurred in this view. The application state has been preserved.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-50 border border-border rounded-lg text-[11px] font-mono text-muted break-words">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-navy hover:bg-navy-light text-white font-semibold text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
