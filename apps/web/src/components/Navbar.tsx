import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, LogOut, ChevronDown, Layers, Plus, Brain, LayoutDashboard, Compass, Megaphone, CalendarDays, Film, BarChart3, Bot, CreditCard } from 'lucide-react';

import { Badge } from './Badge.js';
import { AIProviderStatusBadge } from './AIProviderStatusBadge.js';

interface NavbarProps {
  onCreateWorkspace: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onCreateWorkspace }) => {
  const { user, workspaces, currentWorkspace, switchWorkspace, logout } = useAuth();
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = React.useState(false);
  const location = useLocation();

  const isDashboardActive = location.pathname === '/dashboard';
  const isBrandsActive = location.pathname.startsWith('/brands') && !location.pathname.includes('/content-plans') && !location.pathname.includes('/campaigns') && !location.pathname.includes('/marketing') && !location.pathname.includes('/reels');
  const isMarketingActive = location.pathname.includes('/marketing');
  const isCampaignsActive = location.pathname.includes('/campaigns');
  const isPlannerActive = (location.pathname.includes('/content-plans') && !location.pathname.includes('/reels')) || location.pathname === '/planner';
  const isReelsActive = location.pathname.includes('/reels');

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(8, 11, 17, 0.85)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.875rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        {/* Brand Logo & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.125rem',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                BrandPilot<span style={{ color: 'var(--accent-primary)', WebkitTextFillColor: '#818cf8' }}> AI</span>
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  lineHeight: 1
                }}
              >
                Autonomous AI Platform
              </span>
            </div>
          </Link>

          {/* Nav links */}
          {user && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                to="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isDashboardActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isDashboardActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/brands"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isBrandsActive ? '#818cf8' : 'var(--text-secondary)',
                  background: isBrandsActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <Brain size={15} />
                <span>Brand Brains</span>
              </Link>

              <Link
                to="/marketing"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isMarketingActive ? '#38bdf8' : 'var(--text-secondary)',
                  background: isMarketingActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <Compass size={15} />
                <span>Marketing Brain</span>
              </Link>

              <Link
                to="/campaigns"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isCampaignsActive ? '#f472b6' : 'var(--text-secondary)',
                  background: isCampaignsActive ? 'rgba(244, 114, 182, 0.12)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <Megaphone size={15} />
                <span>Campaigns</span>
              </Link>

              <Link
                to="/planner"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isPlannerActive ? '#a78bfa' : 'var(--text-secondary)',
                  background: isPlannerActive ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <CalendarDays size={15} />
                <span>30-Day Planner</span>
              </Link>

              <Link
                to="/reels"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: isReelsActive ? '#34d399' : 'var(--text-secondary)',
                  background: isReelsActive ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <Film size={15} />
                <span>Reel Blueprints</span>
              </Link>

              <Link
                to="/analytics"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: location.pathname.startsWith('/analytics') ? '#f59e0b' : 'var(--text-secondary)',
                  background: location.pathname.startsWith('/analytics') ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <BarChart3 size={15} />
                <span>Intelligence</span>
              </Link>

              <Link
                to="/optimization"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: location.pathname.startsWith('/optimization') ? '#a855f7' : 'var(--text-secondary)',
                  background: location.pathname.startsWith('/optimization') ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <Sparkles size={15} />
                <span>Optimization</span>
              </Link>

              <Link
                to="/autonomous"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: location.pathname.startsWith('/autonomous') ? '#38bdf8' : '#cbd5e1',
                  background: location.pathname.startsWith('/autonomous')
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  textDecoration: 'none',
                  boxShadow: location.pathname.startsWith('/autonomous') ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none'
                }}
              >
                <Bot size={15} color="#38bdf8" />
                <span>Autonomous Ops</span>
              </Link>

              <Link
                to="/billing"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: location.pathname.startsWith('/billing') ? '#10b981' : 'var(--text-secondary)',
                  background: location.pathname.startsWith('/billing') ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  textDecoration: 'none'
                }}
              >
                <CreditCard size={15} />
                <span>Billing & Plans</span>
              </Link>
            </nav>
          )}



          {/* Workspace Switcher */}
          {user && currentWorkspace && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.375rem 0.75rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Layers size={15} color="var(--accent-primary)" />
                <span>{currentWorkspace.name}</span>
                <Badge variant={currentWorkspace.role?.toLowerCase() as 'owner' | 'admin' | 'member'}>
                  {currentWorkspace.role}
                </Badge>
                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {isWorkspaceDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: '240px',
                    background: '#111622',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.375rem',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 200
                  }}
                >
                  <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Workspaces
                  </div>
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      onClick={() => {
                        switchWorkspace(ws.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: ws.id === currentWorkspace.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <span style={{ fontWeight: ws.id === currentWorkspace.id ? 600 : 400 }}>{ws.name}</span>
                      <Badge variant={ws.role?.toLowerCase() as 'owner' | 'admin' | 'member'}>{ws.role}</Badge>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.375rem', paddingTop: '0.375rem' }}>
                    <button
                      onClick={() => {
                        setIsWorkspaceDropdownOpen(false);
                        onCreateWorkspace();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Plus size={14} />
                      <span>Create Workspace</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info & Actions */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <AIProviderStatusBadge />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '0.4rem 0.875rem', fontSize: '0.8125rem' }}>
              Login
            </Link>
            <Link to="/signup" className="btn btn-primary" style={{ padding: '0.4rem 0.875rem', fontSize: '0.8125rem' }}>
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
