export type QuestionCategory = {
  id: string;
  shortId: string;
  name: string;
  description?: string | null;
  createdDate?: string | Date;
  updatedDate?: string | Date;
};

export type QuestionCategoryListResult = {
  pageInfo: { page: number; size: number; total: number };
  items: QuestionCategory[];
};

export type ListCategoriesQuery = {
  page?: number;
  size?: number;
  search?: string;
};

export type CreateCategoryPayload = {
  name: string;
  description?: string;
};

export type UpdateCategoryPayload = {
  name?: string;
  description?: string | null;
};
