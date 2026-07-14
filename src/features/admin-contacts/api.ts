import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  Contact,
  ContactListResult,
  CreateContactPayload,
  ListContactsQuery,
  UpdateContactPayload,
} from './types';

function requireToken() {
  const token = readAccessToken();
  if (!token) throw new Error('Session expired');
  return token;
}

export const publicContactsApi = {
  submit(payload: CreateContactPayload) {
    return apiRequest<Contact>('/public/contacts', {
      method: 'POST',
      body: {
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        content: payload.content.trim(),
      },
    });
  },
};

export const adminContactsApi = {
  list(query: ListContactsQuery = {}) {
    return apiRequest<ContactListResult>('/admin/contacts', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(contactId: string) {
    return apiRequest<Contact>(`/admin/contacts/${contactId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },

  update(contactId: string, payload: UpdateContactPayload) {
    return apiRequest<Contact>(`/admin/contacts/${contactId}`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },

  delete(contactId: string) {
    return apiRequest<boolean>(`/admin/contacts/${contactId}`, {
      method: 'DELETE',
      token: requireToken(),
    });
  },
};
