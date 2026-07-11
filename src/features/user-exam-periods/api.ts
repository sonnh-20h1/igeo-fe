import { apiRequest } from '@/lib/api/client';
import { requireExamSessionToken } from '@/features/exam-session/storage';
import type {
  ExamEntryResponse,
  ExamPeriodCurrent,
  SubmitExamEntryPayload,
} from '@/features/admin-exam-periods/types';

export const userExamPeriodsApi = {
  /** Public — no auth */
  getCurrentPublic() {
    return apiRequest<ExamPeriodCurrent | null>('/public/exam-periods/current', {
      method: 'GET',
    });
  },

  /** Submit candidate info → sessionToken + current period */
  submitEntry(payload: SubmitExamEntryPayload) {
    return apiRequest<ExamEntryResponse>('/public/exam-periods/entry', {
      method: 'POST',
      body: payload,
    });
  },

  /** Requires x-exam-session */
  getCurrentForSession() {
    return apiRequest<ExamPeriodCurrent | null>('/public/exam-periods/current/me', {
      method: 'GET',
      examSession: requireExamSessionToken(),
    });
  },
};
