import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Modal } from './components/Modal.js';
import { Input } from './components/Input.js';
import { Button } from './components/Button.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { BrandListPage } from './pages/BrandListPage.js';
import { BrandWizardPage } from './pages/BrandWizardPage.js';
import { BrandDetailPage } from './pages/BrandDetailPage.js';
import { MarketingDashboardPage } from './pages/MarketingDashboardPage.js';
import { MarketingStrategyPage } from './pages/MarketingStrategyPage.js';
import { CampaignListPage } from './pages/CampaignListPage.js';
import { CampaignWizardPage } from './pages/CampaignWizardPage.js';
import { CampaignDetailPage } from './pages/CampaignDetailPage.js';
import { ContentPlanListPage } from './pages/ContentPlanListPage.js';
import { ContentPlanWizardPage } from './pages/ContentPlanWizardPage.js';
import { ContentCalendarPage } from './pages/ContentCalendarPage.js';
import { ReelsDashboardPage } from './pages/ReelsDashboardPage.js';
import { ReelProductionPlanPage } from './pages/ReelProductionPlanPage.js';
import { BrandAssetLibraryPage } from './pages/BrandAssetLibraryPage.js';
import { ReelMediaStudioPage } from './pages/ReelMediaStudioPage.js';
import { AnimationStudioPage } from './pages/AnimationStudioPage.js';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage.js';
import { OptimizationDashboardPage } from './pages/OptimizationDashboardPage.js';
import { AutonomousOperationsDashboardPage } from './pages/AutonomousOperationsDashboardPage.js';
import { BillingPage } from './pages/BillingPage.js';
import { apiRequest } from './lib/api.js';

import type { Workspace } from '@vidsnapai/types';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function MainAppLayout() {
  const { refreshWorkspaces } = useAuth();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createWsError, setCreateWsError] = useState('');
  const [isCreatingWs, setIsCreatingWs] = useState(false);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setCreateWsError('');
    setIsCreatingWs(true);

    try {
      await apiRequest<{ workspace: Workspace }>('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: newWorkspaceName.trim() })
      });
      setIsCreateWorkspaceOpen(false);
      setNewWorkspaceName('');
      await refreshWorkspaces();
    } catch (err: unknown) {
      setCreateWsError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setIsCreatingWs(false);
    }
  };

  return (
    <div className="app-container">
      <Navbar onCreateWorkspace={() => setIsCreateWorkspaceOpen(true)} />

      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands"
          element={
            <ProtectedRoute>
              <BrandListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/new"
          element={
            <ProtectedRoute>
              <BrandWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId"
          element={
            <ProtectedRoute>
              <BrandDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketing"
          element={
            <ProtectedRoute>
              <MarketingDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/marketing"
          element={
            <ProtectedRoute>
              <MarketingDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/marketing/strategy"
          element={
            <ProtectedRoute>
              <MarketingStrategyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <CampaignListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/campaigns"
          element={
            <ProtectedRoute>
              <CampaignListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/campaigns/new"
          element={
            <ProtectedRoute>
              <CampaignWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/campaigns/:campaignId"
          element={
            <ProtectedRoute>
              <CampaignDetailPage />
            </ProtectedRoute>
          }
        />
        {/* Phase 4: 30-Day Content Planner Routes */}
        <Route
          path="/planner"
          element={
            <ProtectedRoute>
              <ContentPlanListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/content-plans"
          element={
            <ProtectedRoute>
              <ContentPlanListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/content-plans/new"
          element={
            <ProtectedRoute>
              <ContentPlanWizardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/content-plans/:planId"
          element={
            <ProtectedRoute>
              <ContentCalendarPage />
            </ProtectedRoute>
          }
        />
        {/* Phase 5: Autonomous Reel Orchestrator Routes */}
        <Route
          path="/reels"
          element={
            <ProtectedRoute>
              <ReelsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/reels"
          element={
            <ProtectedRoute>
              <ReelsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/content-plans/:planId/reels"
          element={
            <ProtectedRoute>
              <ReelsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/reels/:reelId"
          element={
            <ProtectedRoute>
              <ReelProductionPlanPage />
            </ProtectedRoute>
          }
        />
        {/* Phase 6: Media + Voice + Captions + Audio Studio Routes */}
        <Route
          path="/brands/:brandId/assets"
          element={
            <ProtectedRoute>
              <BrandAssetLibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/reels/:reelId/media"
          element={
            <ProtectedRoute>
              <ReelMediaStudioPage />
            </ProtectedRoute>
          }
        />
        {/* Phase 7: Advanced Animation Intelligence Studio Routes */}
        <Route
          path="/brands/:brandId/reels/:reelId/animation"
          element={
            <ProtectedRoute>
              <AnimationStudioPage />
            </ProtectedRoute>
          }
        />
        {/* Phase 11: Performance Intelligence & Analytics Routes */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsDashboardPage />
            </ProtectedRoute>
          }
        />
        {/* Phase 12: Autonomous Campaign Optimization & Execution Engine Routes */}
        <Route
          path="/optimization"
          element={
            <ProtectedRoute>
              <OptimizationDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/optimization"
          element={
            <ProtectedRoute>
              <OptimizationDashboardPage />
            </ProtectedRoute>
          }
        />
        {/* Phase 13: Autonomous Operations & Self-Optimizing Campaign Engine Routes */}
        <Route
          path="/autonomous"
          element={
            <ProtectedRoute>
              <AutonomousOperationsDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/brands/:brandId/autonomous"
          element={
            <ProtectedRoute>
              <AutonomousOperationsDashboardPage />
            </ProtectedRoute>
          }
        />
        {/* Phase 15: SaaS Commercialization & Billing */}
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>

      {/* Global Create Workspace Modal */}
      <Modal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        title="Create New Workspace"
      >
        {createWsError && <ErrorBanner message={createWsError} />}

        <form onSubmit={handleCreateWorkspace}>
          <Input
            id="new-workspace-name"
            label="Workspace Name"
            type="text"
            placeholder="e.g. Acme Marketing Studio"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            required
            autoFocus
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateWorkspaceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreatingWs}
              disabled={!newWorkspaceName.trim()}
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <MainAppLayout />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
