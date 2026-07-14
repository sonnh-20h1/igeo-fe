import { apiRequest } from '@/lib/api/client';
import {
  requireExamSessionToken,
  type ExamCandidateProfile,
} from '@/features/exam-session/storage';

export type ExamCandidateResponse = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  cccd: string;
  dob?: string | Date | null;
  className: string;
  school: string;
  avatar?: string | null;
  activated?: boolean;
  blocked?: boolean;
  canLogin?: boolean;
  createdDate?: string | Date;
  updatedDate?: string | Date;
};

export type UpdateExamCandidateSchoolPayload = {
  className: string;
  school: string;
};

export function toExamCandidateProfile(user: ExamCandidateResponse): ExamCandidateProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    cccd: user.cccd,
    dob: user.dob,
    className: user.className,
    school: user.school,
  };
}

export const userExamCandidatesApi = {
  getMe() {
    return apiRequest<ExamCandidateResponse>('/public/exam-candidates/me', {
      method: 'GET',
      examSession: requireExamSessionToken(),
    });
  },

  updateSchoolAndClass(payload: UpdateExamCandidateSchoolPayload) {
    return apiRequest<ExamCandidateResponse>('/public/exam-candidates/me', {
      method: 'PATCH',
      examSession: requireExamSessionToken(),
      body: payload,
    });
  },
};
