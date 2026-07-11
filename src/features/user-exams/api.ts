import { apiRequest } from '@/lib/api/client';
import { requireExamSessionToken } from '@/features/exam-session/storage';
import type { ExamUserDetail } from './types';

export const userExamsApi = {
  getById(examId: string) {
    return apiRequest<ExamUserDetail>(`/public/exams/${examId}`, {
      method: 'GET',
      examSession: requireExamSessionToken(),
    });
  },
};
