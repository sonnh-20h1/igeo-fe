'use client';

import { Suspense, startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClipboardList, History, Play, Search } from 'lucide-react';
import { userExamsApi } from '@/features/user-exams/api';
import type { ExamUserSummary } from '@/features/user-exams/types';
import { userExamAttemptsApi } from '@/features/user-exam-attempts/api';
import type { ExamAttemptStatus, ExamAttemptSummary } from '@/features/user-exam-attempts/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/ui/notification';
import { cn } from '@/lib/utils';

type ExamTab = 'exams' | 'history';

function parseTab(value: string | null): ExamTab {
  return value === 'history' ? 'history' : 'exams';
}

export default function UserExamsPage() {
  const { dictionary } = useI18n();
  return (
    <Suspense
      fallback={<p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>}
    >
      <UserExamsPageContent />
    </Suspense>
  );
}

function UserExamsPageContent() {
  const { dictionary } = useI18n();
  const examsCopy = dictionary.userExams;
  const attemptsCopy = dictionary.userAttempts;
  const { error: notifyError, success } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));

  function setTab(next: ExamTab) {
    const query = next === 'history' ? '?tab=history' : '';
    router.replace(`/exams${query}`);
  }

  return (
    <div className='space-y-6'>
      <div>
        <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{examsCopy.eyebrow}</p>
        <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{examsCopy.pageTitle}</h1>
        <p className='mt-2 max-w-2xl text-muted-foreground'>{examsCopy.pageDescription}</p>
      </div>

      <div className='inline-flex rounded-2xl border border-border/70 bg-card p-1'>
        <button
          type='button'
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
            tab === 'exams'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setTab('exams')}
        >
          <ClipboardList className='size-4' />
          {examsCopy.tabExams}
        </button>
        <button
          type='button'
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
            tab === 'history'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => setTab('history')}
        >
          <History className='size-4' />
          {examsCopy.tabHistory}
        </button>
      </div>

      {tab === 'exams' ? (
        <ExamsListTab
          copy={examsCopy}
          loadingLabel={dictionary.common.loading}
          notifyError={notifyError}
          success={success}
          onStarted={(attemptId) => router.push(`/attempts/${attemptId}`)}
        />
      ) : (
        <AttemptsHistoryTab
          copy={attemptsCopy}
          loadingLabel={dictionary.common.loading}
          notifyError={notifyError}
        />
      )}
    </div>
  );
}

