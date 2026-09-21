import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, className = '', style = {} }) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--danger-glow)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#fca5a5',
        fontSize: '0.875rem',
        marginBottom: '1.25rem',
        ...style
      }}
    >
      <AlertCircle size={18} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
};
