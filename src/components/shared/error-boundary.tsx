"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Something went wrong</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4 max-w-md">
            We hit an unexpected error. Try refreshing, or contact support if
            it keeps happening.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
