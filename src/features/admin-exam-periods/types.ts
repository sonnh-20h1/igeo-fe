export type ExamPeriodStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export type ExamPeriod = {
  id: string;
  shortId: string;
  title: string;
  description?: string | null;
  /** Exam shortIds in this period */
  examIds: string[];
  /** @deprecated examIds[0] */
  examId?: string | null;
  examTitles?: string[];
  /** @deprecated examTitles[0] */
  examTitle?: string | null;
  status: ExamPeriodStatus;
  startAt: string | Date;
  endAt: string | Date;
  createdDate?: string | Date;
  updatedDate?: string | Date;
};

export type ExamPeriodListResult = {
  pageInfo: { page: number; size: number; total: number };
  items: ExamPeriod[];
};

export type ListExamPeriodsQuery = {
  page?: number;
  size?: number;
  search?: string;
  status?: ExamPeriodStatus;
};

export type CreateExamPeriodPayload = {
  title: string;
  description?: string;
  examIds: string[];
  startAt: string;
  endAt: string;
  status?: ExamPeriodStatus;
};

export type UpdateExamPeriodPayload = {
  title?: string;
  description?: string | null;
  examIds?: string[];
  startAt?: string;
  endAt?: string;
  status?: ExamPeriodStatus;
};

export type ExamPeriodExamItem = {
  id: string;
  shortId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  maxAttempts?: number;
  attemptCount?: number;
  remainingAttempts?: number;
  tags: string[];
  questionCount: number;
  totalScore: number;
  hasDynamicQuestions?: boolean;
  hasAttempted?: boolean;
};

export type ExamPeriodExamsResult = {
  periodId: string;
  periodShortId: string;
  periodTitle: string;
  total: number;
  items: ExamPeriodExamItem[];
};

export type ExamPeriodCurrent = {
  period: ExamPeriod;
  exams: ExamPeriodExamItem[];
  /** @deprecated exams[0] */
  exam?: ExamPeriodExamItem | null;
};

export type SubmitExamEntryPayload = {
  fullName: string;
  email: string;
  phone: string;
  cccd: string;
  dob: string;
  className: string;
  school: string;
};

export type ExamEntryResponse = {
  sessionToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    cccd: string;
    dob?: string | Date | null;
    className: string;
    school: string;
  };
  current: ExamPeriodCurrent | null;
  /** true nếu vừa đăng ký mới; false nếu đã có tài khoản (email/CCCD) */
  isNew: boolean;
};
