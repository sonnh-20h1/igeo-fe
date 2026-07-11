export type QuestionType = 'MULTIPLE_CHOICE' | 'ESSAY';
export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionOption = {
  key: string;
  text: string;
};

export const MCQ_OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export type Question = {
  id: string;
  shortId: string;
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswer?: string | null;
  explanation?: string;
  difficulty: QuestionDifficulty;
  tags: string[];
  createdDate?: string | Date;
  updatedDate?: string | Date;
};

export type QuestionListResult = {
  pageInfo: {
    page: number;
    size: number;
    total: number;
  };
  items: Question[];
};

export type ListQuestionsQuery = {
  page?: number;
  size?: number;
  search?: string;
  type?: QuestionType;
  difficulty?: QuestionDifficulty;
  tag?: string;
};

export type CreateQuestionPayload = {
  content: string;
  type: QuestionType;
  imageUrl?: string;
  audioUrl?: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  tags?: string[];
};

export type UpdateQuestionPayload = {
  content?: string;
  type?: QuestionType;
  imageUrl?: string | null;
  audioUrl?: string | null;
  options?: QuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  tags?: string[];
};

export type QuestionImportError = {
  row: number;
  message: string;
};

export type QuestionImportResult = {
  total: number;
  successCount: number;
  failedCount: number;
  errors: QuestionImportError[];
  created: Question[];
};

export function createEmptyMcqOptions(): QuestionOption[] {
  return MCQ_OPTION_KEYS.map((key) => ({ key, text: '' }));
}

export function normalizeQuestionOptions(
  options: Array<QuestionOption | string> | undefined,
): QuestionOption[] {
  const mapped = (options ?? []).map((option, index) => {
    if (typeof option === 'string') {
      return {
        key: MCQ_OPTION_KEYS[index] ?? String(index + 1),
        text: option,
      };
    }
    return {
      key: option.key || MCQ_OPTION_KEYS[index] || String(index + 1),
      text: option.text || '',
    };
  });

  return MCQ_OPTION_KEYS.map((key, index) => {
    const existing = mapped.find((option) => option.key === key) ?? mapped[index];
    return {
      key,
      text: existing?.text ?? '',
    };
  });
}
