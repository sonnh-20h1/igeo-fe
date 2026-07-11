import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  CreateUserPayload,
  ListUsersQuery,
  ManagedUser,
  UpdateUserPayload,
  UserListResult,
} from './types';

function requireToken() {
  const token = readAccessToken();
  if (!token) {
    throw new Error('Session expired');
  }
  return token;
}

export const adminUsersApi = {
  list(query: ListUsersQuery = {}) {
    return apiRequest<UserListResult>('/admin/users', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(userId: string) {
    return apiRequest<ManagedUser>(`/admin/users/${userId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },

  create(payload: CreateUserPayload) {
    return apiRequest<ManagedUser>('/admin/users', {
      method: 'POST',
      token: requireToken(),
      body: payload,
    });
  },

  update(userId: string, payload: UpdateUserPayload) {
    return apiRequest<ManagedUser>(`/admin/users/${userId}`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },

  remove(userId: string) {
    return apiRequest<boolean>(`/admin/users/${userId}`, {
      method: 'DELETE',
      token: requireToken(),
    });
  },
};
