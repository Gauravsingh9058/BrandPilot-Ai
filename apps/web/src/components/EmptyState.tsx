import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 1.5rem',
        border: '1px dashed var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255, 255, 255, 0.01)'
      }}
    >
      {icon && <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>{icon}</div>}
      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.375rem' }}>{title}</h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', marginBottom: action ? '1.25rem' : 0 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
