import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Workspace, WorkspaceRole } from '@vidsnapai/types';
import type { SignupInput, LoginInput } from '@vidsnapai/validation';
import { apiRequest, setActiveWorkspaceId } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  workspaces: (Workspace & { role: WorkspaceRole; memberCount: number })[];
  currentWorkspace: (Workspace & { role: WorkspaceRole; memberCount: number }) | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<(Workspace & { role: WorkspaceRole; memberCount: number })[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<(Workspace & { role: WorkspaceRole; memberCount: number }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      setActiveWorkspaceId(currentWorkspace.id);
    }
  }, [currentWorkspace]);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiRequest<{
        user: User;
        workspaces: (Workspace & { role: WorkspaceRole; memberCount: number })[];
      }>('/api/auth/me');

      setUser(data.user);
      setWorkspaces(data.workspaces || []);

      if (data.workspaces && data.workspaces.length > 0) {
        setCurrentWorkspace((prev) => {
          if (prev && data.workspaces.some((w) => w.id === prev.id)) {
            const matched = data.workspaces.find((w) => w.id === prev.id)!;
            setActiveWorkspaceId(matched.id);
            return matched;
          }
          const savedWsId = typeof window !== 'undefined' ? localStorage.getItem('vidsnapai_active_workspace_id') : null;
          const foundSaved = savedWsId ? data.workspaces.find((w) => w.id === savedWsId) : null;
          const selected = foundSaved || data.workspaces[0];
          setActiveWorkspaceId(selected.id);
          return selected;
        });
      }
    } catch {
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setActiveWorkspaceId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    try {
      await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      await refreshSession();
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (input: SignupInput) => {
    setIsLoading(true);
    try {
      await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      await refreshSession();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setActiveWorkspaceId(null);
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setCurrentWorkspace(ws);
      setActiveWorkspaceId(ws.id);
    }
  };

  const refreshWorkspaces = async () => {
    const data = await apiRequest<{ workspaces: (Workspace & { role: WorkspaceRole; memberCount: number })[] }>('/api/workspaces');
    setWorkspaces(data.workspaces);
    if (data.workspaces.length > 0 && (!currentWorkspace || !data.workspaces.some(w => w.id === currentWorkspace.id))) {
      setCurrentWorkspace(data.workspaces[0]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        currentWorkspace,
        isLoading,
        login,
        signup,
        logout,
        switchWorkspace,
        refreshWorkspaces
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
