import { apiRequest } from '@/lib/api/client';
import { requireExamSessionToken } from '@/features/exam-session/storage';
import type {
  ExamAttemptInProgress,
  ExamAttemptListResult,
  ExamAttemptResult,
  ListAttemptsQuery,
  SaveAttemptAnswersPayload,
} from './types';

export const userExamAttemptsApi = {
  start(examId: string) {
    return apiRequest<ExamAttemptInProgress>(`/public/exams/${examId}/attempts`, {
      method: 'POST',
      examSession: requireExamSessionToken(),
    });
  },

  list(query: ListAttemptsQuery = {}) {
    return apiRequest<ExamAttemptListResult>('/public/exam-attempts', {
      method: 'GET',
      examSession: requireExamSessionToken(),
      query,
    });
  },

  getById(attemptId: string) {
    return apiRequest<ExamAttemptInProgress>(`/public/exam-attempts/${attemptId}`, {
      method: 'GET',
      examSession: requireExamSessionToken(),
    });
  },

  saveAnswers(attemptId: string, payload: SaveAttemptAnswersPayload) {
    return apiRequest<ExamAttemptInProgress>(`/public/exam-attempts/${attemptId}/answers`, {
      method: 'PATCH',
      examSession: requireExamSessionToken(),
      body: payload,
    });
  },

  submit(attemptId: string) {
    return apiRequest<ExamAttemptResult>(`/public/exam-attempts/${attemptId}/submit`, {
      method: 'POST',
      examSession: requireExamSessionToken(),
    });
  },

  getResult(attemptId: string) {
    return apiRequest<ExamAttemptResult>(`/public/exam-attempts/${attemptId}/result`, {
      method: 'GET',
      examSession: requireExamSessionToken(),
    });
  },
};
