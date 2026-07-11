import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  CreateExamPayload,
  Exam,
  ExamListResult,
  ListExamsQuery,
  UpdateExamPayload,
} from './types';

function requireToken() {
  const token = readAccessToken();
  if (!token) {
    throw new Error('Session expired');
  }
  return token;
}

export const adminExamsApi = {
  list(query: ListExamsQuery = {}) {
    return apiRequest<ExamListResult>('/admin/exams', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(examId: string) {
    return apiRequest<Exam>(`/admin/exams/${examId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },

  create(payload: CreateExamPayload) {
    return apiRequest<Exam>('/admin/exams', {
      method: 'POST',
      token: requireToken(),
      body: payload,
    });
  },

  update(examId: string, payload: UpdateExamPayload) {
    return apiRequest<Exam>(`/admin/exams/${examId}`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },

  remove(examId: string) {
    return apiRequest<boolean>(`/admin/exams/${examId}`, {
      method: 'DELETE',
      token: requireToken(),
    });
  },
};
