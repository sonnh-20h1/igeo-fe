'use client';

import { useEffect, useState, startTransition } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, History, Play } from 'lucide-react';
import { hasExamSession } from '@/features/exam-session/storage';
import { userExamsApi } from '@/features/user-exams/api';
import type { ExamUserDetail } from '@/features/user-exams/types';
import { userExamAttemptsApi } from '@/features/user-exam-attempts/api';
import type { ExamAttemptStatus, ExamAttemptSummary } from '@/features/user-exam-attempts/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/ui/notification';

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function UserExamDetailPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;
  const { dictionary } = useI18n();
  const copy = dictionary.userExams;
  const attemptsCopy = dictionary.userAttempts;
  const { error: notifyError, success } = useNotification();
  const router = useRouter();

  const [exam, setExam] = useState<ExamUserDetail | null>(null);
  const [attempts, setAttempts] = useState<ExamAttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!hasExamSession()) {
      router.replace('/exams');
    }
  }, [router]);

  useEffect(() => {
    if (!hasExamSession()) return;

    let cancelled = false;
    async function load() {
      try {
        const detail = await userExamsApi.getById(examId);
        if (cancelled) return;
        startTransition(() => {
          setExam(detail);
          setLoading(false);
        });

        setAttemptsLoading(true);
        try {
          const result = await userExamAttemptsApi.list({
            page: 1,
            size: 50,
            examId: detail.shortId,
          });
          if (!cancelled) {
            startTransition(() => {
              setAttempts(result.items ?? []);
              setAttemptsLoading(false);
            });
          }
        } catch (error) {
          if (!cancelled) {
            startTransition(() => setAttemptsLoading(false));
            notifyError(
              error instanceof Error ? error.message : copy.attemptsLoadFailed,
              copy.attemptsLoadFailed,
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          startTransition(() => setLoading(false));
          notifyError(error instanceof Error ? error.message : copy.loadFailed, copy.loadFailed);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [copy.attemptsLoadFailed, copy.loadFailed, examId, notifyError]);

  async function startExam() {
    if (!exam) return;
    setStarting(true);
    try {
      const attempt = await userExamAttemptsApi.start(exam.id);
      success(copy.started);
      router.push(`/attempts/${attempt.id}`);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.startFailed, copy.startFailed);
    } finally {
      setStarting(false);
    }
  }

  function statusLabel(status: ExamAttemptStatus) {
    if (status === 'IN_PROGRESS') return attemptsCopy.statusInProgress;
    if (status === 'SUBMITTED') return attemptsCopy.statusSubmitted;
    if (status === 'PENDING_REVIEW') return attemptsCopy.statusPendingReview;
    if (status === 'GRADED') return attemptsCopy.statusGraded;
    return attemptsCopy.statusExpired;
  }

  if (loading) {
    return <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>;
  }

  if (!exam) {
    return <p className='py-16 text-center text-muted-foreground'>{copy.empty}</p>;
  }

  return (
    <div className='mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6'>
      <Button asChild variant='outline' className='gap-2'>
        <Link href='/exams'>
          <ArrowLeft className='size-4' />
          {copy.backToList}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center gap-2'>
            <CardTitle>{exam.title}</CardTitle>
            <Badge variant='outline' className='font-mono'>
              {exam.shortId}
            </Badge>
            {exam.hasAttempted ? (
              <Badge className='bg-secondary text-foreground'>{copy.attempted}</Badge>
            ) : null}
            {exam.hasDynamicQuestions ? (
              <Badge variant='outline'>{copy.dynamicBadge}</Badge>
            ) : null}
          </div>
          <CardDescription>{exam.description || copy.noDescription}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-wrap gap-4 text-sm text-muted-foreground'>
            <span>{copy.minutes.replace('{n}', String(exam.durationMinutes))}</span>
            <span>{copy.questions.replace('{n}', String(exam.questionCount))}</span>
            <span>{copy.totalScore.replace('{n}', String(exam.totalScore))}</span>
          </div>
          {(exam.tags ?? []).length ? (
            <div className='flex flex-wrap gap-2'>
              {exam.tags.map((tag) => (
                <Badge key={tag} variant='outline'>
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
          {exam.hasDynamicQuestions ? (
            <p className='text-sm text-muted-foreground'>{copy.dynamicHint}</p>
          ) : null}
          <Button className='gap-2' disabled={starting} onClick={() => void startExam()}>
            <Play className='size-4' />
            {starting
              ? dictionary.common.loading
              : exam.hasAttempted
                ? copy.retake
                : copy.start}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <History className='size-5 text-primary' />
            {copy.attemptsTitle}
          </CardTitle>
          <CardDescription>{copy.attemptsDescription}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {attemptsLoading ? (
            <p className='py-8 text-center text-muted-foreground'>{dictionary.common.loading}</p>
          ) : attempts.length === 0 ? (
            <p className='py-8 text-center text-muted-foreground'>{copy.attemptsEmpty}</p>
          ) : (
            attempts.map((attempt) => (
              <div
                key={attempt.id}
                className='flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between'
              >
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='font-mono text-sm font-semibold text-primary'>{attempt.shortId}</p>
                    <Badge variant='outline'>{statusLabel(attempt.status)}</Badge>
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {formatDate(attempt.startedAt)}
                    {attempt.submittedAt ? ` → ${formatDate(attempt.submittedAt)}` : ''}
                  </p>
                  <p className='mt-1 text-sm'>
                    {attemptsCopy.scoreLabel
                      .replace('{total}', String(attempt.totalScore))
                      .replace('{max}', String(attempt.maxScore))}
                  </p>
                </div>
                <div>
                  {attempt.status === 'IN_PROGRESS' ? (
                    <Button asChild>
                      <Link href={`/attempts/${attempt.id}`}>{attemptsCopy.resume}</Link>
                    </Button>
                  ) : (
                    <Button asChild variant='outline'>
                      <Link href={`/attempts/${attempt.id}/result`}>{attemptsCopy.viewResult}</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
