import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Play,
  ShieldCheck,
  Award,
  Activity,
  Check,
  X
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { Card } from '../components/Card.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import type {
  Brand,
  OptimizationActionRecord,
  CampaignDirectorRunRecord,
  AutonomousLoopResult
} from '@vidsnapai/types';

export function OptimizationDashboardPage() {
  const { brandId } = useParams<{ brandId?: string }>();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandId || '');
  const [_selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const [actions, setActions] = useState<OptimizationActionRecord[]>([]);
  const [latestDirectorRun, setLatestDirectorRun] = useState<CampaignDirectorRunRecord | null>(null);
  const [isRunningDirector, setIsRunningDirector] = useState(false);
  const [isRunningLoop, setIsRunningLoop] = useState(false);
  const [loopResult, setLoopResult] = useState<AutonomousLoopResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROPOSED' | 'APPROVED' | 'APPLIED' | 'REJECTED'>('ALL');

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadOptimizationData(selectedBrandId);
    }
  }, [selectedBrandId]);

  const loadBrands = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<{ brands: Brand[] }>('/brands');
      setBrands(res.brands || []);
      if (res.brands && res.brands.length > 0) {
        const initialId = brandId || res.brands[0].id;
        setSelectedBrandId(initialId);
        setSelectedBrand(res.brands.find((b) => b.id === initialId) || res.brands[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOptimizationData = async (bId: string) => {
    try {
      setError(null);
      const current = brands.find((b) => b.id === bId) || null;
      setSelectedBrand(current);

      const [actionsRes, directorRes] = await Promise.all([
        apiRequest<OptimizationActionRecord[]>(`/optimization/actions?brandId=${bId}`),
        apiRequest<CampaignDirectorRunRecord | null>(`/campaign-director/latest?brandId=${bId}`).catch(() => null)
      ]);

      const normalizedActions = Array.isArray(actionsRes) ? actionsRes : (actionsRes as any)?.data || [];
      const normalizedDirector = directorRes && !('data' in (directorRes as any)) ? directorRes : (directorRes as any)?.data || null;

      setActions(normalizedActions);
      setLatestDirectorRun(normalizedDirector);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load optimization data');
    }
  };

  const handleRunDirector = async () => {
    if (!selectedBrandId) return;
    try {
      setIsRunningDirector(true);
      setError(null);
      setActionSuccessMsg(null);

      const res = await apiRequest<{ run: CampaignDirectorRunRecord; proposedActions: OptimizationActionRecord[] }>(
        '/campaign-director/run',
        {
          method: 'POST',
          body: JSON.stringify({ brandId: selectedBrandId })
        }
      );

      const runData = (res as any)?.run || (res as any)?.data?.run || null;
      const proposed = (res as any)?.proposedActions || (res as any)?.data?.proposedActions || [];

      setLatestDirectorRun(runData);
      setActionSuccessMsg(`AI Campaign Director completed run. Synthesized ${proposed.length} new optimization actions.`);
      await loadOptimizationData(selectedBrandId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run Campaign Director');
    } finally {
      setIsRunningDirector(false);
    }
  };

  const handleRunAutonomousLoop = async () => {
    if (!selectedBrandId) return;
    try {
      setIsRunningLoop(true);
      setError(null);
      setActionSuccessMsg(null);
      setLoopResult(null);

      const res = await apiRequest<AutonomousLoopResult>('/optimization/autonomous-loop', {
        method: 'POST',
        body: JSON.stringify({
          brandId: selectedBrandId,
          contentPlanDurationDays: 7,
          generateBlueprints: true,
          renderVideos: false,
          stopAtApprovalGateway: true
        })
      });

      const normalizedLoop = res && !('data' in (res as any)) ? res : (res as any)?.data;
      setLoopResult(normalizedLoop);
      setActionSuccessMsg('Autonomous campaign cycle executed successfully! Generated new plan and reel blueprint. Pipeline stopped at approval gateway.');
      await loadOptimizationData(selectedBrandId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run autonomous campaign loop');
    } finally {
      setIsRunningLoop(false);
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      setError(null);
      await apiRequest(`/optimization/actions/${actionId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Approved via Optimization Dashboard' })
      });
      setActionSuccessMsg('Action approved successfully. You can now apply it.');
      await loadOptimizationData(selectedBrandId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve action');
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      setError(null);
      await apiRequest(`/optimization/actions/${actionId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Rejected by operator' })
      });
      setActionSuccessMsg('Action marked as rejected.');
      await loadOptimizationData(selectedBrandId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject action');
    }
  };

  const handleApplyAction = async (actionId: string) => {
    try {
      setError(null);
      await apiRequest(`/optimization/actions/${actionId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ force: false })
      });
      setActionSuccessMsg('Action applied to blueprint/campaign successfully.');
      await loadOptimizationData(selectedBrandId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to apply action');
    }
  };

  const filteredActions = actions.filter((a) => {
    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  const proposedCount = actions.filter((a) => a.status === 'PROPOSED').length;
  const approvedCount = actions.filter((a) => a.status === 'APPROVED').length;
  const appliedCount = actions.filter((a) => a.status === 'APPLIED').length;

  if (isLoading && brands.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading Autonomous Optimization Engine..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Zap size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Autonomous Campaign Optimization Engine
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                Closed-Loop AI Performance Feedback • Campaign Director • Strict Human Approval Gateway
              </p>
            </div>
          </div>
        </div>

        {/* Brand Selector & Engine Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {brands.length > 1 && (
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id} style={{ background: '#111622', color: '#fff' }}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="secondary"
            onClick={handleRunDirector}
            isLoading={isRunningDirector}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} />
            <span>Run Campaign Director</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleRunAutonomousLoop}
            isLoading={isRunningLoop}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Play size={16} />
            <span>Execute Autonomous Loop</span>
          </Button>
        </div>
      </div>

      {error && <ErrorBanner message={error} style={{ marginBottom: '1.5rem' }} />}
      {actionSuccessMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#10b981',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Autonomous Loop Summary Notice */}
      {loopResult && (
        <Card style={{ marginBottom: '2rem', border: '1px solid rgba(99, 102, 241, 0.4)', background: 'rgba(99, 102, 241, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ShieldCheck size={20} color="#818cf8" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Autonomous Loop Result</h3>
                <Badge variant="primary">APPROVAL GATEWAY ACTIVE</Badge>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                {loopResult.summary}
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                <div>Directives: <strong>{loopResult.strategicDirectivesCount}</strong></div>
                <div>Proposed Actions: <strong>{loopResult.proposedActionsCount}</strong></div>
                <div>Content Plan: <strong>{loopResult.contentPlanId ? 'Generated' : 'None'}</strong></div>
                <div>Reel Blueprint: <strong>{loopResult.createdReelId ? 'Created' : 'None'}</strong></div>
                <div style={{ color: '#f59e0b' }}>Meta Publishing: <strong>BLOCKED PENDING APPROVAL</strong></div>
              </div>
            </div>
            {loopResult.createdReelId && (
              <Link to={`/brands/${selectedBrandId}/reels/${loopResult.createdReelId}`} className="btn btn-secondary">
                View Created Blueprint
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Campaign Director Intelligence Summary */}
      {latestDirectorRun && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Directives & Summary */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Award size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>AI Campaign Director Directives</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              {latestDirectorRun.summary}
            </p>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Strategic Rules:
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.8125rem', lineHeight: 1.6 }}>
              {latestDirectorRun.strategicDirectives.map((d, i) => (
                <li key={i}>{typeof d === 'string' ? d : d.directive}</li>
              ))}
            </ul>
          </Card>

          {/* Winning Patterns */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={18} color="#10b981" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Verified Winning Patterns</h3>
            </div>
            {latestDirectorRun.winningPatterns.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No winning patterns registered yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {latestDirectorRun.winningPatterns.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.625rem 0.75rem',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {typeof p === 'string' ? p : `${p.type}: ${p.key} (+${p.lift})`}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Weak Patterns / Fatigue */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="#f43f5e" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Weak Patterns & Fatigue</h3>
            </div>
            {latestDirectorRun.weakPatterns.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No underperforming patterns recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {latestDirectorRun.weakPatterns.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.625rem 0.75rem',
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {typeof p === 'string' ? p : `${p.type}: ${p.key} (-${p.drag})`}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Optimization Action Inbox Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Optimization Action Inbox</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
              Review, approve, or reject autonomous recommendations. Actions cannot be applied without human sign-off.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            {(['ALL', 'PROPOSED', 'APPROVED', 'APPLIED', 'REJECTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: statusFilter === st ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                  color: statusFilter === st ? '#818cf8' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {st} {st === 'PROPOSED' && `(${proposedCount})`}
                {st === 'APPROVED' && `(${approvedCount})`}
                {st === 'APPLIED' && `(${appliedCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Action Cards */}
        {filteredActions.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <Activity size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>No actions in this view</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>
              Run the AI Campaign Director to generate evidence-backed optimization recommendations.
            </p>
            <Button variant="primary" onClick={handleRunDirector} isLoading={isRunningDirector}>
              Run AI Campaign Director
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredActions.map((action) => (
              <Card
                key={action.id}
                style={{
                  borderLeft: `4px solid ${
                    action.status === 'APPLIED'
                      ? '#10b981'
                      : action.status === 'APPROVED'
                      ? '#38bdf8'
                      : action.status === 'REJECTED'
                      ? '#64748b'
                      : '#818cf8'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                      <Badge variant={action.status === 'APPLIED' ? 'success' : action.status === 'APPROVED' ? 'info' : action.status === 'REJECTED' ? 'default' : 'primary'}>
                        {action.status}
                      </Badge>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {action.actionType.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• Target: {action.targetEntity}</span>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        Confidence: {(action.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* WHY */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#e2e8f0' }}>WHY: </span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{action.reason}</span>
                    </div>

                    {/* EVIDENCE */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#38bdf8' }}>EVIDENCE: </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {typeof action.evidence === 'string' ? action.evidence : JSON.stringify(action.evidence)}
                      </span>
                    </div>

                    {/* EXPECTED IMPACT */}
                    <div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#10b981' }}>EXPECTED IMPACT: </span>
                      <span style={{ fontSize: '0.8125rem', color: '#10b981' }}>{action.expectedImpact}</span>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {action.status === 'PROPOSED' && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => handleRejectAction(action.id)}
                          style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                        >
                          <X size={14} style={{ marginRight: '0.25rem' }} />
                          Reject
                        </Button>
                        <Button variant="primary" onClick={() => handleApproveAction(action.id)}>
                          <Check size={14} style={{ marginRight: '0.25rem' }} />
                          Approve
                        </Button>
                      </>
                    )}

                    {action.status === 'APPROVED' && (
                      <Button
                        variant="primary"
                        onClick={() => handleApplyAction(action.id)}
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                      >
                        <Play size={14} style={{ marginRight: '0.25rem' }} />
                        Apply Action
                      </Button>
                    )}

                    {action.status === 'APPLIED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontSize: '0.8125rem', fontWeight: 600 }}>
                        <CheckCircle2 size={16} />
                        <span>Applied {action.appliedAt ? new Date(action.appliedAt).toLocaleDateString() : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
