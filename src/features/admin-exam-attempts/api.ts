import { apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  ExamAttemptAdminDetail,
  ExamAttemptListResult,
  GradeAttemptPayload,
  GradeQuestionPayload,
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

  unlock(attemptId: string) {
    return apiRequest<ExamAttemptAdminDetail>(`/admin/exam-attempts/${attemptId}/unlock`, {
      method: 'PATCH',
      token: requireToken(),
    });
  },

  gradeAttempt(attemptId: string, payload: GradeAttemptPayload) {
    return apiRequest<ExamAttemptAdminDetail>(`/admin/exam-attempts/${attemptId}/grade`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },

  gradeQuestion(attemptId: string, questionShortId: string, payload: GradeQuestionPayload) {
    return apiRequest<ExamAttemptAdminDetail>(
      `/admin/exam-attempts/${attemptId}/answers/${questionShortId}/grade`,
      {
        method: 'PATCH',
        token: requireToken(),
        body: payload,
      },
    );
  },

  updateScoreAndPublish(attemptId: string, payload: { totalScore?: number; publishScoresAt?: string | null }) {
    return apiRequest<ExamAttemptAdminDetail>(`/admin/exam-attempts/${attemptId}/score-publish`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },
};
