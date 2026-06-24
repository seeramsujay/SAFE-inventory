import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0C10] text-[#D1D4DC] flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-[#12151C] border-2 border-[#FFC400] p-8 shadow-2xl relative overflow-hidden">
            {/* Warning strip at top */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#FFC400] repeating-warning-strip" />

            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-16 h-16 bg-[#FFC400]/10 border border-[#FFC400]/40 flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-[#FFC400]" />
              </div>

              <h1 className="text-2xl font-black text-white tracking-wide uppercase mb-1">
                सिस्टम त्रुटि / System Error
              </h1>
              <p className="text-[#FFC400] text-xs font-mono tracking-widest uppercase font-bold mb-6">
                Critical Failure Intercepted
              </p>

              <div className="w-full bg-[#0A0C10] border border-[#FF6B00]/20 p-4 mb-6 text-left font-mono text-sm overflow-x-auto text-[#FF6B00]">
                <p className="font-bold mb-1">Error Message:</p>
                <p className="text-[#D1D4DC]">{this.state.error?.toString()}</p>
              </div>

              <p className="text-sm text-[#8A94A6] mb-8 max-w-md">
                कुछ गलत हो गया। कृपया पृष्ठ को रीफ्रेश करें। यदि समस्या बनी रहती है, तो संयंत्र व्यवस्थापक से संपर्क करें।
                <br />
                <span className="text-xs opacity-60">
                  (Something went wrong. Please refresh. If this persists, contact the plant supervisor.)
                </span>
              </p>

              <div className="flex gap-4 w-full justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 bg-[#FFC400] hover:bg-[#E5B000] text-black font-bold uppercase tracking-wider text-xs px-6 py-4 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  रीफ्रेश करें / Refresh Portal
                </button>
              </div>

              {this.state.errorInfo && (
                <details className="w-full mt-8 text-left">
                  <summary className="text-xs text-[#8A94A6] cursor-pointer hover:text-white transition-colors font-bold uppercase tracking-wider font-mono">
                    Technical Stack Trace
                  </summary>
                  <pre className="mt-4 p-4 bg-[#0A0C10] text-[11px] font-mono overflow-auto max-h-60 text-left border border-white/10 text-red-400">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
