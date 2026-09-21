import React from 'react';

interface BadgeProps {
  variant?: 'owner' | 'admin' | 'member' | 'healthy' | 'unhealthy' | 'ready' | 'draft' | 'warning' | 'active' | 'default' | 'primary' | 'success' | 'danger' | 'info';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'member', children }) => {
  return <span className={`badge badge-${variant}`}>{children}</span>;
};
