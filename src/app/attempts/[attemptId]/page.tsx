'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { userExamAttemptsApi } from '@/features/user-exam-attempts/api';
import {
  clearAttemptProgress,
  resolveResumePosition,
  writeAttemptProgress,
} from '@/features/user-exam-attempts/attempt-progress';
import { getQuestionRemainingMs } from '@/features/user-exam-attempts/question-timer';
import type {
  AttemptAnswer,
  ExamAttemptInProgress,
  ExamAttemptLockReason,
} from '@/features/user-exam-attempts/types';
import { hasExamSession } from '@/features/exam-session/storage';
import { userExamsApi } from '@/features/user-exams/api';
import type { ExamUserDetail } from '@/features/user-exams/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/components/ui/notification';
import { APP_NAME } from '@/lib/app-config';
import { cn } from '@/lib/utils';

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function defaultDurationForType(type: AttemptAnswer['type']) {
  return type === 'ESSAY' ? 5 : 1;
}

export default function TakeAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const { dictionary } = useI18n();
  const copy = dictionary.userTaking;
  const { error: notifyError, success } = useNotification();
  const router = useRouter();

  const [attempt, setAttempt] = useState<ExamAttemptInProgress | null>(null);
  const [exam, setExam] = useState<ExamUserDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [questionRemainingMs, setQuestionRemainingMs] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [tabWarningOpen, setTabWarningOpen] = useState(false);
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);
  const allowLeaveRef = useRef(false);
  const lockingRef = useRef(false);
  const inProgressRef = useRef(false);
  const expiredQuestionIdsRef = useRef<Set<string>>(new Set());
  const currentIndexRef = useRef(0);
  const [currentQuestionLocked, setCurrentQuestionLocked] = useState(false);

  const sortedAnswers = useMemo(() => {
    return [...(attempt?.answers ?? [])].sort((a, b) => a.order - b.order);
  }, [attempt]);

  const current = sortedAnswers[currentIndex] as AttemptAnswer | undefined;
  const questionDurationMinutes =
    current?.durationMinutes ?? (current ? defaultDurationForType(current.type) : 1);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
    setCurrentQuestionLocked(
      Boolean(current && expiredQuestionIdsRef.current.has(current.questionShortId)),
    );
  }, [current, currentIndex]);

  const loadAttempt = useCallback(async () => {
    try {
      const data = await userExamAttemptsApi.getById(attemptId);
      if (data.status !== 'IN_PROGRESS') {
        if (data.status === 'LOCKED') {
          notifyError(copy.tabSwitchWarning, copy.tabSwitchTitle);
          router.replace(data.examId ? `/exams/${data.examId}` : '/exams');
          return null;
        }
        router.replace(`/attempts/${attemptId}/result`);
        return null;
      }
      setAttempt(data);
      const map: Record<string, string> = {};
      for (const item of data.answers ?? []) {
        map[item.questionShortId] = item.userAnswer ?? '';
      }
      setAnswers(map);
      setRemainingMs(new Date(data.expiresAt).getTime() - Date.now());

      const ordered = [...(data.answers ?? [])].sort((a, b) => a.order - b.order);
      const resume = resolveResumePosition({
        attemptId,
        ordered,
        answersMap: map,
        examExpiresAt: data.expiresAt,
        defaultDurationForType: (type) => defaultDurationForType(type as AttemptAnswer['type']),
      });
      expiredQuestionIdsRef.current = new Set(resume.expiredQuestionShortIds);
      setCurrentIndex(resume.currentIndex);
      setMaxReachedIndex(resume.maxReachedIndex);
      setCurrentQuestionLocked(
        Boolean(
          ordered[resume.currentIndex] &&
            resume.expiredQuestionShortIds.includes(ordered[resume.currentIndex].questionShortId),
        ),
      );

      try {
        const examDetail = await userExamsApi.getById(data.examId);
        setExam(examDetail);
      } catch {
        setExam(null);
      }

      return data;
    } catch {
      try {
        const result = await userExamAttemptsApi.getResult(attemptId);
        if (result.status === 'LOCKED') {
          notifyError(copy.tabSwitchWarning, copy.tabSwitchTitle);
          router.replace(result.examId ? `/exams/${result.examId}` : '/exams');
          return null;
        }
        router.replace(`/attempts/${attemptId}/result`);
      } catch {
        throw new Error(copy.loadFailed);
      }
      return null;
    }
  }, [attemptId, copy.loadFailed, copy.tabSwitchTitle, copy.tabSwitchWarning, notifyError, router]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || sortedAnswers.length === 0) return;
    const currentAnswer = sortedAnswers[currentIndex];
    writeAttemptProgress(attemptId, {
      currentQuestionShortId: currentAnswer?.questionShortId ?? null,
      maxReachedIndex,
      expiredQuestionShortIds: Array.from(expiredQuestionIdsRef.current),
    });
  }, [attempt, attemptId, currentIndex, maxReachedIndex, sortedAnswers]);

  useEffect(() => {
    if (!hasExamSession()) {
      router.replace('/exams');
    }
  }, [router]);

  useEffect(() => {
    if (!hasExamSession()) return;

    let cancelled = false;
    async function init() {
      try {
        const data = await loadAttempt();
        if (!cancelled) {
          startTransition(() => setLoading(false));
        }
        if (!data && !cancelled) {
          startTransition(() => setLoading(false));
        }
      } catch (error) {
        if (!cancelled) {
          startTransition(() => setLoading(false));
          notifyError(error instanceof Error ? error.message : copy.loadFailed, copy.loadFailed);
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, loadAttempt, notifyError]);

  const saveDirty = useCallback(async () => {
    if (!dirtyRef.current || !attempt || attempt.status !== 'IN_PROGRESS') return;
    const payload = {
      answers: Object.entries(answers).map(([questionShortId, userAnswer]) => ({
        questionShortId,
        userAnswer,
      })),
    };
    if (!payload.answers.length) return;
    setSaving(true);
    try {
      await userExamAttemptsApi.saveAnswers(attemptId, payload);
      dirtyRef.current = false;
      setDirty(false);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.saveFailed, copy.saveFailed);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [answers, attempt, attemptId, copy.saveFailed, notifyError]);

  const submitAttempt = useCallback(
    async (fromTimer = false) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        if (dirtyRef.current) {
          await saveDirty();
        }
        await userExamAttemptsApi.submit(attemptId);
        clearAttemptProgress(attemptId);
        allowLeaveRef.current = true;
        success(fromTimer ? copy.autoSubmitted : copy.submitted);
        router.replace(`/attempts/${attemptId}/result`);
      } catch (error) {
        notifyError(error instanceof Error ? error.message : copy.submitFailed, copy.submitFailed);
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [attemptId, copy.autoSubmitted, copy.submitFailed, copy.submitted, notifyError, router, saveDirty, success],
  );

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    const timer = window.setInterval(() => {
      const next = new Date(attempt.expiresAt).getTime() - Date.now();
      setRemainingMs(next);
      if (next <= 0) {
        window.clearInterval(timer);
        void submitAttempt(true);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, submitAttempt]);

  const handleQuestionTimeUp = useCallback(
    (questionShortId: string) => {
      if (submittingRef.current) return;
      if (expiredQuestionIdsRef.current.has(questionShortId)) return;

      expiredQuestionIdsRef.current.add(questionShortId);
      setCurrentQuestionLocked(true);
      writeAttemptProgress(attemptId, {
        currentQuestionShortId: questionShortId,
        maxReachedIndex: Math.max(currentIndexRef.current, maxReachedIndex),
        expiredQuestionShortIds: Array.from(expiredQuestionIdsRef.current),
      });

      void (async () => {
        if (dirtyRef.current) {
          await saveDirty().catch(() => undefined);
        }
        const index = currentIndexRef.current;
        const isLast = index >= sortedAnswers.length - 1;
        notifyError(
          isLast ? copy.questionTimeUpLast : copy.questionTimeUp,
          copy.questionTimeLeft,
        );
      })();
    },
    [
      attemptId,
      copy.questionTimeLeft,
      copy.questionTimeUp,
      copy.questionTimeUpLast,
      maxReachedIndex,
      notifyError,
      saveDirty,
      sortedAnswers.length,
    ],
  );

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS' || !current) return;

    const tick = () => {
      if (expiredQuestionIdsRef.current.has(current.questionShortId)) {
        setQuestionRemainingMs(0);
        setCurrentQuestionLocked(true);
        return;
      }
      const next = getQuestionRemainingMs({
        attemptId,
        questionShortId: current.questionShortId,
        durationMinutes: current.durationMinutes ?? defaultDurationForType(current.type),
        examExpiresAt: attempt.expiresAt,
      });
      setQuestionRemainingMs(next);
      if (next <= 0) {
        handleQuestionTimeUp(current.questionShortId);
      }
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [attempt, attemptId, current, handleQuestionTimeUp]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    const timer = window.setTimeout(() => {
      void saveDirty().catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [answers, attempt, saveDirty]);

  useEffect(() => {
    inProgressRef.current = Boolean(attempt && attempt.status === 'IN_PROGRESS' && !submitting);
  }, [attempt, submitting]);

  const leaveAfterLock = useCallback(
    (examId?: string | null) => {
      allowLeaveRef.current = true;
      router.replace(examId ? `/exams/${examId}` : '/exams');
    },
    [router],
  );

  const lockAttempt = useCallback(
    async (reason: ExamAttemptLockReason, options?: { showDialog?: boolean; navigate?: boolean }) => {
      if (lockingRef.current || allowLeaveRef.current || submittingRef.current) return;
      lockingRef.current = true;
      inProgressRef.current = false;
      allowLeaveRef.current = true;
      setExiting(true);
      try {
        if (dirtyRef.current) {
          try {
            await saveDirty();
          } catch {
            // still lock even if final save fails
          }
        }
        await userExamAttemptsApi.lock(attemptId, { reason });
        clearAttemptProgress(attemptId);
        setAttempt((current) => (current ? { ...current, status: 'LOCKED' } : current));
        if (options?.showDialog) {
          setTabWarningOpen(true);
        }
        if (options?.navigate) {
          leaveAfterLock(attempt?.examId);
        }
      } catch (error) {
        lockingRef.current = false;
        allowLeaveRef.current = false;
        inProgressRef.current = true;
        setExiting(false);
        notifyError(error instanceof Error ? error.message : copy.lockFailed, copy.lockFailed);
      }
    },
    [attempt?.examId, attemptId, copy.lockFailed, leaveAfterLock, notifyError, saveDirty],
  );

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current || !inProgressRef.current) return;
      event.preventDefault();
      event.returnValue = copy.leavePageConfirm;
      return copy.leavePageConfirm;
    };

    const onPopState = () => {
      if (allowLeaveRef.current || !inProgressRef.current) return;
      const confirmed = window.confirm(copy.leavePageConfirm);
      if (confirmed) {
        void lockAttempt('EXIT', { navigate: true });
        return;
      }
      window.history.pushState(null, '', window.location.href);
    };

    const onVisibilityChange = () => {
      if (!inProgressRef.current || allowLeaveRef.current || lockingRef.current) return;
      if (document.hidden) {
        void lockAttempt('TAB_SWITCH', { showDialog: true });
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [attempt, copy.leavePageConfirm, lockAttempt]);

  function updateAnswer(questionShortId: string, value: string) {
    dirtyRef.current = true;
    setDirty(true);
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionShortId]: value }));
  }

  function goToQuestion(index: number) {
    if (index < 0 || index >= sortedAnswers.length) return;
    if (index < maxReachedIndex) {
      notifyError(copy.lockedQuestion, copy.lockedQuestion);
      return;
    }
    if (index > maxReachedIndex) {
      // Only allow stepping forward one-by-one via Next, not skipping ahead.
      return;
    }
    setCurrentIndex(index);
  }

  function goNext() {
    const currentAnswer = sortedAnswers[currentIndex];
    if (!currentAnswer) return;
    const answered = Boolean((answers[currentAnswer.questionShortId] || '').trim());
    // After question time runs out, allow moving on without an answer.
    if (!answered && !currentQuestionLocked) {
      notifyError(copy.nextRequiresAnswer, copy.nextRequiresAnswer);
      return;
    }
    const nextIndex = Math.min(sortedAnswers.length - 1, currentIndex + 1);
    if (nextIndex === currentIndex) return;
    setCurrentIndex(nextIndex);
    setMaxReachedIndex((value) => Math.max(value, nextIndex));
  }

  async function handleSubmit() {
    const unanswered = sortedAnswers.filter((item) => !(answers[item.questionShortId] || '').trim()).length;
    const message =
      unanswered > 0
        ? copy.submitConfirmUnanswered.replace('{n}', String(unanswered))
        : copy.submitConfirm;
    if (!window.confirm(message)) return;
    await submitAttempt(false);
  }

  async function handleExit() {
    if (!window.confirm(copy.exitConfirm)) return;
    await lockAttempt('EXIT', { navigate: true });
  }

  function handleLockedDialogConfirm() {
    setTabWarningOpen(false);
    leaveAfterLock(attempt?.examId);
  }

  if (loading) {
    return <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>;
  }

  if (!attempt || !current) {
    return <p className='py-16 text-center text-muted-foreground'>{copy.loadFailed}</p>;
  }

  const answeredCount = sortedAnswers.filter((item) => (answers[item.questionShortId] || '').trim()).length;
  const examTitle = exam?.title || attempt.examTitle || copy.title;
  const questionTotal = exam?.questionCount ?? sortedAnswers.length;
  const durationMinutes = exam?.durationMinutes;
  const maxScore = exam?.totalScore ?? attempt.maxScore;
  const progressPercent =
    sortedAnswers.length > 0 ? Math.round((answeredCount / sortedAnswers.length) * 100) : 0;

  return (
    <div
      className={cn(
        'min-h-screen bg-[linear-gradient(180deg,#f7efe4_0%,#f2e5d2_45%,#ebe0d0_100%)]',
        tabWarningOpen && 'pointer-events-none select-none',
      )}
    >
      <Dialog
        open={tabWarningOpen}
        onOpenChange={(open) => {
          if (open) setTabWarningOpen(true);
        }}
      >
        <DialogContent
          className='pointer-events-auto max-w-md [&>button]:hidden'
          onPointerDownOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{copy.tabSwitchTitle}</DialogTitle>
            <DialogDescription>{copy.tabSwitchWarning}</DialogDescription>
          </DialogHeader>
          <div className='mt-2 flex justify-end'>
            <Button type='button' onClick={handleLockedDialogConfirm}>
              {copy.tabSwitchConfirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className='sticky top-0 z-40 border-b border-[#022648]/15 bg-[#022648] text-white shadow-lg shadow-[#022648]/20'>
        <div className='mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8'>
          <Image
            src='/images/logo-light.png'
            alt={APP_NAME}
            className='shrink-0 object-contain'
            style={{ width: 'auto', height: '40px' }}
            width={1023}
            height={1024}
            priority
          />
          <div className='min-w-0 flex-1'>
            <p className='text-[10px] font-medium uppercase tracking-[0.22em] text-[#E0C389]/90'>
              {copy.eyebrow}
            </p>
            <h1 className='truncate text-base font-semibold tracking-tight sm:text-lg' title={examTitle}>
              {examTitle}
            </h1>
            <p className='mt-0.5 hidden truncate text-xs text-white/65 sm:block'>
              {attempt.examId}
              {durationMinutes != null ? ` · ${copy.minutes.replace('{n}', String(durationMinutes))}` : ''}
              {` · ${copy.questionCount.replace('{n}', String(questionTotal))}`}
              {` · ${copy.maxScore} ${maxScore}`}
            </p>
          </div>
          <div
            className={cn(
              'flex shrink-0 flex-col items-end rounded-sm px-3 py-2 font-mono',
              remainingMs < 5 * 60 * 1000
                ? 'bg-destructive/20 text-[#ffb4a8] ring-1 ring-destructive/40'
                : 'bg-white/10 text-[#E0C389] ring-1 ring-white/15',
            )}
            title={copy.timeLeft}
          >
            <span className='text-[10px] font-sans font-medium uppercase tracking-[0.16em] text-white/55'>
              {copy.timeLeft}
            </span>
            <span className='mt-0.5 flex items-center gap-1.5 text-lg font-semibold tabular-nums sm:text-xl'>
              <Clock className='size-4 opacity-80' />
              {formatRemaining(remainingMs)}
            </span>
          </div>
        </div>
      </header>

      <div className='mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8'>
        <div className='space-y-2'>
          <div className='flex items-center justify-between gap-3 text-sm'>
            <p className='font-medium text-[#022648]'>
              {copy.progress
                .replace('{answered}', String(answeredCount))
                .replace('{total}', String(sortedAnswers.length))}
            </p>
            <p className='tabular-nums text-[#4a6480]'>{progressPercent}%</p>
          </div>
          <div className='h-1.5 overflow-hidden rounded-full bg-[#022648]/10'>
            <div
              className='h-full rounded-full bg-[#022648] transition-[width] duration-300'
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <section className='rounded-2xl border border-[#022648]/10 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5'>
          <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
            <p className='text-sm font-semibold text-[#022648]'>{copy.navigatorLabel}</p>
            <div className='flex flex-wrap gap-3 text-[11px] font-medium text-[#4a6480]'>
              <span className='inline-flex items-center gap-1.5'>
                <span className='size-2.5 rounded-sm bg-[#022648]' />
                {copy.legendCurrent}
              </span>
              <span className='inline-flex items-center gap-1.5'>
                <span className='size-2.5 rounded-sm bg-[#E0C389]' />
                {copy.legendAnswered}
              </span>
              <span className='inline-flex items-center gap-1.5'>
                <span className='size-2.5 rounded-sm border border-[#022648]/40 bg-white' />
                {copy.legendUnanswered}
              </span>
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {sortedAnswers.map((item, index) => {
              const filled = Boolean((answers[item.questionShortId] || '').trim());
              const locked = index < maxReachedIndex;
              const upcoming = index > maxReachedIndex;
              return (
                <button
                  key={item.questionShortId}
                  type='button'
                  disabled={locked || upcoming}
                  title={locked ? copy.lockedQuestion : undefined}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg text-sm font-semibold transition',
                    index === currentIndex
                      ? 'bg-[#022648] text-white shadow-md shadow-[#022648]/25'
                      : locked
                        ? 'cursor-not-allowed bg-[#E0C389]/70 text-[#022648]'
                        : upcoming
                          ? 'cursor-not-allowed border border-[#022648]/20 bg-white text-[#4a6480]'
                          : filled
                            ? 'bg-[#E0C389]/50 text-[#022648]'
                            : 'border border-[#022648]/20 bg-white text-[#022648]',
                  )}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </section>

        <section className='overflow-hidden rounded-2xl border border-[#022648]/10 bg-white shadow-[0_12px_40px_rgba(2,38,72,0.06)]'>
          <div className='flex items-center justify-between gap-3 border-b border-[#022648]/10 bg-[rgba(2,38,72,0.03)] px-5 py-3 sm:px-6'>
            <div className='min-w-0'>
              <p className='text-[11px] font-medium uppercase tracking-[0.18em] text-[#4a6480]'>
                {copy.questionLabel
                  .replace('{n}', String(currentIndex + 1))
                  .replace('{total}', String(sortedAnswers.length))}
              </p>
              <p className='mt-0.5 truncate text-sm text-[#022648]'>
                {current.type === 'MULTIPLE_CHOICE' ? copy.typeMc : copy.typeEssay}
                <span className='mx-2 text-[#4a6480]'>·</span>
                {copy.score}: {current.score}
                <span className='mx-2 text-[#4a6480]'>·</span>
                {copy.minutes.replace('{n}', String(questionDurationMinutes))}
                <span className='mx-2 text-[#4a6480]'>·</span>
                <span className='text-[#4a6480]'>
                  {saving ? copy.saving : dirty ? copy.unsaved : copy.saved}
                </span>
              </p>
            </div>
            <div
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-mono',
                questionRemainingMs < 30 * 1000
                  ? 'bg-destructive/15 text-destructive ring-1 ring-destructive/35'
                  : 'bg-[#022648]/08 text-[#022648]/75 ring-1 ring-[#022648]/12',
              )}
              title={copy.questionTimeLeft}
            >
              <span
                className={cn(
                  'hidden text-[9px] font-sans font-medium uppercase tracking-[0.14em] sm:inline',
                  questionRemainingMs < 30 * 1000 ? 'text-destructive/70' : 'text-[#022648]/45',
                )}
              >
                {copy.questionTimeLeft}
              </span>
              <span className='flex items-center gap-1 text-sm font-semibold tabular-nums'>
                <Clock className='size-3.5 opacity-80' />
                {formatRemaining(questionRemainingMs)}
              </span>
            </div>
          </div>

          <div className='space-y-5 px-5 py-5 sm:px-6 sm:py-6'>
            <p className='whitespace-pre-wrap text-base leading-7 text-[#022648]'>
              {current.question?.content}
            </p>

            {current.question?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.question.imageUrl}
                alt=''
                className='max-h-80 w-full rounded-xl border border-[#022648]/15 object-contain bg-[#f7efe4]'
              />
            ) : null}

            {current.question?.audioUrl ? (
              <audio controls className='w-full' src={current.question.audioUrl}>
                <track kind='captions' />
              </audio>
            ) : null}

            {currentQuestionLocked ? (
              <p className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                {currentIndex >= sortedAnswers.length - 1
                  ? copy.questionTimeUpLast
                  : copy.questionTimeUp}
              </p>
            ) : null}

            {current.type === 'MULTIPLE_CHOICE' ? (
              <div className='space-y-2.5'>
                {(current.question?.options ?? []).map((option) => {
                  const selected = answers[current.questionShortId] === option.key;
                  return (
                    <label
                      key={option.key}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border px-4 py-3.5 transition',
                        currentQuestionLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
                        selected
                          ? 'border-[#022648] bg-[rgba(2,38,72,0.04)] shadow-sm'
                          : 'border-[#022648]/20 bg-white hover:border-[#022648]/40 hover:bg-[#f7efe4]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                          selected
                            ? 'border-[#022648] bg-[#022648] text-white'
                            : 'border-[#022648]/35 text-[#022648]',
                        )}
                      >
                        {option.key}
                      </span>
                      <input
                        type='radio'
                        className='sr-only'
                        name={current.questionShortId}
                        checked={selected}
                        disabled={currentQuestionLocked}
                        onChange={() => updateAnswer(current.questionShortId, option.key)}
                      />
                      <span className='pt-0.5 text-[#022648]'>{option.text}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className='space-y-2'>
                <Label className='text-[#022648]'>{copy.essayLabel}</Label>
                <Textarea
                  rows={8}
                  value={answers[current.questionShortId] || ''}
                  disabled={currentQuestionLocked}
                  onChange={(event) => updateAnswer(current.questionShortId, event.target.value)}
                  placeholder={copy.essayPlaceholder}
                  className='border-[#022648]/20 bg-[#f7efe4] text-[#022648] placeholder:text-[#4a6480] focus-visible:ring-[#022648]/40'
                />
              </div>
            )}
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 border-t border-[#022648]/08 bg-[rgba(2,38,72,0.02)] px-5 py-4 sm:px-6'>
            <Button
              type='button'
              variant='outline'
              className='border-[#022648]/2'
              disabled={currentIndex >= sortedAnswers.length - 1}
              onClick={goNext}
            >
              {copy.next}
            </Button>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                className='border-[#022648]/2'
                disabled={exiting || submitting}
                onClick={() => void handleExit()}
              >
                <ArrowLeft className='size-4' />
                {exiting ? dictionary.common.loading : copy.exit}
              </Button>
              <Button
                type='button'
                className='bg-[#022648] hover:bg-[#022648]/90'
                disabled={submitting || exiting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? dictionary.common.loading : copy.submit}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
