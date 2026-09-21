import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button.js';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught unhandled React exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-main, #0b0f19)',
            color: 'var(--color-text-main, #f8fafc)',
            padding: '2rem'
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              background: 'var(--color-bg-card, #131b2e)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '2.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                marginBottom: '1.5rem'
              }}
            >
              <ShieldAlert size={32} />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Something Went Wrong
            </h1>
            <p
              style={{
                color: 'var(--color-text-muted, #94a3b8)',
                fontSize: '0.95rem',
                marginBottom: '1.5rem',
                lineHeight: 1.5
              }}
            >
              An unexpected error occurred while rendering this interface. BrandPilot AI has captured this error safely.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '1rem',
                  fontSize: '0.85rem',
                  color: '#fca5a5',
                  fontFamily: 'monospace',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '2rem'
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Button variant="secondary" onClick={this.handleGoHome}>
                <Home size={16} style={{ marginRight: '0.5rem' }} /> Go to Dashboard
              </Button>
              <Button variant="primary" onClick={this.handleReload}>
                <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
