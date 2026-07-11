'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { userExamAttemptsApi } from '@/features/user-exam-attempts/api';
import type { AttemptAnswer, ExamAttemptInProgress } from '@/features/user-exam-attempts/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/components/ui/notification';
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

export default function TakeAttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const { dictionary } = useI18n();
  const copy = dictionary.userTaking;
  const { error: notifyError, success } = useNotification();
  const router = useRouter();

  const [attempt, setAttempt] = useState<ExamAttemptInProgress | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);

  const sortedAnswers = useMemo(() => {
    return [...(attempt?.answers ?? [])].sort((a, b) => a.order - b.order);
  }, [attempt]);

  const current = sortedAnswers[currentIndex] as AttemptAnswer | undefined;

  const loadAttempt = useCallback(async () => {
    const data = await userExamAttemptsApi.getById(attemptId);
    if (data.status !== 'IN_PROGRESS') {
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
    return data;
  }, [attemptId, router]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const data = await loadAttempt();
        if (!cancelled && data) {
          startTransition(() => setLoading(false));
        } else if (!cancelled) {
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

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    const timer = window.setTimeout(() => {
      void saveDirty();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [answers, attempt, saveDirty]);

  function updateAnswer(questionShortId: string, value: string) {
    dirtyRef.current = true;
    setDirty(true);
    setAnswers((current) => ({ ...current, [questionShortId]: value }));
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

  if (loading) {
    return <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>;
  }

  if (!attempt || !current) {
    return <p className='py-16 text-center text-muted-foreground'>{copy.loadFailed}</p>;
  }

  const answeredCount = sortedAnswers.filter((item) => (answers[item.questionShortId] || '').trim()).length;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{copy.eyebrow}</p>
          <h1 className='mt-2 text-2xl font-semibold'>{copy.title}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            {copy.progress
              .replace('{answered}', String(answeredCount))
              .replace('{total}', String(sortedAnswers.length))}
          </p>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl border px-4 py-3 font-mono text-lg font-semibold',
            remainingMs < 5 * 60 * 1000
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-secondary bg-secondary/30 text-foreground',
          )}
        >
          <Clock className='size-5' />
          {formatRemaining(remainingMs)}
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        {sortedAnswers.map((item, index) => {
          const filled = Boolean((answers[item.questionShortId] || '').trim());
          return (
            <button
              key={item.questionShortId}
              type='button'
              className={cn(
                'size-9 rounded-lg border text-sm font-semibold transition',
                index === currentIndex
                  ? 'border-primary bg-primary text-primary-foreground'
                  : filled
                    ? 'border-secondary bg-secondary/40 text-foreground'
                    : 'border-border bg-card text-muted-foreground',
              )}
              onClick={() => setCurrentIndex(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {copy.questionLabel
              .replace('{n}', String(currentIndex + 1))
              .replace('{total}', String(sortedAnswers.length))}
          </CardTitle>
          <CardDescription>
            {current.type === 'MULTIPLE_CHOICE' ? copy.typeMc : copy.typeEssay} · {copy.score}:{' '}
            {current.score}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='whitespace-pre-wrap text-base leading-7'>{current.question?.content}</p>

          {current.type === 'MULTIPLE_CHOICE' ? (
            <div className='space-y-2'>
              {(current.question?.options ?? []).map((option) => {
                const selected = answers[current.questionShortId] === option.key;
                return (
                  <label
                    key={option.key}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                      selected ? 'border-primary bg-primary/5' : 'border-border/70 hover:bg-muted/40',
                    )}
                  >
                    <input
                      type='radio'
                      className='mt-1'
                      name={current.questionShortId}
                      checked={selected}
                      onChange={() => updateAnswer(current.questionShortId, option.key)}
                    />
                    <span>
                      <span className='font-semibold'>{option.key}.</span> {option.text}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className='space-y-2'>
              <Label>{copy.essayLabel}</Label>
              <Textarea
                rows={8}
                value={answers[current.questionShortId] || ''}
                onChange={(event) => updateAnswer(current.questionShortId, event.target.value)}
                placeholder={copy.essayPlaceholder}
              />
            </div>
          )}

          <div className='flex flex-wrap items-center justify-between gap-3 pt-2'>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
              >
                {copy.prev}
              </Button>
              <Button
                type='button'
                variant='outline'
                disabled={currentIndex >= sortedAnswers.length - 1}
                onClick={() =>
                  setCurrentIndex((value) => Math.min(sortedAnswers.length - 1, value + 1))
                }
              >
                {copy.next}
              </Button>
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-xs text-muted-foreground'>
                {saving ? copy.saving : dirty ? copy.unsaved : copy.saved}
              </span>
              <Button type='button' disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? dictionary.common.loading : copy.submit}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
