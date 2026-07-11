import { apiRequest } from '@/lib/api/client';
import type {
  AccountResponseDto,
  AuthTokenDto,
  ChangePasswordPayload,
  LoginDto,
  Role,
  UpdateProfilePayload,
} from './types';

type ApiEnvelope<T> =
  | T
  | {
      statusCode?: number;
      message?: string;
      data?: T;
    };

function unwrapEnvelope<T>(payload: ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data as T;
  }

  return payload as T;
}

export const authApi = {
  signIn(payload: LoginDto, role: Role = 'USER') {
    const endpoint = role === 'ADMIN' ? '/admin/auth/sign-in' : '/user/auth/sign-in';
    return apiRequest<AuthTokenDto>(endpoint, {
      method: 'POST',
      body: payload,
    });
  },

  refresh(token: string, role: Role = 'USER') {
    const endpoint = role === 'ADMIN' ? '/admin/auth/refresh' : '/user/auth/refresh';
    return apiRequest<AuthTokenDto>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getMe(token: string, role: Role = 'USER') {
    const endpoint = role === 'ADMIN' ? '/admin/auth/me' : '/user/auth/me';
    return apiRequest<AccountResponseDto>(endpoint, {
      method: 'GET',
      token,
    });
  },

  getAccount(token: string) {
    return apiRequest<ApiEnvelope<AccountResponseDto>>('/user/account', {
      method: 'GET',
      token,
    }).then(unwrapEnvelope);
  },

  updateAccount(token: string, payload: UpdateProfilePayload) {
    return apiRequest<ApiEnvelope<AccountResponseDto>>('/user/account', {
      method: 'PATCH',
      token,
      body: payload,
    }).then(unwrapEnvelope);
  },

  changePassword(token: string, payload: ChangePasswordPayload) {
    return apiRequest<ApiEnvelope<boolean>>('/user/account/password', {
      method: 'PATCH',
      token,
      body: payload,
    }).then(unwrapEnvelope);
  },
};
