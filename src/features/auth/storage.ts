import type { AuthSession, User } from './types';

const SESSION_KEY = 'irecs:authSession';
export const SESSION_COOKIE_NAME = 'irecs_auth_session';
export const USER_COOKIE_NAME = 'irecs_auth_user';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function mergeStoredUser(baseUser: User | null | undefined, overrideUser: User | null | undefined) {
  if (!baseUser && !overrideUser) {
    return null;
  }

  if (!baseUser) {
    return overrideUser ?? null;
  }

  if (!overrideUser) {
    return baseUser;
  }

  return {
    ...baseUser,
    ...overrideUser,
    id: overrideUser.id || baseUser.id,
    fullName: overrideUser.fullName || baseUser.fullName,
    name: overrideUser.name || baseUser.name,
    email: overrideUser.email || baseUser.email,
    role: overrideUser.role || baseUser.role,
  };
}

function normalizeStoredSession(session: AuthSession | null, cookieUserRaw?: string | null) {
  if (!session) return null;

  const cookieUser = parseStoredUserValue(
    cookieUserRaw !== undefined ? cookieUserRaw : readCookie(USER_COOKIE_NAME),
  );
  const mergedUser = mergeStoredUser(session.user, cookieUser);

  if (!mergedUser?.id || !session.tokens?.accessToken || !session.tokens?.refreshToken) {
    return null;
  }

  return {
    ...session,
    user: mergedUser,
  } satisfies AuthSession;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;
  const rawCookie = document.cookie
    .split('; ')
    .find((cookiePart) => cookiePart.startsWith(prefix));

  return rawCookie ? rawCookie.slice(prefix.length) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readStoredSession(): AuthSession | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const legacyRaw = localStorage.getItem(SESSION_KEY);
      if (legacyRaw) {
        return normalizeStoredSession(JSON.parse(legacyRaw) as AuthSession);
      }
    }

    const raw = readCookie(SESSION_COOKIE_NAME);
    const parsedCookieSession = parseStoredSessionValue(raw);
    if (parsedCookieSession) return parsedCookieSession;

    return null;
  } catch {
    return null;
  }
}

export function readStoredUser(): User | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const legacyRaw = localStorage.getItem(SESSION_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw) as Partial<AuthSession> | null;
        const sessionUser =
          parsed && typeof parsed === 'object' && 'user' in parsed ? parsed.user : null;

        if (
          sessionUser &&
          typeof sessionUser === 'object' &&
          'id' in sessionUser &&
          typeof sessionUser.id === 'string' &&
          sessionUser.id.trim()
        ) {
          return sessionUser as User;
        }
      }
    }

    return parseStoredUserValue(readCookie(USER_COOKIE_NAME));
  } catch {
    return null;
  }
}

export function parseStoredSessionValue(
  raw: string | null | undefined,
  userCookieRaw?: string | null,
): AuthSession | null {
  if (!raw) return null;

  try {
    return normalizeStoredSession(JSON.parse(decodeURIComponent(raw)) as AuthSession, userCookieRaw);
  } catch {
    return null;
  }
}

export function writeStoredSession(session: AuthSession) {
  const userRaw = encodeURIComponent(JSON.stringify(session.user));
  clearCookie(SESSION_COOKIE_NAME);
  writeCookie(USER_COOKIE_NAME, userRaw, COOKIE_MAX_AGE);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function readAccessToken(): string | null {
  return readStoredSession()?.tokens.accessToken ?? null;
}

export function hasStoredAuth() {
  return Boolean(readAccessToken() || readStoredUser());
}

export function clearStoredSession() {
  clearCookie(SESSION_COOKIE_NAME);
  clearCookie(USER_COOKIE_NAME);

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function parseStoredUserValue(raw: string | null | undefined): User | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as User;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}
