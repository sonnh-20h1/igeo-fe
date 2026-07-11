'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authRepository } from '@/features/auth/repository';
import type {
  AuthSession,
  ChangePasswordPayload,
  Credentials,
  Role,
  UpdateProfilePayload,
  User,
} from '@/features/auth/types';

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  signing: boolean;
  signIn: (creds: Credentials, role?: Role) => Promise<User>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function resolveInitialUser(
  initialSession: AuthSession | null | undefined,
  initialUser: User | null | undefined,
) {
  if (initialSession?.user?.id) return initialSession.user;
  if (initialUser?.id) return initialUser;
  return null;
}

export function AuthProvider({
  children,
  initialSession = null,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialSession?: AuthSession | null;
  initialUser?: User | null;
}) {
  // Only use server-provided cookies for the first paint so SSR HTML matches hydration.
  // localStorage is read later inside restoreSession().
  const [user, setUser] = useState<User | null>(() =>
    resolveInitialUser(initialSession, initialUser),
  );
  const [ready, setReady] = useState(() => Boolean(resolveInitialUser(initialSession, initialUser)));
  const [signing, setSigning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function restore() {
      try {
        const session = await authRepository.restoreSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setReady(true);
        }
      } catch {
        if (mounted) {
          setUser(null);
          setReady(true);
        }
      }
    }

    void restore();

    return () => {
      mounted = false;
    };
  }, []);

  async function signIn(creds: Credentials, role: Role = 'USER') {
    setSigning(true);
    try {
      const session = await authRepository.signIn(creds, role);
      setUser(session.user);
      return session.user;
    } finally {
      setSigning(false);
    }
  }

  async function updateProfile(payload: UpdateProfilePayload) {
    setSigning(true);
    try {
      const session = await authRepository.updateProfile(payload);
      setUser(session.user);
      return session.user;
    } finally {
      setSigning(false);
    }
  }

  async function changePassword(payload: ChangePasswordPayload) {
    setSigning(true);
    try {
      await authRepository.changePassword(payload);
    } finally {
      setSigning(false);
    }
  }

  function signOut() {
    const wasAdmin = user?.role === 'ADMIN';
    authRepository.signOut();
    setUser(null);
    router.push(wasAdmin ? '/login/admin' : '/login');
  }

  return (
    <AuthContext.Provider
      value={{ user, ready, signing, signIn, updateProfile, changePassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { Credentials, Role, User } from '@/features/auth/types';
