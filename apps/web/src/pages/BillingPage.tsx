import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../lib/api.js';
import { Card } from '../components/Card.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { Modal } from '../components/Modal.js';
import { LoadingSpinner } from '../components/LoadingSpinner.js';
import { ErrorBanner } from '../components/ErrorBanner.js';
import {
  CheckCircle2,
  Zap,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  HardDrive,
  Film,
  Layers,
  Bot,
  ExternalLink,
  Receipt
} from 'lucide-react';
import type {
  BillingPlan,
  WorkspaceSubscription,
  WorkspaceUsageRecord,
  TierLimits,
  BillingInvoice,
  SubscriptionTier
} from '@vidsnapai/types';

export const BillingPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);
  const [limits, setLimits] = useState<TierLimits | null>(null);
  const [usage, setUsage] = useState<WorkspaceUsageRecord | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<BillingPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchBillingData = async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Fetch available plans
      const plansRes = await apiRequest<{ plans: BillingPlan[] }>('/billing/plans');
      setPlans(plansRes.plans);

      // 2. Fetch workspace subscription & usage
      const subRes = await apiRequest<{
        subscription: WorkspaceSubscription;
        plan: BillingPlan;
        limits: TierLimits;
        usage: WorkspaceUsageRecord;
      }>('/billing/subscription', {
        headers: { 'x-workspace-id': currentWorkspace.id }
      });
      setSubscription(subRes.subscription);
      setLimits(subRes.limits);
      setUsage(subRes.usage);

      // 3. Fetch billing invoices history
      try {
        const invRes = await apiRequest<{ invoices: BillingInvoice[] }>('/billing/invoices', {
          headers: { 'x-workspace-id': currentWorkspace.id }
        });
        setInvoices(invRes.invoices || []);
      } catch {
        // Non-blocking for mock/demo
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [currentWorkspace?.id]);

  const handleCheckout = async (tier: SubscriptionTier) => {
    if (!currentWorkspace) return;
    setIsUpgrading(true);
    setErrorMessage('');

    try {
      const res = await apiRequest<{ checkoutUrl: string; sessionId: string; mode: string }>(
        '/billing/checkout',
        {
          method: 'POST',
          headers: { 'x-workspace-id': currentWorkspace.id },
          body: JSON.stringify({
            tier,
            interval: billingInterval,
            successUrl: `${window.location.origin}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancelUrl: `${window.location.origin}/billing?canceled=true`
          })
        }
      );

      if (res.checkoutUrl) {
        if (res.mode === 'simulated') {
          // Dev / Test simulation confirmation
          setSuccessMessage(`[Local / Test Mode] Subscription tier upgraded to ${tier} in database!`);
          setSelectedPlanForUpgrade(null);
          await fetchBillingData();
        } else {
          // Redirect to live Stripe Checkout
          window.location.href = res.checkoutUrl;
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await apiRequest<{ portalUrl: string }>('/billing/portal', {
        method: 'POST',
        headers: { 'x-workspace-id': currentWorkspace.id },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/billing`
        })
      });
      if (res.portalUrl) {
        window.location.href = res.portalUrl;
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading global subscription & usage data..." />
      </div>
    );
  }

  const currentTier = subscription?.tier || 'FREE';
  const currentPlan = plans.find((p) => p.tier === currentTier) || plans[0];

  const reelsUsed = usage?.reelsGenerated || 0;
  const reelsLimit = limits?.maxReelsPerMonth === -1 ? 'Unlimited' : (limits?.maxReelsPerMonth || 5);
  const reelsPercent = typeof reelsLimit === 'number' ? Math.min(100, Math.round((reelsUsed / reelsLimit) * 100)) : 10;

  const campaignsUsed = usage?.campaignsCreated || 0;
  const campaignsLimit = limits?.maxCampaignsPerMonth === -1 ? 'Unlimited' : (limits?.maxCampaignsPerMonth || 1);
  const campaignsPercent = typeof campaignsLimit === 'number' ? Math.min(100, Math.round((campaignsUsed / campaignsLimit) * 100)) : 10;

  const storageUsedMb = Math.round((usage?.storageUsedBytes || 0) / (1024 * 1024));
  const storageLimitGb = limits?.storageLimitGb || 1;
  const storagePercent = Math.min(100, Math.round((storageUsedMb / (storageLimitGb * 1024)) * 100));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Subscription & Billing
            </h1>
            <Badge variant="primary">{currentTier}</Badge>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', fontWeight: 600 }}>
              {subscription?.stripeCustomerId ? 'Live Stripe' : 'Local / Test Mode'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Manage your workspace subscription plan, view real-time resource metering, and manage invoices.
          </p>
        </div>

        {subscription?.stripeCustomerId && (
          <Button variant="secondary" onClick={handleOpenPortal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ExternalLink size={15} />
            <span>Customer Portal</span>
          </Button>
        )}
      </div>

      {errorMessage && <ErrorBanner message={errorMessage} />}
      {successMessage && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.875rem 1.25rem',
            color: '#4ade80',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid: Current Plan & Usage Limits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* Current Plan Overview Card */}
        <Card style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Active Subscription
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                {currentPlan?.name || currentTier}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              ${currentPlan?.monthlyPriceUsd}
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}> / month</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              {currentPlan?.description}
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Plan Capabilities
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} color="#34d399" />
                <span>Export Quality: <strong>{limits?.exportResolution.toUpperCase()}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} color={limits?.autonomousEngineEnabled ? '#34d399' : 'var(--text-muted)'} />
                <span>Autonomous 24/7 Engine: <strong>{limits?.autonomousEngineEnabled ? 'Enabled' : 'Disabled'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} color={limits?.metaPublishingEnabled ? '#34d399' : 'var(--text-muted)'} />
                <span>Meta Ads Publishing: <strong>{limits?.metaPublishingEnabled ? 'Enabled' : 'Disabled'}</strong></span>
              </div>
            </div>
          </div>

          {currentTier !== 'ENTERPRISE' && (
            <Button
              variant="primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={() => setSelectedPlanForUpgrade(plans.find((p) => p.tier === 'PRO') || plans[2])}
            >
              <Sparkles size={16} />
              <span>Upgrade to Pro</span>
            </Button>
          )}
        </Card>

        {/* Real-time Usage Metering Card */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Monthly Usage & Quotas</h2>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Current Billing Period: <strong>{usage?.periodMonth || 'Current Month'}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
              <TrendingUp size={13} />
              <span>Live Metered</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Reels Generation Quota */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <Film size={14} color="var(--accent-primary)" />
                  Reels Generated
                </span>
                <span style={{ color: reelsUsed >= (typeof reelsLimit === 'number' ? reelsLimit : 9999) ? '#f87171' : 'var(--text-secondary)' }}>
                  <strong>{reelsUsed}</strong> / {reelsLimit} reels
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${reelsPercent}%`,
                    background: reelsPercent >= 90 ? '#ef4444' : 'var(--accent-gradient)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Campaigns Quota */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <Layers size={14} color="#f472b6" />
                  Active Campaigns
                </span>
                <span>
                  <strong>{campaignsUsed}</strong> / {campaignsLimit} campaigns
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${campaignsPercent}%`,
                    background: '#f472b6',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Storage Quota */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <HardDrive size={14} color="#38bdf8" />
                  Persistent Cloud Storage
                </span>
                <span>
                  <strong>{storageUsedMb} MB</strong> / {storageLimitGb} GB
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${storagePercent}%`,
                    background: '#38bdf8',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Autonomous Engine Quota */}
            <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot size={16} color={limits?.autonomousEngineEnabled ? '#38bdf8' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>24/7 Autonomous Optimizer</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {limits?.autonomousEngineEnabled ? 'Active & self-optimizing campaigns' : 'Available on Pro & Enterprise plans'}
                  </div>
                </div>
              </div>
              <Badge variant={limits?.autonomousEngineEnabled ? 'primary' : 'member'}>
                {limits?.autonomousEngineEnabled ? 'ACTIVE' : 'LOCKED'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Global Pricing Catalog */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Choose Your Growth Plan
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
            Transparent global pricing in USD. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Billing Interval Switcher */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <button
              onClick={() => setBillingInterval('month')}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: billingInterval === 'month' ? 'var(--accent-primary)' : 'transparent',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: billingInterval === 'year' ? 'var(--accent-primary)' : 'transparent',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>Annual Billing</span>
              <span style={{ fontSize: '0.65rem', background: '#22c55e', color: '#ffffff', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
          {plans.map((plan) => {
            const isCurrent = plan.tier === currentTier;
            const price = billingInterval === 'year' ? Math.round(plan.annualPriceUsd / 12) : plan.monthlyPriceUsd;

            return (
              <Card
                key={plan.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: plan.popular ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: plan.popular ? 'rgba(99, 102, 241, 0.06)' : undefined,
                  boxShadow: plan.popular ? '0 0 20px rgba(99, 102, 241, 0.15)' : undefined
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--accent-gradient)',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>{plan.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minHeight: '32px' }}>{plan.description}</div>

                  <div style={{ margin: '1.25rem 0' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
                      ${price}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}> / month</span>
                    </div>
                    {billingInterval === 'year' && plan.annualPriceUsd > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#34d399' }}>${plan.annualPriceUsd} billed annually</div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Features
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {plan.features.map((feat, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.78125rem', color: 'var(--text-secondary)' }}>
                          <CheckCircle2 size={13} color="#818cf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  {isCurrent ? (
                    <Button variant="secondary" disabled style={{ width: '100%' }}>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      variant={plan.popular ? 'primary' : 'secondary'}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      onClick={() => handleCheckout(plan.tier)}
                      isLoading={isUpgrading && selectedPlanForUpgrade?.tier === plan.tier}
                    >
                      <span>{plan.monthlyPriceUsd === 0 ? 'Downgrade' : 'Select ' + plan.name}</span>
                      <ArrowUpRight size={14} />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoices History Table */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Receipt size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Invoice History</h3>
        </div>

        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No billing invoices recorded yet for this workspace.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Invoice ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{inv.stripeInvoiceId}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>${inv.amountPaidUsd.toFixed(2)} USD</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <Badge variant={inv.status === 'PAID' ? 'primary' : 'member'}>{inv.status}</Badge>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      {inv.invoiceUrl ? (
                        <a
                          href={inv.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <span>View Receipt</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Plan Upgrade Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedPlanForUpgrade)}
        onClose={() => setSelectedPlanForUpgrade(null)}
        title={`Upgrade to ${selectedPlanForUpgrade?.name || ''}`}
      >
        <div style={{ padding: '0.5rem 0' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            You are upgrading your workspace to <strong>{selectedPlanForUpgrade?.name}</strong> at{' '}
            <strong>
              ${billingInterval === 'year' ? Math.round((selectedPlanForUpgrade?.annualPriceUsd || 0) / 12) : selectedPlanForUpgrade?.monthlyPriceUsd} / month
            </strong>.
          </p>

          <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#818cf8', marginBottom: '0.5rem' }}>
              <ShieldCheck size={16} />
              <span>Instant Upgrade Guarantee</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              Your new quota limits and 24/7 autonomous optimization features will be unlocked immediately upon checkout confirmation.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setSelectedPlanForUpgrade(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => selectedPlanForUpgrade && handleCheckout(selectedPlanForUpgrade.tier)}
              isLoading={isUpgrading}
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
