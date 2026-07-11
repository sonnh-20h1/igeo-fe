import { authApi } from './api';
import { clearStoredSession, readStoredSession, writeStoredSession } from './storage';
import { ApiError } from '@/lib/api/client';
import type {
  AccountResponseDto,
  AuthSession,
  AuthTokens,
  ChangePasswordPayload,
  Credentials,
  Role,
  UpdateProfilePayload,
  User,
} from './types';
import { formatDob, isAdminRole } from './types';

function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function mapAccount(dto: AccountResponseDto, roleHint: Role, previousUser?: User | null): User {
  const email =
    typeof dto.email === 'string' && dto.email.trim()
      ? dto.email.trim()
      : (previousUser?.email ?? '');
  const fullName =
    typeof dto.fullName === 'string' && dto.fullName.trim()
      ? dto.fullName.trim()
      : (previousUser?.fullName ?? previousUser?.name ?? (email || 'User'));
  const role: Role =
    dto.role === 'ADMIN' || dto.role === 'USER'
      ? dto.role
      : roleHint === 'ADMIN' || previousUser?.role === 'ADMIN'
        ? 'ADMIN'
        : 'USER';

  return {
    id: dto.id,
    email,
    fullName,
    name: fullName,
    role,
    phone: typeof dto.phone === 'string' ? dto.phone : previousUser?.phone,
    avatar: typeof dto.avatar === 'string' ? dto.avatar : previousUser?.avatar,
    cccd: typeof dto.cccd === 'string' ? dto.cccd : previousUser?.cccd,
    dob: formatDob(dto.dob) ?? previousUser?.dob,
    className: typeof dto.className === 'string' ? dto.className : previousUser?.className,
    school: typeof dto.school === 'string' ? dto.school : previousUser?.school,
    activated: typeof dto.activated === 'boolean' ? dto.activated : previousUser?.activated,
    blocked: typeof dto.blocked === 'boolean' ? dto.blocked : previousUser?.blocked,
    canLogin: typeof dto.canLogin === 'boolean' ? dto.canLogin : previousUser?.canLogin,
  };
}

async function loadAccount(tokens: AuthTokens, role: Role, previousUser?: User | null): Promise<User> {
  if (role === 'ADMIN') {
    const account = await authApi.getMe(tokens.accessToken, 'ADMIN');
    return mapAccount(account, 'ADMIN', previousUser);
  }

  try {
    const account = await authApi.getMe(tokens.accessToken, 'USER');
    return mapAccount(account, 'USER', previousUser);
  } catch {
    const account = await authApi.getAccount(tokens.accessToken);
    return mapAccount(account, 'USER', previousUser);
  }
}

export class AuthRepository {
  async signIn(credentials: Credentials, role: Role = 'USER'): Promise<AuthSession> {
    const tokens = await authApi.signIn(credentials, role);
    const user = await loadAccount(tokens, role, null);
    const session = { user, tokens };
    writeStoredSession(session);
    return session;
  }

  async restoreSession(): Promise<AuthSession | null> {
    const storedSession = readStoredSession();
    if (!storedSession) return null;

    const role: Role = storedSession.user?.role ?? 'USER';

    try {
      const user = await loadAccount(storedSession.tokens, role, storedSession.user);
      const nextSession = {
        user,
        tokens: storedSession.tokens,
      };
      writeStoredSession(nextSession);
      return nextSession;
    } catch {
      try {
        const refreshedTokens = await authApi.refresh(storedSession.tokens.refreshToken, role);
        const user = await loadAccount(refreshedTokens, role, storedSession.user);
        const nextSession = {
          user,
          tokens: refreshedTokens,
        };
        writeStoredSession(nextSession);
        return nextSession;
      } catch (refreshError) {
        if (isUnauthorizedError(refreshError)) {
          clearStoredSession();
          return null;
        }

        return storedSession;
      }
    }
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthSession> {
    const storedSession = readStoredSession();
    if (!storedSession) {
      throw new Error('Session expired');
    }

    if (isAdminRole(storedSession.user.role)) {
      throw new Error('Admin profile cannot be updated from this app yet');
    }

    const account = await authApi.updateAccount(storedSession.tokens.accessToken, payload);
    const nextSession = {
      user: mapAccount(account, 'USER', storedSession.user),
      tokens: storedSession.tokens,
    };
    writeStoredSession(nextSession);
    return nextSession;
  }

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    const storedSession = readStoredSession();
    if (!storedSession) {
      throw new Error('Session expired');
    }

    if (isAdminRole(storedSession.user.role)) {
      throw new Error('Admin password cannot be changed from this app yet');
    }

    await authApi.changePassword(storedSession.tokens.accessToken, payload);
  }

  signOut() {
    clearStoredSession();
  }
}

export const authRepository = new AuthRepository();
