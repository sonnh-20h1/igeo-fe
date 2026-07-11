export type ExamUserSummary = {
  id: string;
  shortId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  tags: string[];
  questionCount: number;
  totalScore: number;
  hasAttempted: boolean;
  createdDate?: string | Date;
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
  question: ExamUserQuestionContent | null;
};

export type ExamUserDetail = ExamUserSummary & {
  questions: ExamUserQuestionItem[];
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
