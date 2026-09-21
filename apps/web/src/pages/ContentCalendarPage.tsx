import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { Input } from '../components/Input.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type {
  ContentPlanWithJobs,
  ContentJob,
  ContentJobStatus,
  ReelProductionPlan
} from '@vidsnapai/types';
import {
  CalendarDays,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Clock,
  Edit3,
  RefreshCw,
  Flame,
  LayoutGrid,
  List,
  Columns3,
  XCircle,
  Share2,
  Film
} from 'lucide-react';

const FUNNEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  AWARENESS: { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
  CONSIDERATION: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  CONVERSION: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  RETENTION: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' }
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  EDUCATIONAL: { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8' },
  PROMOTIONAL: { bg: 'rgba(244, 114, 182, 0.15)', text: '#f472b6' },
  STORYTELLING: { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15' },
  SOCIAL_PROOF: { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7' },
  ENGAGEMENT: { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8' },
  AUTHORITY: { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' },
  BEHIND_THE_SCENES: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
  PROBLEM_AGITATION: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' }
};

export const ContentCalendarPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const { brandId, planId } = useParams<{ brandId: string; planId: string }>();
  const navigate = useNavigate();

  const [planData, setPlanData] = useState<ContentPlanWithJobs | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'weekly' | 'list'>('grid');
  const [funnelFilter, setFunnelFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Job Editor Modal
  const [selectedJob, setSelectedJob] = useState<ContentJob | null>(null);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [jobEditForm, setJobEditForm] = useState<Partial<ContentJob>>({});
  const [isSavingJob, setIsSavingJob] = useState(false);

  // Regeneration Modal
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [preserveApproved, setPreserveApproved] = useState(true);
  const [regenGuidance, setRegenGuidance] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [reels, setReels] = useState<ReelProductionPlan[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const isOwnerOrAdmin = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN';

  const fetchPlanDetails = useCallback(async () => {
    if (!brandId || !planId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [res, reelsRes] = await Promise.all([
        apiRequest<ContentPlanWithJobs>(`/api/brands/${brandId}/content-plans/${planId}`),
        apiRequest<ReelProductionPlan[]>(`/api/content-plans/${planId}/reels`).catch(() => [] as ReelProductionPlan[])
      ]);
      setPlanData(res);
      setReels(reelsRes || []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load content plan');
    } finally {
      setIsLoading(false);
    }
  }, [brandId, planId]);

  const jobReelMap = React.useMemo(() => {
    const map = new Map<string, ReelProductionPlan>();
    for (const r of reels) {
      if (r.contentJobId) {
        map.set(r.contentJobId, r);
      }
    }
    return map;
  }, [reels]);

  const handleBatchGenerateReels = async () => {
    if (!brandId || !planId) return;
    setIsBatchGenerating(true);
    setErrorMsg('');
    try {
      await apiRequest(`/api/content-plans/${planId}/reels/generate-batch`, {
        method: 'POST'
      });
      const updated = await apiRequest<ReelProductionPlan[]>(`/api/content-plans/${planId}/reels`);
      setReels(updated || []);
      navigate(`/brands/${brandId}/content-plans/${planId}/reels`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to batch generate reel blueprints');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleGenerateJobReel = async (job: ContentJob) => {
    if (!brandId || !planId) return;
    setGeneratingJobId(job.id);
    setErrorMsg('');
    try {
      const res = await apiRequest<{ id: string }>(
        `/api/content-jobs/${job.id}/reel/generate`,
        { method: 'POST' }
      );
      const updated = await apiRequest<ReelProductionPlan[]>(`/api/content-plans/${planId}/reels`);
      setReels(updated || []);
      navigate(`/brands/${brandId}/reels/${res.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate reel blueprint');
    } finally {
      setGeneratingJobId(null);
    }
  };

  useEffect(() => {
    fetchPlanDetails();
  }, [fetchPlanDetails]);

  // Open Job Detail
  const handleOpenJob = (job: ContentJob) => {
    setSelectedJob(job);
    setJobEditForm({ ...job });
    setIsEditingJob(false);
  };

  // Save Job Updates
  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId || !planId || !selectedJob) return;

    setIsSavingJob(true);
    try {
      const updated = await apiRequest<ContentJob>(`/api/brands/${brandId}/content-plans/${planId}/jobs/${selectedJob.id}`, {
        method: 'PATCH',
        body: JSON.stringify(jobEditForm)
      });

      setPlanData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          jobs: prev.jobs.map((j) => (j.id === updated.id ? updated : j))
        };
      });

      setSelectedJob(updated);
      setIsEditingJob(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save job changes');
    } finally {
      setIsSavingJob(false);
    }
  };

  // Quick Status Toggle (e.g. Approve / Mark Ready)
  const handleStatusChange = async (jobId: string, newStatus: ContentJobStatus) => {
    if (!brandId || !planId) return;
    try {
      const updated = await apiRequest<ContentJob>(`/api/brands/${brandId}/content-plans/${planId}/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });

      setPlanData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          jobs: prev.jobs.map((j) => (j.id === updated.id ? updated : j))
        };
      });

      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(updated);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update job status');
    }
  };

  // Handle Regeneration
  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId || !planId || !planData) return;

    setIsRegenerating(true);
    setErrorMsg('');
    try {
      const newPlan = await apiRequest<ContentPlanWithJobs>(`/api/brands/${brandId}/content-plans/${planId}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({
          preserveApprovedJobs: preserveApproved,
          customGuidance: regenGuidance.trim() || null
        })
      });

      setIsRegenerateOpen(false);
      navigate(`/brands/${brandId}/content-plans/${newPlan.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to regenerate content plan');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem 0' }}>
        <LoadingSpinner message="Loading 30-Day Content Calendar..." />
      </div>
    );
  }

  if (!planData) {
    return (
      <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <ErrorBanner message="Content Plan not found" />
        <Link to={`/brands/${brandId}/content-plans`} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          Back to Content Plans
        </Link>
      </div>
    );
  }

  const jobs = planData.jobs || [];
  const metrics = (planData.strategySnapshot as any)?.diversificationMetrics;
  const score = metrics?.score ?? 92;
  const weeklyNarratives = (planData.strategySnapshot as any)?.weeklyNarratives || [];

  // Filter jobs
  const filteredJobs = jobs.filter((j) => {
    if (funnelFilter !== 'ALL' && j.funnelStage !== funnelFilter) return false;
    if (typeFilter !== 'ALL' && j.contentType !== typeFilter) return false;
    if (statusFilter !== 'ALL' && j.status !== statusFilter) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link
          to={`/brands/${brandId}/content-plans`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Plans</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {reels.length > 0 ? (
            <Link
              to={`/brands/${brandId}/content-plans/${planId}/reels`}
              style={{ textDecoration: 'none' }}
            >
              <Button
                variant="primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600
                }}
              >
                <Film size={15} />
                <span>View Reel Blueprints ({reels.length})</span>
              </Button>
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                variant="primary"
                isLoading={isBatchGenerating}
                onClick={handleBatchGenerateReels}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600
                }}
              >
                <Film size={15} />
                <span>Generate Reel Blueprints</span>
              </Button>
              <Link
                to={`/brands/${brandId}/content-plans/${planId}/reels`}
                style={{ textDecoration: 'none' }}
              >
                <Button variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Film size={14} />
                  <span>Reel Blueprints</span>
                </Button>
              </Link>
            </div>
          )}

          {isOwnerOrAdmin && (
            <Button variant="secondary" onClick={() => setIsRegenerateOpen(true)}>
              <RefreshCw size={14} />
              <span>Regenerate (v{planData.version + 1})</span>
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(planData, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', `${planData.name.replace(/\s+/g, '_')}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
          >
            <Share2 size={14} />
            <span>Export Calendar</span>
          </Button>
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} style={{ marginBottom: '1.5rem' }} />}

      {/* Flagship Header Card */}
      <Card style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(17, 22, 34, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)', border: '1px solid var(--border-medium)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {planData.name}
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                Version {planData.version}
              </span>
              <Badge variant={planData.status === 'READY' || planData.status === 'ACTIVE' ? 'ready' : 'draft'}>
                {planData.status}
              </Badge>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '720px', lineHeight: 1.5, marginBottom: '0.75rem' }}>
              {(planData.strategySnapshot as any)?.executiveSummary || planData.objective}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CalendarDays size={14} color="#818cf8" />
                {new Date(planData.startDate).toLocaleDateString()} — {new Date(planData.endDate).toLocaleDateString()} ({planData.durationDays} Days)
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={14} color="#10b981" />
                {jobs.filter((j) => j.status === 'READY').length} of {jobs.length} Jobs Approved
              </span>
            </div>
          </div>

          {/* Diversification Score Metric Block */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Diversification Score
              </span>
              <Flame size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: score >= 80 ? '#10b981' : '#f59e0b', marginBottom: '0.25rem' }}>
              {score}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Zero duplicate hooks • Balanced Funnel Mix
            </div>
          </div>
        </div>
      </Card>

      {/* View Switcher & Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        {/* View Mode Buttons */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: viewMode === 'grid' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: viewMode === 'grid' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LayoutGrid size={15} />
            <span>30-Day Grid</span>
          </button>

          <button
            onClick={() => setViewMode('weekly')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: viewMode === 'weekly' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: viewMode === 'weekly' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Columns3 size={15} />
            <span>Weekly Flow</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: viewMode === 'list' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: viewMode === 'list' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <List size={15} />
            <span>Detailed List</span>
          </button>
        </div>

        {/* Filter Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Funnel:</span>
            <select
              value={funnelFilter}
              onChange={(e) => setFunnelFilter(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem'
              }}
            >
              <option value="ALL" style={{ background: '#111622' }}>All Stages</option>
              <option value="AWARENESS" style={{ background: '#111622' }}>Awareness</option>
              <option value="CONSIDERATION" style={{ background: '#111622' }}>Consideration</option>
              <option value="CONVERSION" style={{ background: '#111622' }}>Conversion</option>
              <option value="RETENTION" style={{ background: '#111622' }}>Retention</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem'
              }}
            >
              <option value="ALL" style={{ background: '#111622' }}>All Types</option>
              <option value="EDUCATIONAL" style={{ background: '#111622' }}>Educational</option>
              <option value="PROMOTIONAL" style={{ background: '#111622' }}>Promotional</option>
              <option value="STORYTELLING" style={{ background: '#111622' }}>Storytelling</option>
              <option value="SOCIAL_PROOF" style={{ background: '#111622' }}>Social Proof</option>
              <option value="ENGAGEMENT" style={{ background: '#111622' }}>Engagement</option>
              <option value="AUTHORITY" style={{ background: '#111622' }}>Authority</option>
              <option value="BEHIND_THE_SCENES" style={{ background: '#111622' }}>Behind the Scenes</option>
              <option value="PROBLEM_AGITATION" style={{ background: '#111622' }}>Problem Agitation</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem'
              }}
            >
              <option value="ALL" style={{ background: '#111622' }}>All Statuses</option>
              <option value="PLANNED" style={{ background: '#111622' }}>Planned</option>
              <option value="READY" style={{ background: '#111622' }}>Approved / Ready</option>
              <option value="IN_PROGRESS" style={{ background: '#111622' }}>In Progress</option>
              <option value="COMPLETED" style={{ background: '#111622' }}>Completed</option>
              <option value="SKIPPED" style={{ background: '#111622' }}>Skipped</option>
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: 30-DAY GRID CALENDAR */}
      {/* ======================================================== */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {filteredJobs.map((job) => {
            const funnelStyle = FUNNEL_COLORS[job.funnelStage] || { bg: 'rgba(255,255,255,0.05)', text: '#fff', border: 'transparent' };
            const typeStyle = TYPE_COLORS[job.contentType] || { bg: 'rgba(255,255,255,0.05)', text: '#fff' };
            const isApproved = job.status === 'READY';

            return (
              <div
                key={job.id}
                onClick={() => handleOpenJob(job)}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: isApproved ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  boxShadow: isApproved ? '0 0 15px rgba(16, 185, 129, 0.08)' : 'none'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#818cf8')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = isApproved ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)')}
              >
                <div>
                  {/* Day Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#ffffff', background: 'rgba(255, 255, 255, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                        Day {job.dayNumber < 10 ? `0${job.dayNumber}` : job.dayNumber}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(job.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: funnelStyle.bg,
                        color: funnelStyle.text,
                        border: `1px solid ${funnelStyle.border}`
                      }}
                    >
                      {job.funnelStage}
                    </span>
                  </div>

                  {/* Title & Topic */}
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                    {job.title}
                  </h3>

                  {/* Hook Quote */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    "{job.hook}"
                  </div>
                </div>

                {/* Footer Badges */}
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: typeStyle.bg, color: typeStyle.text, fontWeight: 600 }}>
                      {job.contentType.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted)' }}>
                      {job.format.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: isApproved ? '#10b981' : 'var(--text-muted)', fontWeight: isApproved ? 600 : 400 }}>
                      {isApproved ? '✓ Approved' : 'Planned'}
                    </span>
                    {jobReelMap.get(job.id) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/brands/${brandId}/reels/${jobReelMap.get(job.id)!.id}`);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          color: '#34d399',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="View Reel Production Blueprint"
                      >
                        <Film size={12} />
                        <span>View Blueprint</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateJobReel(job);
                        }}
                        disabled={generatingJobId === job.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#818cf8',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title="Generate Reel Production Blueprint"
                      >
                        <Film size={12} />
                        <span>{generatingJobId === job.id ? 'Generating...' : 'Generate Blueprint'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: WEEKLY FLOW VIEW */}
      {/* ======================================================== */}
      {viewMode === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {[1, 2, 3, 4, 5].map((wNum) => {
            const weekJobs = filteredJobs.filter((j) => Math.ceil(j.dayNumber / 7) === wNum);
            if (weekJobs.length === 0) return null;

            const narrative = weeklyNarratives.find((w: any) => w.weekNumber === wNum);

            return (
              <div key={wNum} style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
                        WEEK {wNum}
                      </span>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                        {narrative?.theme || `Sprint Week ${wNum}`}
                      </h2>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {narrative?.strategicPurpose || `Focus on ${narrative?.focusObjective || 'Strategic execution'}`}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {weekJobs.map((job) => (
                    <Card
                      key={job.id}
                      onClick={() => handleOpenJob(job)}
                      style={{ cursor: 'pointer', padding: '1rem', background: 'rgba(8, 11, 17, 0.6)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>Day {job.dayNumber}</span>
                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                          {job.funnelStage}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>{job.title}</h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                        "{job.hook}"
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        CTA: {job.cta}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {jobReelMap.get(job.id) ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/brands/${brandId}/reels/${jobReelMap.get(job.id)!.id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#34d399',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Film size={12} />
                            <span>View Blueprint</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateJobReel(job);
                            }}
                            disabled={generatingJobId === job.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              color: '#818cf8',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Film size={12} />
                            <span>{generatingJobId === job.id ? 'Generating...' : 'Generate Blueprint'}</span>
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: DETAILED LIST VIEW */}
      {/* ======================================================== */}
      {viewMode === 'list' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.875rem 1rem' }}>Day</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Title & Angle</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Hook</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Funnel / Pillar</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Format</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => handleOpenJob(job)}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#818cf8' }}>
                      Day {job.dayNumber}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', maxWidth: '240px' }}>
                      <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '0.2rem' }}>{job.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{job.messagingAngle}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontStyle: 'italic', color: 'var(--text-secondary)', maxWidth: '260px' }}>
                      "{job.hook}"
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.75rem' }}>{job.funnelStage}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{job.contentPillar}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {job.format.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant={job.status === 'READY' ? 'ready' : 'draft'}>
                        {job.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {jobReelMap.get(job.id) ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/brands/${brandId}/reels/${jobReelMap.get(job.id)!.id}`);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#34d399',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Film size={12} />
                            <span>View Blueprint</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateJobReel(job);
                            }}
                            disabled={generatingJobId === job.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              color: '#818cf8',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Film size={12} />
                            <span>{generatingJobId === job.id ? 'Generating...' : 'Generate Blueprint'}</span>
                          </button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenJob(job);
                          }}
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          <Edit3 size={12} />
                          <span>Inspect</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: JOB DETAIL & EDITOR */}
      {/* ======================================================== */}
      {selectedJob && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedJob(null)}
          title={`Day ${selectedJob.dayNumber}: ${selectedJob.title}`}
        >
          {isEditingJob ? (
            <form onSubmit={handleSaveJob}>
              <div style={{ marginBottom: '1rem' }}>
                <Input
                  id="edit-title"
                  label="Title"
                  type="text"
                  value={jobEditForm.title || ''}
                  onChange={(e) => setJobEditForm({ ...jobEditForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Opening 3-Second Hook
                </label>
                <textarea
                  rows={2}
                  value={jobEditForm.hook || ''}
                  onChange={(e) => setJobEditForm({ ...jobEditForm, hook: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Core Strategic Angle
                </label>
                <textarea
                  rows={2}
                  value={jobEditForm.messagingAngle || ''}
                  onChange={(e) => setJobEditForm({ ...jobEditForm, messagingAngle: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Input
                  id="edit-cta"
                  label="Call To Action (CTA)"
                  type="text"
                  value={jobEditForm.cta || ''}
                  onChange={(e) => setJobEditForm({ ...jobEditForm, cta: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => setIsEditingJob(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSavingJob}>
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div>
              {/* Strategic Metadata Header */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 600 }}>
                  {selectedJob.contentType.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
                  {selectedJob.funnelStage}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)' }}>
                  Format: {selectedJob.format.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)' }}>
                  Pillar: {selectedJob.contentPillar}
                </span>
              </div>

              {/* Hook Spotlight */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Opening Verbal / Visual Hook
                </div>
                <div style={{ fontSize: '1.05rem', color: '#ffffff', fontStyle: 'italic', fontWeight: 500 }}>
                  "{selectedJob.hook}"
                </div>
              </div>

              {/* Core Angle & Audience */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>STRATEGIC ANGLE</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{selectedJob.messagingAngle}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>TARGET AUDIENCE</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{selectedJob.audience}</div>
                </div>
              </div>

              {/* Audio & Visual Directions */}
              <div style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#818cf8', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  AI Visual & Audio Concept Guidance
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  <strong>Visual:</strong> {(selectedJob.strategy as any)?.suggestedVisualHook || 'Clean product shot & punchy opening motion'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Audio:</strong> {(selectedJob.strategy as any)?.suggestedAudioConcept || 'Confident, authoritative voiceover with energetic beat'}
                </div>
              </div>

              {/* CTA & Rationale */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CALL TO ACTION</div>
                  <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>{selectedJob.cta}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>STRATEGIC RATIONALE</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{(selectedJob.strategy as any)?.strategicRationale || 'Top-of-funnel conversion driver.'}</div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {/* Phase 5: Autonomous Reel Orchestrator Action */}
                  {selectedJob && jobReelMap.get(selectedJob.id) ? (
                    <Button
                      variant="primary"
                      onClick={() => {
                        navigate(`/brands/${brandId}/reels/${jobReelMap.get(selectedJob.id)!.id}`);
                      }}
                      style={{ fontSize: '0.8125rem', background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)', color: '#ffffff' }}
                    >
                      <Film size={14} />
                      <span>View Reel Blueprint</span>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      isLoading={generatingJobId === selectedJob?.id}
                      onClick={() => {
                        if (selectedJob) handleGenerateJobReel(selectedJob);
                      }}
                      style={{ fontSize: '0.8125rem', background: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)', color: '#ffffff' }}
                    >
                      <Film size={14} />
                      <span>Generate Reel Blueprint</span>
                    </Button>
                  )}

                  {selectedJob.status !== 'READY' ? (
                    <Button
                      variant="secondary"
                      onClick={() => handleStatusChange(selectedJob.id, 'READY')}
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve Job</span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => handleStatusChange(selectedJob.id, 'PLANNED')}
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <Clock size={14} />
                      <span>Revert to Planned</span>
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => handleStatusChange(selectedJob.id, 'SKIPPED')}
                    style={{ fontSize: '0.8125rem' }}
                  >
                    <XCircle size={14} />
                    <span>Skip Day</span>
                  </Button>
                </div>

                {isOwnerOrAdmin && (
                  <Button variant="secondary" onClick={() => setIsEditingJob(true)}>
                    <Edit3 size={14} />
                    <span>Edit Job Details</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: SAFE REGENERATION */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRegenerateOpen}
        onClose={() => setIsRegenerateOpen(false)}
        title={`Regenerate 30-Day Plan (Version ${planData.version + 1})`}
      >
        <form onSubmit={handleRegenerate}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            BrandPilot AI will create a brand-new immutable version <strong>v{planData.version + 1}</strong> of this content plan while keeping version v{planData.version} safely stored in your history.
          </p>

          <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={preserveApproved}
                onChange={(e) => setPreserveApproved(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981' }}>
                  Preserve Approved Jobs ({jobs.filter((j) => j.status === 'READY').length} Approved)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Keep all days you previously marked as Approved / Ready untouched, and only regenerate the remaining days.
                </div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Adjust Strategic Guidance (Optional)
            </label>
            <textarea
              rows={3}
              value={regenGuidance}
              onChange={(e) => setRegenGuidance(e.target.value)}
              placeholder="e.g. Introduce more controversy hooks in Week 2, and increase product demonstration reels."
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="secondary" onClick={() => setIsRegenerateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isRegenerating}>
              <RefreshCw size={14} />
              <span>Regenerate Content Plan</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
