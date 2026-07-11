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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(examSession ? { 'x-exam-session': examSession } : {}),
    },
    body:
      body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : 'Yêu cầu tới API thất bại';

    throw new ApiError(message, response.status, payload);
  }

  return unwrapPayload<T>(payload);
}
