import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, size = 'md', inline = false }) => {
  const spinnerSize = size === 'sm' ? '1rem' : size === 'lg' ? '3rem' : '2rem';
  const borderWidth = size === 'sm' ? '2px' : '3px';

  if (inline || size === 'sm') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <div className="spinner" style={{ width: spinnerSize, height: spinnerSize, borderWidth }} />
        {message && <span style={{ fontSize: '0.8125rem' }}>{message}</span>}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '1rem' }}>
      <div className="spinner" style={{ width: spinnerSize, height: spinnerSize, borderWidth }} />
      {message && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{message}</p>}
    </div>
  );
};

