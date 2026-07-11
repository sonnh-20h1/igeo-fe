import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  ExamAttemptInProgress,
  ExamAttemptListResult,
  ExamAttemptResult,
  ListAttemptsQuery,
  SaveAttemptAnswersPayload,
} from './types';

function requireToken() {
  const token = readAccessToken();
  if (!token) throw new Error('Session expired');
  return token;
}

export const userExamAttemptsApi = {
  start(examId: string) {
    return apiRequest<ExamAttemptInProgress>(`/user/exams/${examId}/attempts`, {
      method: 'POST',
      token: requireToken(),
    });
  },

  list(query: ListAttemptsQuery = {}) {
    return apiRequest<ExamAttemptListResult>('/user/exam-attempts', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(attemptId: string) {
    return apiRequest<ExamAttemptInProgress>(`/user/exam-attempts/${attemptId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },

  saveAnswers(attemptId: string, payload: SaveAttemptAnswersPayload) {
    return apiRequest<ExamAttemptInProgress>(`/user/exam-attempts/${attemptId}/answers`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },

  submit(attemptId: string) {
    return apiRequest<ExamAttemptResult>(`/user/exam-attempts/${attemptId}/submit`, {
      method: 'POST',
      token: requireToken(),
    });
  },

  getResult(attemptId: string) {
    return apiRequest<ExamAttemptResult>(`/user/exam-attempts/${attemptId}/result`, {
      method: 'GET',
      token: requireToken(),
    });
  },
};
