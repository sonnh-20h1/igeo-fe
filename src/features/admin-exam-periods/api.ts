import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  CreateExamPeriodPayload,
  ExamPeriod,
  ExamPeriodExamsResult,
  ExamPeriodListResult,
  ListExamPeriodsQuery,
  UpdateExamPeriodPayload,
} from './types';

function requireToken() {
  const token = readAccessToken();
  if (!token) throw new Error('Session expired');
  return token;
}

export const adminExamPeriodsApi = {
  list(query: ListExamPeriodsQuery = {}) {
    return apiRequest<ExamPeriodListResult>('/admin/exam-periods', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(periodId: string) {
    return apiRequest<ExamPeriod>(`/admin/exam-periods/${periodId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },

  listExams(periodId: string) {
    return apiRequest<ExamPeriodExamsResult>(`/admin/exam-periods/${periodId}/exams`, {
      method: 'GET',
      token: requireToken(),
    });
  },

  create(payload: CreateExamPeriodPayload) {
    return apiRequest<ExamPeriod>('/admin/exam-periods', {
      method: 'POST',
      token: requireToken(),
      body: payload,
    });
  },

  update(periodId: string, payload: UpdateExamPeriodPayload) {
    return apiRequest<ExamPeriod>(`/admin/exam-periods/${periodId}`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },

  activate(periodId: string) {
    return apiRequest<ExamPeriod>(`/admin/exam-periods/${periodId}/activate`, {
      method: 'PATCH',
      token: requireToken(),
    });
  },

  remove(periodId: string) {
    return apiRequest<boolean>(`/admin/exam-periods/${periodId}`, {
      method: 'DELETE',
      token: requireToken(),
    });
  },
};
