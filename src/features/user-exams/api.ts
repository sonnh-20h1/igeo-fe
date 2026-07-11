import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type { ExamUserDetail, ExamUserListResult, ListUserExamsQuery } from './types';

function requireToken() {
  const token = readAccessToken();
  if (!token) throw new Error('Session expired');
  return token;
}

export const userExamsApi = {
  list(query: ListUserExamsQuery = {}) {
    return apiRequest<ExamUserListResult>('/user/exams', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(examId: string) {
    return apiRequest<ExamUserDetail>(`/user/exams/${examId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },
};
