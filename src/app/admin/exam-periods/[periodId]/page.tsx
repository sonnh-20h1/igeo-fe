'use client';

import { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList, Download, Power } from 'lucide-react';
import { adminExamPeriodsApi } from '@/features/admin-exam-periods/api';
import type {
  ExamPeriod,
  ExamPeriodExamItem,
  ExamPeriodStatus,
} from '@/features/admin-exam-periods/types';
import { adminExamAttemptsApi } from '@/features/admin-exam-attempts/api';
import {
  buildAttemptPdfLabelsFromCopy,
  exportAttemptPdf,
  isAttemptExportable,
} from '@/features/admin-exam-attempts/export-attempt-pdf';
import type { ExamAttemptStatus, ExamAttemptSummary } from '@/features/user-exam-attempts/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNotification } from '@/components/ui/notification';

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function attemptEndedAt(attempt: ExamAttemptSummary) {
  if (attempt.submittedAt) return attempt.submittedAt;
  if (attempt.status === 'EXPIRED') return attempt.expiresAt;
  return null;
}

function periodExamIds(period: ExamPeriod | null) {
  if (!period) return [];
  if (period.examIds?.length) return period.examIds;
  if (period.examId) return [period.examId];
  return [];
}

export default function AdminExamPeriodDetailPage() {
  const params = useParams<{ periodId: string }>();
  const periodId = params.periodId;
  const { dictionary, locale } = useI18n();
  const copy = dictionary.adminExamPeriods;
  const attemptsCopy = dictionary.adminExamAttempts;
  const { error: notifyError, success } = useNotification();

  const [period, setPeriod] = useState<ExamPeriod | null>(null);
  const [exams, setExams] = useState<ExamPeriodExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const [attempts, setAttempts] = useState<ExamAttemptSummary[]>([]);
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [attemptsPage, setAttemptsPage] = useState(1);
  const [attemptsPageSize, setAttemptsPageSize] = useState(10);
  const [attemptsStatus, setAttemptsStatus] = useState<ExamAttemptStatus | 'ALL'>('ALL');
  const [examFilter, setExamFilter] = useState<string>('ALL');
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [detail, examsResult] = await Promise.all([
          adminExamPeriodsApi.getById(periodId),
          adminExamPeriodsApi.listExams(periodId),
        ]);
        if (cancelled) return;
        startTransition(() => {
          setPeriod(detail);
          setExams(examsResult.items ?? []);
          setLoading(false);
        });
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
  }, [copy.loadFailed, notifyError, periodId]);

  useEffect(() => {
    if (!period) return;
    const examIds = periodExamIds(period);
    if (!examIds.length) {
      setAttempts([]);
      setAttemptsTotal(0);
      return;
    }

    let cancelled = false;
    async function loadAttempts() {
      setAttemptsLoading(true);
      try {
        const status = attemptsStatus === 'ALL' ? undefined : attemptsStatus;

        if (examFilter !== 'ALL') {
          const result = await adminExamAttemptsApi.list({
            page: attemptsPage,
            size: attemptsPageSize,
            status,
            examId: examFilter,
          });
          if (cancelled) return;
          startTransition(() => {
            setAttempts(result.items ?? []);
            setAttemptsTotal(result.pageInfo?.total ?? 0);
            setAttemptsLoading(false);
          });
          return;
        }

        const pages = await Promise.all(
          examIds.map((examId) =>
            adminExamAttemptsApi.list({
              page: 1,
              size: 100,
              status,
              examId,
            }),
          ),
        );
        if (cancelled) return;

        const merged = pages
          .flatMap((page) => page.items ?? [])
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        const start = (attemptsPage - 1) * attemptsPageSize;
        startTransition(() => {
          setAttempts(merged.slice(start, start + attemptsPageSize));
          setAttemptsTotal(merged.length);
          setAttemptsLoading(false);
        });
      } catch (error) {
        if (!cancelled) {
          startTransition(() => setAttemptsLoading(false));
          notifyError(
            error instanceof Error ? error.message : attemptsCopy.loadFailed,
            attemptsCopy.loadFailed,
          );
        }
      }
    }
    void loadAttempts();
    return () => {
      cancelled = true;
    };
  }, [
    attemptsCopy.loadFailed,
    attemptsPage,
    attemptsPageSize,
    attemptsStatus,
    examFilter,
    notifyError,
    period,
  ]);

  function statusLabel(status: ExamPeriodStatus) {
    if (status === 'DRAFT') return copy.statusDraft;
    if (status === 'ACTIVE') return copy.statusActive;
    return copy.statusClosed;
  }

  function attemptStatusLabel(status: ExamAttemptStatus) {
    if (status === 'IN_PROGRESS') return attemptsCopy.statusInProgress;
    if (status === 'SUBMITTED') return attemptsCopy.statusSubmitted;
    return attemptsCopy.statusExpired;
  }

  async function handleExportPdf(attemptId: string) {
    setExportingId(attemptId);
    try {
      const detail = await adminExamAttemptsApi.getById(attemptId);
      await exportAttemptPdf(detail, buildAttemptPdfLabelsFromCopy(attemptsCopy), locale);
      success(attemptsCopy.exportPdfDone);
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : attemptsCopy.exportPdfFailed,
        attemptsCopy.exportPdfFailed,
      );
    } finally {
      setExportingId(null);
    }
  }

  async function handleActivate() {
    if (!period) return;
    if (!window.confirm(copy.activateConfirm.replace('{name}', period.title))) return;
    setActivating(true);
    try {
      const updated = await adminExamPeriodsApi.activate(period.id);
      setPeriod(updated);
      success(copy.activated);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.activateFailed, copy.activateFailed);
    } finally {
      setActivating(false);
    }
  }

  if (loading) {
    return <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>;
  }

  if (!period) {
    return <p className='py-16 text-center text-muted-foreground'>{copy.loadFailed}</p>;
  }

  const examIds = periodExamIds(period);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <Button asChild variant='outline' className='gap-2'>
          <Link href='/admin/exam-periods'>
            <ArrowLeft className='size-4' />
            {copy.backToList}
          </Link>
        </Button>
        <div className='flex flex-wrap gap-2'>
          {period.status !== 'ACTIVE' ? (
            <Button
              variant='outline'
              className='gap-2'
              disabled={activating}
              onClick={() => void handleActivate()}
            >
              <Power className='size-4' />
              {activating ? dictionary.common.loading : copy.activate}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center gap-2'>
            <CardTitle>{period.title}</CardTitle>
            <Badge variant='outline' className='font-mono'>
              {period.shortId}
            </Badge>
            <Badge variant='outline'>{statusLabel(period.status)}</Badge>
          </div>
          <CardDescription>{period.description || copy.noDescription}</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <div className='rounded-xl border border-border/70 p-4'>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>{copy.colWindow}</p>
            <p className='mt-2 text-sm font-medium'>{formatDateTime(period.startAt, locale)}</p>
            <p className='text-sm text-muted-foreground'>→ {formatDateTime(period.endAt, locale)}</p>
          </div>
          <div className='rounded-xl border border-border/70 p-4'>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>{copy.examsCount}</p>
            <p className='mt-2 text-3xl font-semibold'>{exams.length || examIds.length}</p>
          </div>
          <div className='rounded-xl border border-border/70 p-4 sm:col-span-2 lg:col-span-1'>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>{copy.colExam}</p>
            <div className='mt-2 flex flex-wrap gap-1'>
              {(period.examTitles?.length ? period.examTitles : examIds).map((label, index) => (
                <Badge key={`${label}-${index}`} variant='outline'>
                  {label}
                </Badge>
              ))}
              {!examIds.length ? <span className='text-sm text-muted-foreground'>—</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ClipboardList className='size-5 text-primary' />
            {copy.examsTitle}
          </CardTitle>
          <CardDescription>{copy.examsDescription}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {exams.length === 0 ? (
            <p className='py-8 text-center text-muted-foreground'>{copy.examsEmpty}</p>
          ) : (
            exams.map((exam) => (
              <div
                key={exam.id || exam.shortId}
                className='flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h3 className='font-semibold'>{exam.title}</h3>
                    <Badge variant='outline' className='font-mono text-[11px]'>
                      {exam.shortId}
                    </Badge>
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
                <Button asChild variant='outline'>
                  <Link href={`/admin/exams`}>{copy.viewExam}</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='gap-4'>
          <div>
            <CardTitle>{copy.attemptsTitle}</CardTitle>
            <CardDescription>{copy.attemptsDescription}</CardDescription>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <Select
              value={examFilter}
              onValueChange={(value) => {
                setAttemptsPage(1);
                setExamFilter(value);
              }}
            >
              <SelectTrigger className='w-[240px]'>
                <SelectValue placeholder={copy.filterAllExams} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>{copy.filterAllExams}</SelectItem>
                {examIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={attemptsStatus}
              onValueChange={(value) => {
                setAttemptsPage(1);
                setAttemptsStatus(value as ExamAttemptStatus | 'ALL');
              }}
            >
              <SelectTrigger className='w-[220px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>{attemptsCopy.filterAllStatuses}</SelectItem>
                <SelectItem value='IN_PROGRESS'>{attemptsCopy.statusInProgress}</SelectItem>
                <SelectItem value='SUBMITTED'>{attemptsCopy.statusSubmitted}</SelectItem>
                <SelectItem value='EXPIRED'>{attemptsCopy.statusExpired}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='overflow-x-auto rounded-xl border border-border/70'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{attemptsCopy.colShortId}</TableHead>
                  <TableHead>{attemptsCopy.colCandidate}</TableHead>
                  <TableHead>{attemptsCopy.colExam}</TableHead>
                  <TableHead>{attemptsCopy.colStatus}</TableHead>
                  <TableHead>{attemptsCopy.colStartedAt}</TableHead>
                  <TableHead>{attemptsCopy.colEndedAt}</TableHead>
                  <TableHead className='text-right'>{attemptsCopy.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attemptsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className='py-10 text-center text-muted-foreground'>
                      {dictionary.common.loading}
                    </TableCell>
                  </TableRow>
                ) : attempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='py-10 text-center text-muted-foreground'>
                      {copy.attemptsEmpty}
                    </TableCell>
                  </TableRow>
                ) : (
                  attempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <span className='font-mono text-sm font-semibold text-primary'>
                          {attempt.shortId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className='font-medium'>
                          {attempt.userFullName || attemptsCopy.unknownUser}
                        </p>
                        {attempt.userEmail ? (
                          <p className='text-sm text-muted-foreground'>{attempt.userEmail}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className='max-w-xs'>
                        <p className='font-medium'>{attempt.examTitle || attempt.examId}</p>
                        {attempt.examTitle ? (
                          <p className='text-xs text-muted-foreground'>{attempt.examId}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{attemptStatusLabel(attempt.status)}</Badge>
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(attempt.startedAt, locale)}
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(attemptEndedAt(attempt), locale)}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          {isAttemptExportable(attempt.status) ? (
                            <Button
                              size='sm'
                              variant='outline'
                              className='gap-1'
                              disabled={exportingId === attempt.id}
                              onClick={() => void handleExportPdf(attempt.id)}
                            >
                              <Download className='size-3.5' />
                              {exportingId === attempt.id
                                ? attemptsCopy.exportingPdf
                                : attemptsCopy.exportPdf}
                            </Button>
                          ) : null}
                          <Button asChild size='sm'>
                            <Link href={`/admin/exam-attempts/${attempt.id}`}>
                              {attemptsCopy.review}
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            currentPage={attemptsPage}
            pageSize={attemptsPageSize}
            totalItems={attemptsTotal}
            itemLabel={attemptsCopy.itemLabel}
            onPageChange={setAttemptsPage}
            onPageSizeChange={(size) => {
              setAttemptsPage(1);
              setAttemptsPageSize(size);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
