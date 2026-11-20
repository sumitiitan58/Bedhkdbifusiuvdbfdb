import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { BrandLogo } from './BrandLogo';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PREPSKM ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFBFD] dark:bg-[#0B1120] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-5">
            <div className="flex justify-center">
              <BrandLogo variant="navbar" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#0F214D] dark:text-white">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words">
              {this.state.errorMessage.length > 260
                ? `${this.state.errorMessage.slice(0, 260)}...`
                : this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F214D] hover:bg-[#183270] dark:bg-sky-500 dark:text-slate-950 rounded-xl transition-colors"
            >
              Reload PREPSKM.IN
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
