export type ExamUserSummary = {
  id: string;
  shortId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  tags: string[];
  questionCount: number;
  totalScore: number;
  hasDynamicQuestions?: boolean;
  hasAttempted: boolean;
  createdDate?: string | Date;
};

export type ExamUserTypeConfig = {
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  selectionMode: 'MANUAL' | 'RANDOM' | 'DYNAMIC';
  score: number;
  durationMinutes?: number;
  count: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
  tags: string[];
};

export type ExamUserQuestionContent = {
  shortId: string;
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  options: { key: string; text: string }[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
};

export type ExamUserQuestionItem = {
  shortId: string;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  score: number;
  order: number;
  durationMinutes?: number;
  question: ExamUserQuestionContent | null;
};

export type ExamUserDetail = ExamUserSummary & {
  questions: ExamUserQuestionItem[];
  typeConfigs?: ExamUserTypeConfig[];
};

export type ExamUserListResult = {
  pageInfo: { page: number; size: number; total: number };
  items: ExamUserSummary[];
};

export type ListUserExamsQuery = {
  page?: number;
  size?: number;
  search?: string;
  tag?: string;
};
