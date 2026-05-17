import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text)' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '16px' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text2)', marginBottom: '24px' }}>
            {this.state.error?.message || "An unexpected error occurred while communicating with the Insuro AI service."}
          </p>
          <button 
            className="btn btn-outline" 
            onClick={() => window.location.reload()}
          >
            Retry Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