function ExamsListTab({
  copy,
  loadingLabel,
  notifyError,
  success,
  onStarted,
}: {
  copy: ReturnType<typeof useI18n>['dictionary']['userExams'];
  loadingLabel: string;
  notifyError: (message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  onStarted: (attemptId: string) => void;
}) {
  const [items, setItems] = useState<ExamUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });
      try {
        const result = await userExamsApi.list({
          page,
          size: pageSize,
          search: search.trim() || undefined,
        });
        if (cancelled) return;
        startTransition(() => {
          setItems(result.items ?? []);
          setTotal(result.pageInfo?.total ?? 0);
          setLoading(false);
        });
      } catch (error) {
        if (cancelled) return;
        startTransition(() => setLoading(false));
        notifyError(error instanceof Error ? error.message : copy.loadFailed, copy.loadFailed);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, notifyError, page, pageSize, search]);

  async function startExam(exam: ExamUserSummary) {
    setStartingId(exam.id);
    try {
      const attempt = await userExamAttemptsApi.start(exam.id);
      success(copy.started);
      onStarted(attempt.id);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.startFailed, copy.startFailed);
    } finally {
      setStartingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className='gap-4'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <ClipboardList className='size-5 text-primary' />
            {copy.listTitle}
          </CardTitle>
          <CardDescription>{copy.listDescription}</CardDescription>
        </div>
        <form
          className='flex w-full max-w-md gap-2'
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput);
          }}
        >
          <div className='relative flex-1'>
            <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              className='pl-9'
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </div>
          <Button type='submit' variant='outline'>
            {copy.search}
          </Button>
        </form>
      </CardHeader>
      <CardContent className='space-y-4'>
        {loading ? (
          <p className='py-10 text-center text-muted-foreground'>{loadingLabel}</p>
        ) : items.length === 0 ? (
          <p className='py-10 text-center text-muted-foreground'>{copy.empty}</p>
        ) : (
          <div className='space-y-3'>
            {items.map((exam) => (
              <div
                key={exam.id}
                className='flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h3 className='text-base font-semibold'>{exam.title}</h3>
                    <Badge variant='outline' className='font-mono text-[11px]'>
                      {exam.shortId}
                    </Badge>
                    {exam.hasAttempted ? (
                      <Badge className='bg-secondary text-foreground'>{copy.attempted}</Badge>
                    ) : null}
                    {exam.hasDynamicQuestions ? (
                      <Badge variant='outline'>{copy.dynamicBadge}</Badge>
                    ) : null}
                  </div>
                  {exam.description ? (
                    <p className='mt-1 line-clamp-2 text-sm text-muted-foreground'>{exam.description}</p>
                  ) : null}
                  <div className='mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground'>
                    <span>{copy.minutes.replace('{n}', String(exam.durationMinutes))}</span>
                    <span>{copy.questions.replace('{n}', String(exam.questionCount))}</span>
                    <span>{copy.totalScore.replace('{n}', String(exam.totalScore))}</span>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button asChild variant='outline'>
                    <Link href={`/exams/${exam.id}`}>{copy.view}</Link>
                  </Button>
                  <Button
                    className='gap-2'
                    disabled={startingId === exam.id}
                    onClick={() => void startExam(exam)}
                  >
                    <Play className='size-4' />
                    {startingId === exam.id
                      ? loadingLabel
                      : exam.hasAttempted
                        ? copy.retake
                        : copy.start}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <PaginationControls
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          itemLabel={copy.itemLabel}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
        />
      </CardContent>
    </Card>
  );
}

function AttemptsHistoryTab({
  copy,
  loadingLabel,
  notifyError,
}: {
  copy: ReturnType<typeof useI18n>['dictionary']['userAttempts'];
  loadingLabel: string;
  notifyError: (message: string, title?: string) => void;
}) {
  const [items, setItems] = useState<ExamAttemptSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ExamAttemptStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });
      try {
        const result = await userExamAttemptsApi.list({
          page,
          size: pageSize,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        });
        if (cancelled) return;
        startTransition(() => {
          setItems(result.items ?? []);
          setTotal(result.pageInfo?.total ?? 0);
          setLoading(false);
        });
      } catch (error) {
        if (cancelled) return;
        startTransition(() => setLoading(false));
        notifyError(error instanceof Error ? error.message : copy.loadFailed, copy.loadFailed);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, notifyError, page, pageSize, statusFilter]);

  function statusLabel(status: ExamAttemptStatus) {
    if (status === 'IN_PROGRESS') return copy.statusInProgress;
    if (status === 'SUBMITTED') return copy.statusSubmitted;
    if (status === 'PENDING_REVIEW') return copy.statusPendingReview;
    if (status === 'GRADED') return copy.statusGraded;
    return copy.statusExpired;
  }

  return (
    <Card>
      <CardHeader className='gap-4'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <History className='size-5 text-primary' />
            {copy.listTitle}
          </CardTitle>
          <CardDescription>{copy.listDescription}</CardDescription>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setPage(1);
            setStatusFilter(value as ExamAttemptStatus | 'ALL');
          }}
        >
          <SelectTrigger className='w-[220px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>{copy.filterAllStatuses}</SelectItem>
            <SelectItem value='IN_PROGRESS'>{copy.statusInProgress}</SelectItem>
            <SelectItem value='PENDING_REVIEW'>{copy.statusPendingReview}</SelectItem>
            <SelectItem value='GRADED'>{copy.statusGraded}</SelectItem>
            <SelectItem value='SUBMITTED'>{copy.statusSubmitted}</SelectItem>
            <SelectItem value='EXPIRED'>{copy.statusExpired}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className='space-y-4'>
        {loading ? (
          <p className='py-10 text-center text-muted-foreground'>{loadingLabel}</p>
        ) : items.length === 0 ? (
          <p className='py-10 text-center text-muted-foreground'>{copy.empty}</p>
        ) : (
          <div className='space-y-3'>
            {items.map((attempt) => (
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
                    {copy.examCode}: {attempt.examId}
                  </p>
                  <p className='mt-1 text-sm'>
                    {copy.scoreLabel
                      .replace('{total}', String(attempt.totalScore))
                      .replace('{max}', String(attempt.maxScore))}
                  </p>
                </div>
                <div>
                  {attempt.status === 'IN_PROGRESS' ? (
                    <Button asChild>
                      <Link href={`/attempts/${attempt.id}`}>{copy.resume}</Link>
                    </Button>
                  ) : (
                    <Button asChild variant='outline'>
                      <Link href={`/attempts/${attempt.id}/result`}>{copy.viewResult}</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <PaginationControls
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          itemLabel={copy.itemLabel}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
        />
      </CardContent>
    </Card>
  );
}
