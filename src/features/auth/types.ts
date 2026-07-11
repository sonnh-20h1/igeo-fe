export type Role = 'ADMIN' | 'USER';

export type User = {
  id: string;
  fullName: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  cccd?: string;
  dob?: string;
  className?: string;
  school?: string;
  activated?: boolean;
  blocked?: boolean;
  canLogin?: boolean;
};

export type Credentials = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = {
  user: User;
  tokens: AuthTokens;
};

export type UpdateProfilePayload = {
  fullName?: string;
  phone?: string;
  cccd?: string;
  dob?: string;
  className?: string;
  school?: string;
  avatar?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type AuthTokenDto = {
  accessToken: string;
  refreshToken: string;
};

export type AccountResponseDto = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  avatar?: string | null;
  role?: Role | null;
  cccd?: string | null;
  dob?: string | Date | null;
  className?: string | null;
  school?: string | null;
  activated?: boolean;
  blocked?: boolean;
  canLogin?: boolean;
  createdDate?: string | Date;
  updatedDate?: string | Date;
};

export function isAdminRole(role: Role | string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function formatDob(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return value.toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}
