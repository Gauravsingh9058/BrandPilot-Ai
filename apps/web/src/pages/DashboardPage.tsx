import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import { apiRequest } from '../lib/api.js';
import type { HealthCheckResponse, WorkspaceWithMembers, WorkspaceMember } from '@vidsnapai/types';
import {
  Activity,
  Server,
  Database,
  Layers,
  Users,
  UserPlus,
  Trash2,
  Cpu,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, currentWorkspace, refreshWorkspaces } = useAuth();
  const [workspaceDetails, setWorkspaceDetails] = useState<WorkspaceWithMembers | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  // Invite member state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Queue test job state
  const [isQueueTriggering, setIsQueueTriggering] = useState(false);
  const [queueMessage, setQueueMessage] = useState('VidSnapAI Phase 1 Queue Verification Task');
  const [queueResult, setQueueResult] = useState<{ jobId: string; message: string } | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsHealthLoading(true);
    try {
      const data = await apiRequest<HealthCheckResponse>('/api/health');
      setHealthData(data);
    } catch {
      // Failed to load health
    } finally {
      setIsHealthLoading(false);
    }
  }, []);

  const fetchWorkspaceDetails = useCallback(async (workspaceId: string) => {
    setIsLoadingWorkspace(true);
    try {
      const data = await apiRequest<{ workspace: WorkspaceWithMembers }>(`/api/workspaces/${workspaceId}`);
      setWorkspaceDetails(data.workspace);
    } catch {
      setWorkspaceDetails(null);
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchWorkspaceDetails(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, fetchWorkspaceDetails]);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setInviteError('');
    setIsInviting(true);

    try {
      await apiRequest(`/api/workspaces/${currentWorkspace.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });
      setIsInviteModalOpen(false);
      setInviteEmail('');
      await fetchWorkspaceDetails(currentWorkspace.id);
      await refreshWorkspaces();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add member';
      setInviteError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspace || !confirm('Are you sure you want to remove this member?')) return;
    try {
      await apiRequest(`/api/workspaces/${currentWorkspace.id}/members/${memberId}`, {
        method: 'DELETE'
      });
      await fetchWorkspaceDetails(currentWorkspace.id);
      await refreshWorkspaces();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleTriggerQueueJob = async () => {
    setIsQueueTriggering(true);
    setQueueResult(null);
    try {
      const data = await apiRequest<{ jobId: string; message: string }>('/api/queue/test-job', {
        method: 'POST',
        body: JSON.stringify({ message: queueMessage })
      });
      setQueueResult(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to trigger worker job');
    } finally {
      setIsQueueTriggering(false);
    }
  };

  const isOwnerOrAdmin = currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN';

  return (
    <div className="main-content">
      {/* Top Banner Overview */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', marginBottom: '0.25rem' }}>
              Welcome, {user?.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              BrandPilot AI Autonomous Production Foundation & Core Workspace
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={fetchHealth}
              disabled={isHealthLoading}
              style={{ fontSize: '0.8125rem' }}
            >
              <RefreshCw size={14} className={isHealthLoading ? 'spinner' : ''} />
              Refresh Status
            </Button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Workspace Overview Card */}
        <Card
          title="Active Workspace"
          subtitle="Isolated multi-tenant context"
          action={
            currentWorkspace && (
              <Badge variant={currentWorkspace.role?.toLowerCase() as 'owner' | 'admin' | 'member'}>
                {currentWorkspace.role}
              </Badge>
            )
          }
        >
          {isLoadingWorkspace ? (
            <LoadingSpinner message="Loading workspace details..." />
          ) : currentWorkspace ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Layers size={20} color="var(--accent-primary)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{currentWorkspace.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {currentWorkspace.id}</p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  padding: '0.875rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MEMBERS</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.2rem' }}>
                    {workspaceDetails?.members?.length || 1}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>YOUR ROLE</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '0.2rem', color: '#c4b5fd' }}>
                    {currentWorkspace.role}
                  </div>
                </div>
              </div>

              {isOwnerOrAdmin && (
                <Button
                  variant="secondary"
                  onClick={() => setIsInviteModalOpen(true)}
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  <UserPlus size={15} />
                  Add Team Member
                </Button>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No workspace selected.</p>
          )}
        </Card>

        {/* System Health Status Card */}
        <Card
          title="System Infrastructure"
          subtitle="Core service connectivity probe"
          action={
            healthData && (
              <Badge variant={healthData.status === 'ok' ? 'healthy' : 'unhealthy'}>
                {healthData.status === 'ok' ? 'ALL SYSTEMS OPERATIONAL' : 'DEGRADED'}
              </Badge>
            )
          }
        >
          {healthData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* REST API */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Server size={17} color="#818cf8" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>REST API</span>
                </div>
                <Badge variant="healthy">HEALTHY</Badge>
              </div>

              {/* PostgreSQL */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Database size={17} color="#38bdf8" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>PostgreSQL</span>
                </div>
                <Badge variant={healthData.services.postgres.status === 'healthy' ? 'healthy' : 'unhealthy'}>
                  {healthData.services.postgres.status.toUpperCase()}
                  {healthData.services.postgres.latencyMs !== undefined && ` (${healthData.services.postgres.latencyMs}ms)`}
                </Badge>
              </div>

              {/* Redis */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Cpu size={17} color="#f472b6" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Redis Queue (BullMQ)</span>
                </div>
                <Badge variant={healthData.services.redis.status === 'healthy' ? 'healthy' : 'unhealthy'}>
                  {healthData.services.redis.status.toUpperCase()}
                  {healthData.services.redis.latencyMs !== undefined && ` (${healthData.services.redis.latencyMs}ms)`}
                </Badge>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Uptime: {healthData.uptimeSeconds}s • Environment: {healthData.environment} • v{healthData.version}
              </div>
            </div>
          ) : (
            <LoadingSpinner message="Checking system status..." />
          )}
        </Card>

        {/* BullMQ Background Worker Verification Card */}
        <Card
          title="Background Worker Test"
          subtitle="Dispatch asynchronous test job to BullMQ queue"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <Input
              id="test-job-message"
              label="Job Message"
              type="text"
              value={queueMessage}
              onChange={(e) => setQueueMessage(e.target.value)}
              placeholder="Enter message for worker..."
            />

            <Button
              id="test-job-trigger-button"
              variant="primary"
              onClick={handleTriggerQueueJob}
              isLoading={isQueueTriggering}
              disabled={!queueMessage.trim()}
              style={{ fontSize: '0.8125rem' }}
            >
              <Activity size={15} />
              Dispatch Test Job
            </Button>

            {queueResult && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '0.8125rem',
                  color: '#6ee7b7'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  <span>Enqueued to BullMQ Worker</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Job ID: {queueResult.jobId}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Workspace Members List */}
      <Card
        title="Workspace Members"
        subtitle={`Users authorized to access ${currentWorkspace?.name || 'this workspace'}`}
        action={
          isOwnerOrAdmin && (
            <Button
              variant="secondary"
              onClick={() => setIsInviteModalOpen(true)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              <UserPlus size={14} />
              Add Member
            </Button>
          )
        }
      >
        {isLoadingWorkspace ? (
          <LoadingSpinner />
        ) : workspaceDetails?.members && workspaceDetails.members.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {workspaceDetails.members.map((member: WorkspaceMember) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#818cf8',
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  >
                    {(member.user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {member.user?.name || 'Unknown User'}
                      {member.userId === user?.id && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                          (You)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {member.user?.email}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Badge variant={member.role.toLowerCase() as 'owner' | 'admin' | 'member'}>
                    {member.role}
                  </Badge>

                  {isOwnerOrAdmin && member.role !== 'OWNER' && member.userId !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      title="Remove member"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex'
                      }}
                    >
                      <Trash2 size={16} color="var(--danger)" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>No members loaded for this workspace.</p>
          </div>
        )}
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Add Workspace Member"
      >
        {inviteError && <ErrorBanner message={inviteError} />}

        <form onSubmit={handleInviteMember}>
          <Input
            id="invite-member-email"
            label="User Email"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <div className="form-group">
            <label htmlFor="invite-member-role" className="form-label">
              Role
            </label>
            <select
              id="invite-member-role"
              className="form-select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
            >
              <option value="MEMBER">Member (Standard Workspace Access)</option>
              <option value="ADMIN">Admin (Manage Members & Workspaces)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isInviting}
            >
              Add Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
