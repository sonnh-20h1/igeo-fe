export type ExamAttemptStatus =
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'GRADED'
  | 'EXPIRED';

export type AttemptQuestionSnapshot = {
  shortId: string;
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  options: { key: string; text: string }[];
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
  correctAnswer?: string | null;
  explanation?: string | null;
};

export type AttemptAnswer = {
  questionShortId: string;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  score: number;
  order: number;
  userAnswer?: string | null;
  question?: AttemptQuestionSnapshot | null;
  isCorrect?: boolean | null;
  earnedScore?: number | null;
  feedback?: string | null;
};

export type ExamAttemptSummary = {
  id: string;
  shortId: string;
  examId: string;
  examTitle?: string | null;
  status: ExamAttemptStatus;
  startedAt: string | Date;
  expiresAt: string | Date;
  submittedAt?: string | Date | null;
  mcScore: number;
  essayScore?: number | null;
  totalScore: number;
  maxScore: number;
  createdDate?: string | Date;
  userId?: string;
};

export type ExamAttemptInProgress = ExamAttemptSummary & {
  answers: AttemptAnswer[];
};

export type ExamAttemptResult = ExamAttemptSummary & {
  answers: AttemptAnswer[];
};

export type ExamAttemptAdminDetail = ExamAttemptSummary & {
  userId: string;
  answers: AttemptAnswer[];
};

export type ExamAttemptListResult = {
  pageInfo: { page: number; size: number; total: number };
  items: ExamAttemptSummary[];
};

export type ListAttemptsQuery = {
  page?: number;
  size?: number;
  status?: ExamAttemptStatus;
  examId?: string;
};

export type SaveAttemptAnswersPayload = {
  answers: Array<{ questionShortId: string; userAnswer: string }>;
};

export type GradeEssayPayload = {
  grades: Array<{ questionShortId: string; earnedScore: number; feedback?: string }>;
};
