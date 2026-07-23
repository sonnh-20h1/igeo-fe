'use client';

import { Suspense, startTransition, useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardList, Play } from 'lucide-react';
import type { ExamPeriodCurrent, ExamPeriodExamItem } from '@/features/admin-exam-periods/types';
import {
  clearJustRegistered,
  hasExamSession,
  isJustRegistered,
  readExamCandidate,
  type ExamCandidateProfile,
} from '@/features/exam-session/storage';
import { userExamPeriodsApi } from '@/features/user-exam-periods/api';
import { userExamAttemptsApi } from '@/features/user-exam-attempts/api';
import { HomeHeader } from '@/features/home/home-header';
import { useI18n } from '@/features/i18n/provider';
import { formatMessage } from '@/features/i18n/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/ui/notification';

function formatDateTime(value: string | Date, locale: string) {
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function WelcomeChrome({ children }: { children: ReactNode }) {
  return (
    <div className='home-page min-h-screen bg-white text-[#022648]'>
      <HomeHeader hideAuth solid light brandHref='/' sectionBase='/' />
      <div className='pt-20 sm:pt-24'>{children}</div>
    </div>
  );
}

function resolveExams(current: ExamPeriodCurrent | null): ExamPeriodExamItem[] {
  if (!current) return [];
  if (current.exams?.length) return current.exams;
  if (current.exam) return [current.exam];
  return [];
}

function ExamRegisterWelcomeContent() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.userExams;
  const { error: notifyError, success } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [candidate, setCandidate] = useState<ExamCandidateProfile | null>(null);
  const [current, setCurrent] = useState<ExamPeriodCurrent | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const fromRegistration =
        searchParams.get('registered') === '1' || isJustRegistered();

      if (!hasExamSession() || !fromRegistration) {
        router.replace('/exams');
        return;
      }

      const stored = readExamCandidate();
      if (!stored) {
        router.replace('/exams');
        return;
      }

      clearJustRegistered();
      setCandidate(stored);
      try {
        const period = await userExamPeriodsApi.getCurrentForSession();
        if (cancelled) return;
        startTransition(() => {
          setCurrent(period);
          setReady(true);
        });
      } catch {
        if (cancelled) return;
        startTransition(() => {
          setCurrent(null);
          setReady(true);
        });
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  function goToExams() {
    clearJustRegistered();
    router.push('/exams');
  }

  async function handleStartExam() {
    const exams = resolveExams(current);
    if (!exams.length) {
      goToExams();
      return;
    }
    if (exams.length > 1) {
      success(copy.registerSuccessPickExam);
      goToExams();
      return;
    }

    setStarting(true);
    try {
      const attempt = await userExamAttemptsApi.start(exams[0].id);
      clearJustRegistered();
      success(copy.started);
      router.push(`/attempts/${attempt.id}`);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.startFailed, copy.startFailed);
      setStarting(false);
    }
  }

  if (!ready || !candidate) {
    return (
      <WelcomeChrome>
        <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>
      </WelcomeChrome>
    );
  }

  const period = current?.period ?? null;
  const exams = resolveExams(current);

  return (
    <WelcomeChrome>
      <div className='mx-auto max-w-2xl space-y-6 px-4 pb-12 sm:px-6'>
        <div>
          <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{copy.eyebrow}</p>
          <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{copy.registerSuccessTitle}</h1>
          <p className='mt-2 text-muted-foreground'>
            {formatMessage(copy.registerSuccessDescription, { name: candidate.fullName })}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ClipboardList className='size-5 text-primary' />
              {copy.listTitle}
            </CardTitle>
            <CardDescription>{copy.registerSuccessAsk}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!period || exams.length === 0 ? (
              <p className='py-6 text-center text-sm text-muted-foreground'>
                {copy.registerSuccessNoPeriod}
              </p>
            ) : (
              <div className='space-y-4 rounded-2xl border border-border/70 bg-card p-4'>
                <div className='space-y-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='outline'>{copy.openPeriodLabel}</Badge>
                    <span className='text-base font-semibold'>{period.title}</span>
                  </div>
                  {period.description ? (
                    <p className='text-sm text-muted-foreground'>{period.description}</p>
                  ) : null}
                  <p className='text-xs text-muted-foreground'>
                    {copy.windowLabel}: {formatDateTime(period.startAt, locale)} →{' '}
                    {formatDateTime(period.endAt, locale)}
                  </p>
                </div>

                <ul className='space-y-3 border-t border-border/60 pt-4'>
                  {exams.map((exam) => (
                    <li
                      key={exam.id || exam.shortId}
                      className='rounded-xl border border-border/60 p-4'
                    >
                      <div className='flex flex-wrap items-center gap-2'>
                        <h3 className='font-semibold'>{exam.title}</h3>
                        <Badge variant='outline' className='font-mono text-[11px]'>
                          {exam.shortId}
                        </Badge>
                      </div>
                      {exam.description ? (
                        <p className='mt-1 line-clamp-2 text-sm text-muted-foreground'>
                          {exam.description}
                        </p>
                      ) : null}
                      <p className='mt-2 text-xs text-muted-foreground'>
                        {copy.minutes.replace('{n}', String(exam.durationMinutes))}
                        {' · '}
                        {copy.questions.replace('{n}', String(exam.questionCount))}
                        {' · '}
                        {copy.totalScore.replace('{n}', String(exam.totalScore))}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <Button type='button' variant='outline' disabled={starting} onClick={goToExams}>
                {copy.registerSuccessLater}
              </Button>
              {exams.length > 0 ? (
                <Button
                  type='button'
                  className='gap-2'
                  disabled={starting}
                  onClick={() => void handleStartExam()}
                >
                  <Play className='size-4' />
                  {starting ? dictionary.common.loading : copy.registerSuccessStart}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </WelcomeChrome>
  );
}

export default function ExamRegisterWelcomePage() {
  const { dictionary } = useI18n();

  return (
    <Suspense
      fallback={
        <WelcomeChrome>
          <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>
        </WelcomeChrome>
      }
    >
      <ExamRegisterWelcomeContent />
    </Suspense>
  );
}
