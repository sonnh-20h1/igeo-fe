import {
  getQuestionDurationMs,
  readQuestionStarts,
  type QuestionStartMap,
} from './question-timer';

const PROGRESS_PREFIX = 'igeo.attempt.progress.v1:';

export type AttemptProgress = {
  currentQuestionShortId: string | null;
  maxReachedIndex: number;
  expiredQuestionShortIds: string[];
};

function progressKey(attemptId: string) {
  return `${PROGRESS_PREFIX}${attemptId}`;
}

export function readAttemptProgress(attemptId: string): AttemptProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(progressKey(attemptId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttemptProgress;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      currentQuestionShortId:
        typeof parsed.currentQuestionShortId === 'string' ? parsed.currentQuestionShortId : null,
      maxReachedIndex: Number.isFinite(parsed.maxReachedIndex)
        ? Math.max(0, Math.floor(parsed.maxReachedIndex))
        : 0,
      expiredQuestionShortIds: Array.isArray(parsed.expiredQuestionShortIds)
        ? parsed.expiredQuestionShortIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

export function writeAttemptProgress(attemptId: string, progress: AttemptProgress) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(progressKey(attemptId), JSON.stringify(progress));
}

export function clearAttemptProgress(attemptId: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(progressKey(attemptId));
}

export function peekQuestionRemainingMs(options: {
  starts: QuestionStartMap;
  questionShortId: string;
  durationMinutes?: number | null;
  examExpiresAt: string | Date;
  now?: number;
}) {
  const startedAt = options.starts[options.questionShortId];
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return null;
  const now = options.now ?? Date.now();
  const questionEndsAt = startedAt + getQuestionDurationMs(options.durationMinutes);
  const examEndsAt = new Date(options.examExpiresAt).getTime();
  return Math.max(0, Math.min(questionEndsAt, examEndsAt) - now);
}

export function resolveResumePosition(options: {
  attemptId: string;
  ordered: Array<{ questionShortId: string; durationMinutes?: number | null; type: string }>;
  answersMap: Record<string, string>;
  examExpiresAt: string | Date;
  defaultDurationForType: (type: string) => number;
}) {
  const { ordered, answersMap, attemptId, examExpiresAt, defaultDurationForType } = options;
  const progress = readAttemptProgress(attemptId);
  const starts = readQuestionStarts(attemptId);
  const now = Date.now();

  const expiredFromTimers = new Set(progress?.expiredQuestionShortIds ?? []);
  for (const item of ordered) {
    const remaining = peekQuestionRemainingMs({
      starts,
      questionShortId: item.questionShortId,
      durationMinutes: item.durationMinutes ?? defaultDurationForType(item.type),
      examExpiresAt,
      now,
    });
    if (remaining === 0) {
      expiredFromTimers.add(item.questionShortId);
    }
  }

  const lastAnsweredIndex = (() => {
    let last = -1;
    ordered.forEach((item, index) => {
      if ((answersMap[item.questionShortId] || '').trim()) last = index;
    });
    return last;
  })();

  const firstUnanswered = ordered.findIndex(
    (item) => !(answersMap[item.questionShortId] || '').trim(),
  );

  let currentIndex = 0;
  if (progress?.currentQuestionShortId) {
    const storedIndex = ordered.findIndex(
      (item) => item.questionShortId === progress.currentQuestionShortId,
    );
    if (storedIndex >= 0) {
      currentIndex = storedIndex;
    } else if (firstUnanswered >= 0) {
      currentIndex = firstUnanswered;
    } else if (ordered.length > 0) {
      currentIndex = ordered.length - 1;
    }
  } else if (firstUnanswered >= 0) {
    currentIndex = firstUnanswered;
  } else if (ordered.length > 0) {
    currentIndex = ordered.length - 1;
  }

  const maxReachedIndex = Math.max(
    currentIndex,
    progress?.maxReachedIndex ?? 0,
    lastAnsweredIndex,
    0,
  );

  return {
    currentIndex,
    maxReachedIndex: Math.min(maxReachedIndex, Math.max(ordered.length - 1, 0)),
    expiredQuestionShortIds: Array.from(expiredFromTimers),
  };
}
