import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles,
  Shield,
  ShieldAlert,
  Play,
  Pause,
  Sliders,
  RefreshCw,
  Bot
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import type {
  AutonomousOperationsStatus,
  AutonomousPolicy,
  AutonomousRun,
  AutonomousSafetyEvent,
  Brand
} from '@vidsnapai/types';

export const AutonomousOperationsDashboardPage: React.FC = () => {
  const { brandId } = useParams<{ brandId?: string }>();
  const { currentWorkspace } = useAuth();


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [status, setStatus] = useState<AutonomousOperationsStatus | null>(null);
  const [policy, setPolicy] = useState<AutonomousPolicy | null>(null);
  const [runs, setRuns] = useState<AutonomousRun[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<AutonomousSafetyEvent[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandId || '');

  // Operation action states
  const [isTriggeringRun, setIsTriggeringRun] = useState(false);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  // Policy Form State
  const [dailySpendLimit, setDailySpendLimit] = useState(50);
  const [campaignSpendLimit, setCampaignSpendLimit] = useState(250);
  const [maxCampaignsPerDay, setMaxCampaignsPerDay] = useState(3);
  const [maxNewAdsPerDay, setMaxNewAdsPerDay] = useState(10);
  const [maxReelsPerDay, setMaxReelsPerDay] = useState(10);
  const [autoApplyOpt, setAutoApplyOpt] = useState(true);
  const [enforceBrandRules, setEnforceBrandRules] = useState(true);
  const [enforceBrandColors, setEnforceBrandColors] = useState(true);

  const fetchData = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [statusRes, policyRes, runsRes, safetyRes, brandsRes] = await Promise.all([
        apiRequest<AutonomousOperationsStatus>('/autonomous/status'),
        apiRequest<AutonomousPolicy>('/autonomous/policy'),
        apiRequest<AutonomousRun[]>('/autonomous/runs?limit=10'),
        apiRequest<AutonomousSafetyEvent[]>('/autonomous/safety-events?limit=10'),
        apiRequest<{ brands: Brand[] }>('/brands')
      ]);

      const normalizedStatus = statusRes && !('data' in (statusRes as any)) ? statusRes : (statusRes as any)?.data || null;
      const normalizedPolicy = policyRes && !('data' in (policyRes as any)) ? policyRes : (policyRes as any)?.data || null;
      const normalizedRuns = Array.isArray(runsRes) ? runsRes : (runsRes as any)?.data || (runsRes as any)?.runs || [];
      const normalizedSafety = Array.isArray(safetyRes) ? safetyRes : (safetyRes as any)?.data || (safetyRes as any)?.events || [];
      const normalizedBrands = Array.isArray(brandsRes) ? brandsRes : (brandsRes?.brands || (brandsRes as any)?.data?.brands || []);

      setStatus(normalizedStatus);
      setPolicy(normalizedPolicy);
      setRuns(normalizedRuns);
      setSafetyEvents(normalizedSafety);
      setBrands(normalizedBrands);

      if (!selectedBrandId && normalizedBrands.length > 0) {
        setSelectedBrandId(normalizedBrands[0].id);
      }

      // Initialize policy form state
      if (normalizedPolicy) {
        setDailySpendLimit(normalizedPolicy.advertising?.maxDailySpend ?? 50);
        setCampaignSpendLimit(normalizedPolicy.advertising?.maxCampaignSpend ?? 250);
        setMaxCampaignsPerDay(normalizedPolicy.advertising?.maxCampaignsPerDay ?? 3);
        setMaxNewAdsPerDay(normalizedPolicy.advertising?.maxNewAdsPerDay ?? 10);
        setMaxReelsPerDay(normalizedPolicy.content?.maxReelsPerDay ?? 10);
        setAutoApplyOpt(normalizedPolicy.optimization?.autoApply ?? true);
        setEnforceBrandRules(normalizedPolicy.brand?.enforceBrandRules ?? true);
        setEnforceBrandColors(normalizedPolicy.brand?.enforceBrandColors ?? true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load autonomous engine status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWorkspace?.id]);

  const handleToggleMode = async () => {
    if (!policy) return;
    const nextMode = policy.mode === 'AUTONOMOUS' ? 'CONTROLLED' : 'AUTONOMOUS';
    try {
      setError(null);
      setActionSuccess(null);
      const endpoint = nextMode === 'AUTONOMOUS' ? '/autonomous/enable' : '/autonomous/disable';
      await apiRequest(endpoint, { method: 'POST' });
      setActionSuccess(`Operating mode switched to ${nextMode}`);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to switch operating mode');
    }
  };

  const handleEmergencyPause = async () => {
    try {
      setIsPausing(true);
      setError(null);
      await apiRequest('/autonomous/pause', {
        method: 'POST',
        body: JSON.stringify({ reason: 'Emergency Pause triggered by workspace operator' })
      });
      setActionSuccess('ALL autonomous operations paused immediately.');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to pause operations');
    } finally {
      setIsPausing(false);
    }
  };

  const handleResume = async () => {
    try {
      setError(null);
      await apiRequest('/autonomous/resume', { method: 'POST' });
      setActionSuccess('Autonomous operations resumed to ACTIVE.');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resume operations');
    }
  };

  const handleTriggerRun = async () => {
    if (!selectedBrandId) {
      setError('Please select a brand to trigger an autonomous run.');
      return;
    }
    try {
      setIsTriggeringRun(true);
      setError(null);
      setActionSuccess(null);
      await apiRequest('/autonomous/run', {
        method: 'POST',
        body: JSON.stringify({
          brandId: selectedBrandId,
          daysToPlan: 7,
          forceAutonomousMode: policy?.mode === 'AUTONOMOUS'
        })
      });
      setActionSuccess('Autonomous campaign run completed successfully!');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Autonomous run execution failed');
    } finally {
      setIsTriggeringRun(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingPolicy(true);
      setError(null);
      setActionSuccess(null);

      await apiRequest('/autonomous/policy', {
        method: 'PATCH',
        body: JSON.stringify({
          advertising: {
            maxDailySpend: Number(dailySpendLimit),
            maxCampaignSpend: Number(campaignSpendLimit),
            maxCampaignsPerDay: Number(maxCampaignsPerDay),
            maxNewAdsPerDay: Number(maxNewAdsPerDay)
          },
          content: {
            maxReelsPerDay: Number(maxReelsPerDay)
          },
          optimization: {
            autoApply: autoApplyOpt
          },
          brand: {
            enforceBrandRules,
            enforceBrandColors
          }
        })
      });

      setActionSuccess('Autonomous policy and guardrails updated successfully!');
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Connecting to Autonomous Operations Engine..." />
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '2rem', color: '#f8fafc' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#6366f1',
            marginBottom: '1.5rem'
          }}
        >
          <Bot size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>No Workspace Selected</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Please select or create a workspace to access the Autonomous Operations Cockpit.
        </p>
      </div>
    );
  }

  const isAutonomous = policy?.mode === 'AUTONOMOUS';
  const isPaused = policy?.status === 'PAUSED';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem', color: '#f8fafc' }}>
      {/* Header & Status Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Bot size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Autonomous Operations Cockpit
              </h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Self-optimizing campaign engine with continuous analytics, generation, and Meta Ads execution
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '0.25rem'
            }}
          >
            <button
              onClick={handleToggleMode}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: isAutonomous ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                color: isAutonomous ? 'var(--text-muted)' : '#ffffff',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Shield size={14} />
              Controlled
            </button>
            <button
              onClick={handleToggleMode}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: isAutonomous ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: isAutonomous ? '0 0 16px rgba(99, 102, 241, 0.4)' : 'none'
              }}
            >
              <Sparkles size={14} />
              Autonomous
            </button>
          </div>

          {/* Emergency Pause / Resume */}
          {isPaused ? (
            <Button variant="primary" onClick={handleResume} style={{ background: '#10b981' }}>
              <Play size={16} /> Resume Operations
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleEmergencyPause}
              isLoading={isPausing}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: '#ef4444',
                color: '#f87171'
              }}
            >
              <Pause size={16} /> Emergency Pause
            </Button>
          )}

          {/* Trigger Immediate Run */}
          <Button
            variant="primary"
            onClick={handleTriggerRun}
            isLoading={isTriggeringRun}
            disabled={isPaused}
          >
            <Play size={16} /> Trigger Run Now
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {actionSuccess && (
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            color: '#34d399',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Engine Status Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Engine Mode
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Badge variant={isAutonomous ? 'primary' : 'default'}>
              {isAutonomous ? 'AUTONOMOUS' : 'CONTROLLED'}
            </Badge>
            <span style={{ fontSize: '0.8125rem', color: isPaused ? '#ef4444' : '#10b981' }}>

              ● {isPaused ? 'PAUSED' : 'ACTIVE'}
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Today's Ad Spend
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            ${status?.todayUsage.dailySpend.toFixed(2) || '0.00'}{' '}
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              / ${policy?.advertising.maxDailySpend || 50}
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Campaigns & Ads Today
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            {status?.todayUsage.campaignsCreated || 0} Campaigns / {status?.todayUsage.adsCreated || 0} Ads
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Reels Rendered & Published
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            {status?.todayUsage.reelsRendered || 0} Rendered / {status?.todayUsage.reelsPublished || 0} Live
          </div>
        </div>
      </div>

      {/* Autonomous Live Cycle & Active Pipeline Status */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '1.75rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Continuous Promotion Cycle
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} color="#818cf8" /> Autonomous Brand Growth Engine
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              14 BullMQ Queues Online
            </span>
          </div>
        </div>

        {/* 6-Step Visual Cycle Stepper */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.25rem' }}>STEP 1</div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Strategy & Plan</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Performance + Campaign Director</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.25rem' }}>STEP 2</div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Reel Blueprint</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>6-Scene Architecture + Script</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.25rem' }}>STEP 3</div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Assets & Audio</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Product Media + Voice + Music + SFX</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.25rem' }}>STEP 4</div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Animation & 9:16 Render</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Motion + Camera + Kinetic Typography</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.25rem' }}>STEP 5</div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Visual QA & Safety</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Solid Frame Gate + Brand Compliance</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: 700, marginBottom: '0.25rem' }}>STEP 6</div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Publish & Optimize</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Meta Ads / Organic + Closed Loop</div>
          </div>
        </div>

        {/* AI Quota Fallback Notice if detected */}
        {(safetyEvents.some((e) => e.eventType === 'AI_QUOTA_EXHAUSTED') ||
          runs.some((r) => (r as any).metadata?.fallbackUsed)) && (
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '10px',
              padding: '0.875rem 1.25rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={18} color="#38bdf8" />
              <div>
                <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.875rem' }}>
                  AI QUOTA EXHAUSTED — DETERMINISTIC FALLBACK ACTIVE
                </span>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Autonomous operations seamlessly utilized deterministic brand & product intelligence. No production data lost.
                </p>
              </div>
            </div>
            <Badge variant="primary">Deterministic Mode</Badge>
          </div>
        )}

        {/* Live Active Context Info Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '0.875rem 1.25rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            fontSize: '0.8125rem'
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Target Brand: </span>
            <strong style={{ color: '#ffffff' }}>{brands.find((b) => b.id === selectedBrandId)?.name || 'Configured Brand'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Last Action: </span>
            <span style={{ color: '#38bdf8' }}>{runs[0]?.summary || 'Autonomous Strategy Engine Ready'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Next Action: </span>
            <span style={{ color: '#a78bfa' }}>Continuous 30-Day Content Production & Performance Loop</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Activity & Policy Guardrails */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Live Activity Feed & Audit Runs */}
        <div>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '1.75rem',
              marginBottom: '2rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={18} color="#818cf8" /> Autonomous Execution History
              </h2>
              <Button variant="secondary" onClick={fetchData} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                Refresh
              </Button>
            </div>

            {runs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Bot size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No autonomous runs recorded yet for this workspace.</p>
                <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  Click <strong>"Trigger Run Now"</strong> to launch the end-to-end self-optimizing engine.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {runs.map((run) => (
                  <div
                    key={run.id}
                    style={{
                      background: 'rgba(8, 11, 17, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <Badge
                            variant={
                              run.status === 'COMPLETED'
                                ? 'success'
                                : run.status === 'RUNNING'
                                ? 'primary'
                                : run.status === 'STOPPED_AT_APPROVAL'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {run.status}
                          </Badge>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Trigger: {run.triggerType}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                          {run.summary || `Autonomous Cycle: ${run.currentStep || 'Processing'}`}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Step pills */}
                    {run.steps && run.steps.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                        {run.steps.map((step) => (
                          <span
                            key={step.id}
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              background:
                                step.status === 'COMPLETED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : step.status === 'FAILED'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(99, 102, 241, 0.15)',
                              color:
                                step.status === 'COMPLETED'
                                  ? '#34d399'
                                  : step.status === 'FAILED'
                                  ? '#f87171'
                                  : '#818cf8',
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            ✓ {step.stepName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Safety & Budget Alerts */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '1.75rem'
            }}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} color="#f59e0b" /> Safety & Guardrail Events Log
            </h2>

            {safetyEvents.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No safety events or policy violations recorded. Guardrails are active and healthy.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {safetyEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      background: 'rgba(8, 11, 17, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Badge variant={evt.severity === 'CRITICAL' ? 'danger' : 'warning'}>
                          {evt.eventType}
                        </Badge>

                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{evt.description}</span>
                      </div>
                      {evt.blockedAction && (
                        <span style={{ fontSize: '0.75rem', color: '#f87171' }}>
                          Blocked Action: {evt.blockedAction}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Policy & Guardrails Configuration Panel */}
        <div>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '1.75rem',
              position: 'sticky',
              top: '80px'
            }}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="#a855f7" /> Engine Boundaries & Policy
            </h2>

            <form onSubmit={handleSavePolicy}>
              {/* Brand Selector for manual triggers */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Target Brand Brain
                </label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    background: 'rgba(8, 11, 17, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.875rem'
                  }}
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.industry})
                    </option>
                  ))}
                </select>
              </div>

              {/* Spend Limits */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Max Daily Spend Cap ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={dailySpendLimit}
                  onChange={(e) => setDailySpendLimit(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    background: 'rgba(8, 11, 17, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Max Campaign Spend Cap ($ USD)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50000"
                  value={campaignSpendLimit}
                  onChange={(e) => setCampaignSpendLimit(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    background: 'rgba(8, 11, 17, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Velocity Limits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Max Camps/Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxCampaignsPerDay}
                    onChange={(e) => setMaxCampaignsPerDay(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: 'rgba(8, 11, 17, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Max Ads/Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={maxNewAdsPerDay}
                    onChange={(e) => setMaxNewAdsPerDay(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.625rem',
                      background: 'rgba(8, 11, 17, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoApplyOpt}
                    onChange={(e) => setAutoApplyOpt(e.target.checked)}
                  />
                  Auto-Apply Permitted Optimizations
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enforceBrandRules}
                    onChange={(e) => setEnforceBrandRules(e.target.checked)}
                  />
                  Enforce Prohibited Claims & Rules
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enforceBrandColors}
                    onChange={(e) => setEnforceBrandColors(e.target.checked)}
                  />
                  Enforce Brand Palette & Styling
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdatingPolicy}
                style={{ width: '100%' }}
              >
                Save Policy Boundaries
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
