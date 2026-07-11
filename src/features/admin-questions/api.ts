import { API_BASE_URL } from '@/lib/api/config';
import { ApiError, apiRequest } from '@/lib/api/client';
import { readAccessToken } from '@/features/auth/storage';
import type {
  CreateQuestionPayload,
  ListQuestionsQuery,
  Question,
  QuestionImportResult,
  QuestionListResult,
  UpdateQuestionPayload,
} from './types';

function requireToken() {
  const token = readAccessToken();
  if (!token) {
    throw new Error('Session expired');
  }
  return token;
}

async function downloadBlob(path: string, filename: string) {
  const token = requireToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = 'Yêu cầu tới API thất bại';
    try {
      const payload = await response.json();
      if (payload && typeof payload.message === 'string') {
        message = payload.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, null);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const adminQuestionsApi = {
  list(query: ListQuestionsQuery = {}) {
    return apiRequest<QuestionListResult>('/admin/questions', {
      method: 'GET',
      token: requireToken(),
      query,
    });
  },

  getById(questionId: string) {
    return apiRequest<Question>(`/admin/questions/${questionId}`, {
      method: 'GET',
      token: requireToken(),
    });
  },

  create(payload: CreateQuestionPayload) {
    return apiRequest<Question>('/admin/questions', {
      method: 'POST',
      token: requireToken(),
      body: payload,
    });
  },

  update(questionId: string, payload: UpdateQuestionPayload) {
    return apiRequest<Question>(`/admin/questions/${questionId}`, {
      method: 'PATCH',
      token: requireToken(),
      body: payload,
    });
  },

  remove(questionId: string) {
    return apiRequest<boolean>(`/admin/questions/${questionId}`, {
      method: 'DELETE',
      token: requireToken(),
    });
  },

  downloadImportTemplate() {
    return downloadBlob('/admin/questions/import/template', 'question-import-template.xlsx');
  },

  importFromExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<QuestionImportResult>('/admin/questions/import', {
      method: 'POST',
      token: requireToken(),
      body: formData,
    });
  },
};
