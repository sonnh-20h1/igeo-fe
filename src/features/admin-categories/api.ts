import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  CreateCategoryPayload,
  ListCategoriesQuery,
  QuestionCategory,
  QuestionCategoryListResult,
  UpdateCategoryPayload,
} from './types';

function requireToken() {
  const token = readAccessToken();
  if (!token) throw new Error('Session expired');
  return token;
}

export const adminCategoriesApi = {
  list(query: ListCategoriesQuery = {}) {
    return apiRequest<QuestionCategoryListResult>('/admin/question-categories', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(categoryId: string) {
    return apiRequest<QuestionCategory>(`/admin/question-categories/${categoryId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },

  create(payload: CreateCategoryPayload) {
    return apiRequest<QuestionCategory>('/admin/question-categories', {
      method: 'POST',
      token: requireToken(),
      body: payload,
    });
  },

  update(categoryId: string, payload: UpdateCategoryPayload) {
    return apiRequest<QuestionCategory>(`/admin/question-categories/${categoryId}`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },

  remove(categoryId: string) {
    return apiRequest<boolean>(`/admin/question-categories/${categoryId}`, {
      method: 'DELETE',
      token: requireToken(),
    });
  },
};
