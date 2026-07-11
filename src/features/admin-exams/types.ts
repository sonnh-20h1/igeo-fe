import type { Question, QuestionDifficulty, QuestionType } from '@/features/admin-questions/types';

export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ExamQuestionSelectionMode = 'MANUAL' | 'RANDOM' | 'DYNAMIC';

export type ExamTypeConfig = {
  type: QuestionType;
  selectionMode: ExamQuestionSelectionMode;
  score: number;
  count?: number | null;
  difficulty?: QuestionDifficulty | null;
  tags?: string[];
  shortIds?: string[];
};

export type ExamTypeConfigPayload = {
  type: QuestionType;
  selectionMode: ExamQuestionSelectionMode;
  score: number;
  count?: number;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  shortIds?: string[];
};

export type ExamQuestionEntry = {
  shortId: string;
  type: QuestionType;
  score: number;
  order: number;
  question?: Question | null;
};

export type Exam = {
  id: string;
  shortId: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  typeConfigs: ExamTypeConfig[];
  status: ExamStatus;
  tags: string[];
  questionCount: number;
  totalScore: number;
  questions: ExamQuestionEntry[];
  createdDate?: string | Date;
  updatedDate?: string | Date;
};

export type ExamListResult = {
  pageInfo: {
    page: number;
    size: number;
    total: number;
  };
  items: Exam[];
};

export type ListExamsQuery = {
  page?: number;
  size?: number;
  search?: string;
  status?: ExamStatus;
  tag?: string;
};

export type CreateExamPayload = {
  title: string;
  description?: string;
  durationMinutes: number;
  typeConfigs: ExamTypeConfigPayload[];
  status?: ExamStatus;
  tags?: string[];
};

export type UpdateExamPayload = {
  title?: string;
  description?: string | null;
  durationMinutes?: number;
  typeConfigs?: ExamTypeConfigPayload[];
  status?: ExamStatus;
  tags?: string[];
};
