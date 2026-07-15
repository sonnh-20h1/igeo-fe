const STORAGE_PREFIX = 'igeo.attempt.questionStarts.v1:';

export type QuestionStartMap = Record<string, number>;

function storageKey(attemptId: string) {
  return `${STORAGE_PREFIX}${attemptId}`;
}

export function readQuestionStarts(attemptId: string): QuestionStartMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(storageKey(attemptId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as QuestionStartMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function writeQuestionStarts(attemptId: string, map: QuestionStartMap) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(storageKey(attemptId), JSON.stringify(map));
}

export function ensureQuestionStarted(
  attemptId: string,
  questionShortId: string,
  now = Date.now(),
): number {
  const map = readQuestionStarts(attemptId);
  const existing = map[questionShortId];
  if (typeof existing === 'number' && Number.isFinite(existing)) {
    return existing;
  }
  map[questionShortId] = now;
  writeQuestionStarts(attemptId, map);
  return now;
}

export function getQuestionDurationMs(durationMinutes?: number | null, fallbackMinutes = 1) {
  const minutes =
    typeof durationMinutes === 'number' && Number.isFinite(durationMinutes) && durationMinutes >= 1
      ? Math.floor(durationMinutes)
      : fallbackMinutes;
  return minutes * 60 * 1000;
}

export function getQuestionRemainingMs(options: {
  attemptId: string;
  questionShortId: string;
  durationMinutes?: number | null;
  examExpiresAt: string | Date;
  now?: number;
}) {
  const now = options.now ?? Date.now();
  const startedAt = ensureQuestionStarted(options.attemptId, options.questionShortId, now);
  const questionEndsAt = startedAt + getQuestionDurationMs(options.durationMinutes);
  const examEndsAt = new Date(options.examExpiresAt).getTime();
  return Math.max(0, Math.min(questionEndsAt, examEndsAt) - now);
}
