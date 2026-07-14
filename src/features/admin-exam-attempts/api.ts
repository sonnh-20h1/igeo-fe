import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  ExamAttemptAdminDetail,
  ExamAttemptListResult,
  ListAttemptsQuery,
} from '@/features/user-exam-attempts/types';

function requireToken() {
  const token = readAccessToken();
  if (!token) throw new Error('Session expired');
  return token;
}

export const adminExamAttemptsApi = {
  list(query: ListAttemptsQuery = {}) {
    return apiRequest<ExamAttemptListResult>('/admin/exam-attempts', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(attemptId: string) {
    return apiRequest<ExamAttemptAdminDetail>(`/admin/exam-attempts/${attemptId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },
};
