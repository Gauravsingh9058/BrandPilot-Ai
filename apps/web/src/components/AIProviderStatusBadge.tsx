import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, AlertTriangle, ShieldCheck, RefreshCw, X, Clock, CheckCircle2, AlertOctagon } from 'lucide-react';
import type { AIProviderDiagnosticsReport, AIUnifiedProviderStatus } from '@vidsnapai/types';
import { apiRequest } from '../lib/api.js';

export const AIProviderStatusBadge: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<AIProviderDiagnosticsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest<AIProviderDiagnosticsReport>('/api/ai/provider-status');
      setDiagnostics(res);
    } catch {
      // Non-blocking background health polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  const handleReset = async (provider?: 'gemini' | 'veo') => {
    try {
      setResetting(true);
      const res = await apiRequest<AIProviderDiagnosticsReport>('/api/ai/reset-status', {
        method: 'POST',
        body: JSON.stringify({ provider })
      });
      setDiagnostics(res);
    } catch {
      // Non-blocking
    } finally {
      setResetting(false);
    }
  };

  const getStatusColor = (status?: AIUnifiedProviderStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          bg: 'rgba(34, 197, 94, 0.12)',
          border: 'rgba(34, 197, 94, 0.35)',
          text: '#4ade80',
          glow: '0 0 10px rgba(34, 197, 94, 0.25)',
          dot: '#22c55e',
          label: 'AI Engines Online'
        };
      case 'QUOTA_EXHAUSTED':
        return {
          bg: 'rgba(234, 179, 8, 0.14)',
          border: 'rgba(234, 179, 8, 0.4)',
          text: '#facc15',
          glow: '0 0 12px rgba(234, 179, 8, 0.3)',
          dot: '#eab308',
          label: 'AI Quota Cooldown'
        };
      case 'DEGRADED':
        return {
          bg: 'rgba(249, 115, 22, 0.14)',
          border: 'rgba(249, 115, 22, 0.4)',
          text: '#fb923c',
          glow: '0 0 10px rgba(249, 115, 22, 0.25)',
          dot: '#f97316',
          label: 'AI Degraded'
        };
      case 'AUTH_ERROR':
        return {
          bg: 'rgba(239, 68, 68, 0.14)',
          border: 'rgba(239, 68, 68, 0.4)',
          text: '#f87171',
          glow: '0 0 12px rgba(239, 68, 68, 0.3)',
          dot: '#ef4444',
          label: 'API Key Required'
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.3)',
          text: '#94a3b8',
          glow: 'none',
          dot: '#94a3b8',
          label: 'AI Connecting...'
        };
    }
  };

  const currentTheme = getStatusColor(diagnostics?.providerStatus);

  return (
    <>
      {/* Navbar Trigger Pill */}
      <button
        onClick={() => setIsModalOpen(true)}
        type="button"
        title="Click to view Gemini 3.6 & Veo 3.1 AI Provider Diagnostics"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          background: currentTheme.bg,
          border: `1px solid ${currentTheme.border}`,
          color: currentTheme.text,
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: currentTheme.glow
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: currentTheme.dot,
            display: 'inline-block',
            boxShadow: `0 0 6px ${currentTheme.dot}`
          }}
        />
        <Sparkles size={13} color={currentTheme.text} />
        <span>{diagnostics ? currentTheme.label : 'Checking AI...'}</span>
      </button>

      {/* Diagnostics Modal */}
      {isModalOpen && diagnostics && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              color: '#f8fafc',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Sparkles size={18} color="#818cf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>AI Provider Diagnostics</h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time Gemini & Veo health state</span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  padding: '0.4rem',
                  cursor: 'pointer',
                  display: 'flex'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Provider Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1.25rem' }}>
              {/* Gemini 3.6 Card */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${diagnostics.geminiStatus === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.4)'}`,
                  borderRadius: '12px',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>TEXT & BLUEPRINTS</span>
                  {diagnostics.geminiStatus === 'AVAILABLE' ? (
                    <CheckCircle2 size={15} color="#4ade80" />
                  ) : (
                    <AlertTriangle size={15} color="#facc15" />
                  )}
                </div>
                <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  {diagnostics.geminiModel}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: diagnostics.geminiStatus === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                    color: diagnostics.geminiStatus === 'AVAILABLE' ? '#4ade80' : '#facc15'
                  }}
                >
                  {diagnostics.geminiStatus}
                </span>
              </div>

              {/* Veo 3.1 Card */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${diagnostics.veoStatus === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.4)'}`,
                  borderRadius: '12px',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>CINEMATIC VIDEO</span>
                  {diagnostics.veoStatus === 'AVAILABLE' ? (
                    <CheckCircle2 size={15} color="#4ade80" />
                  ) : (
                    <AlertTriangle size={15} color="#facc15" />
                  )}
                </div>
                <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                  {diagnostics.veoModel}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: diagnostics.veoStatus === 'AVAILABLE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                    color: diagnostics.veoStatus === 'AVAILABLE' ? '#4ade80' : '#facc15'
                  }}
                >
                  {diagnostics.veoStatus}
                </span>
              </div>
            </div>

            {/* Quota & Circuit Breaker Status Banner */}
            {(diagnostics.quotaState.isGeminiExhausted || diagnostics.quotaState.isVeoExhausted) && (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  borderRadius: '10px',
                  padding: '0.875rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.625rem'
                }}
              >
                <Clock size={18} color="#facc15" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.825rem', color: '#facc15', fontWeight: 700 }}>
                    AI Quota Cooldown Active
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    Google Gemini / Veo rate limits reached. The circuit breaker has paused immediate retries to prevent hammering the provider.
                    {diagnostics.quotaState.veoRetryAfterMs && (
                      <span style={{ display: 'block', marginTop: '4px', fontWeight: 600 }}>
                        Veo Cooldown: ~{Math.ceil(diagnostics.quotaState.veoRetryAfterMs / 1000)}s remaining
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Last Error Notice (Sanitized) */}
            {diagnostics.lastError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px',
                  padding: '0.875rem',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  <AlertOctagon size={14} />
                  <span>Recent Provider Incident ({diagnostics.lastError.provider.toUpperCase()})</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                  {diagnostics.lastError.message}
                </div>
                <div style={{ fontSize: '0.675rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                  Recorded at: {new Date(diagnostics.lastError.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.725rem' }}>
                <ShieldCheck size={14} color="#818cf8" />
                <span>Zero secret keys exposed</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleReset()}
                  disabled={resetting}
                  style={{
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    borderRadius: '8px',
                    color: '#818cf8',
                    padding: '0.45rem 0.875rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: resetting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={13} className={resetting ? 'animate-spin' : ''} />
                  <span>{resetting ? 'Resetting...' : 'Reset Circuit'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchDiagnostics()}
                  disabled={loading}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '0.45rem 0.875rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
