import { getApiLang, getCurrentLocale } from '@/features/i18n/config';
import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  /** Opaque public exam session — sent as x-exam-session (not JWT) */
  examSession?: string | null;
  query?: Record<string, string | number | boolean | null | undefined>;
};

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function unwrapPayload<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'statusCode' in payload &&
    'data' in payload
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return fallback;
  }

  const message = (payload as { message: unknown }).message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  if (Array.isArray(message)) {
    const first = message.find((item) => typeof item === 'string' && item.trim());
    if (typeof first === 'string') {
      return first;
    }
  }

  return fallback;
}

function defaultApiErrorMessage() {
  return getCurrentLocale() === 'en' ? 'API request failed' : 'Yêu cầu tới API thất bại';
}

/** Headers for backend nestjs-i18n (`vn` | `en`). */
export function getApiLocaleHeaders(): Record<string, string> {
  const lang = getApiLang();
  return {
    'x-lang': lang,
    'Accept-Language': lang === 'en' ? 'en' : 'vi,vn;q=0.9',
  };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, examSession, query } = options;
  const searchParams = new URLSearchParams();

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      searchParams.set(key, String(value));
    });
  }

  const queryString = searchParams.toString();
  const url = `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(url, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...getApiLocaleHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(examSession ? { 'x-exam-session': examSession } : {}),
    },
    body:
      body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(payload, defaultApiErrorMessage()), response.status, payload);
  }

  return unwrapPayload<T>(payload);
}
