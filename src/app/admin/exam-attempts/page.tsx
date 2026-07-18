'use client';

import { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Download, Unlock, Eye, Clock, CheckCircle2, Award, Lock, HelpCircle, Calendar, SlidersHorizontal, Settings } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNotification } from '@/components/ui/notification';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

function formatDateTime(value: string | Date | null | undefined, locale: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function toDatetimeLocalString(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  
  const pad = (num: number) => String(num).padStart(2, '0');
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AdminExamAttemptsPage() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.adminExamAttempts;
  const { error: notifyError, success } = useNotification();

  const [items, setItems] = useState<ExamAttemptSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<ExamAttemptStatus | 'ALL'>('ALL');
  const [sortScore, setSortScore] = useState<'DEFAULT' | 'asc' | 'desc'>('DEFAULT');
  const [emailInput, setEmailInput] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // States for Score and Publish Date Editing Dialog
  const [scorePublishAttempt, setScorePublishAttempt] = useState<ExamAttemptSummary | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [publishDateInput, setPublishDateInput] = useState('');
  const [savingScorePublish, setSavingScorePublish] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      startTransition(() => {
        if (!cancelled) setLoading(true);
      });
      try {
        const result = await adminExamAttemptsApi.list({
          page,
          size: pageSize,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          email: emailFilter || undefined,
          sortScore: sortScore === 'DEFAULT' ? undefined : sortScore,
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
  }, [copy.loadFailed, emailFilter, notifyError, page, pageSize, reloadKey, statusFilter, sortScore]);

  function applyEmailFilter() {
    setPage(1);
    setEmailFilter(emailInput.trim());
  }

  function statusLabel(status: ExamAttemptStatus) {
    if (status === 'IN_PROGRESS') return copy.statusInProgress;
    if (status === 'SUBMITTED') return copy.statusSubmitted;
    if (status === 'GRADED') return copy.statusGraded;
    if (status === 'LOCKED') return copy.statusLocked;
    return copy.statusExpired;
  }

  function endedAt(attempt: ExamAttemptSummary) {
    if (attempt.submittedAt) return attempt.submittedAt;
    if (attempt.lockedAt) return attempt.lockedAt;
    if (attempt.status === 'EXPIRED') return attempt.expiresAt;
    return null;
  }

  async function handleUnlock(attemptId: string) {
    if (!window.confirm(copy.unlockConfirm)) return;
    setUnlockingId(attemptId);
    try {
      await adminExamAttemptsApi.unlock(attemptId);
      success(copy.unlocked);
      setReloadKey((value) => value + 1);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.unlockFailed, copy.unlockFailed);
    } finally {
      setUnlockingId(null);
    }
  }

  async function handleExportPdf(attemptId: string) {
    setExportingId(attemptId);
    try {
      const detail = await adminExamAttemptsApi.getById(attemptId);
      await exportAttemptPdf(detail, buildAttemptPdfLabelsFromCopy(copy), locale);
      success(copy.exportPdfDone);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.exportPdfFailed, copy.exportPdfFailed);
    } finally {
      setExportingId(null);
    }
  }

  function handleOpenScorePublish(attempt: ExamAttemptSummary) {
    setScorePublishAttempt(attempt);
    setScoreInput(attempt.totalScore != null ? String(attempt.totalScore) : '');
    setPublishDateInput(toDatetimeLocalString(attempt.publishScoresAt));
  }

  async function handleSaveScorePublish(event: React.FormEvent) {
    event.preventDefault();
    if (!scorePublishAttempt) return;

    const scoreNum = Number(scoreInput);
    if (scoreInput.trim() !== '' && (Number.isNaN(scoreNum) || scoreNum < 0)) {
      alert(copy.invalidScore);
      return;
    }

    setSavingScorePublish(true);
    try {
      await adminExamAttemptsApi.updateScoreAndPublish(scorePublishAttempt.id, {
        totalScore: scoreInput.trim() !== '' ? scoreNum : undefined,
        publishScoresAt: publishDateInput ? new Date(publishDateInput).toISOString() : null,
      });
      success(copy.graded);
      setReloadKey((prev) => prev + 1);
      setScorePublishAttempt(null);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.gradeFailed, copy.gradeFailed);
    } finally {
      setSavingScorePublish(false);
    }
  }

  function renderStatusBadge(status: ExamAttemptStatus) {
    const label = statusLabel(status);
    let icon = <HelpCircle className="size-4" />;
    let colorClass = "bg-slate-100 text-slate-700 border-slate-200";

    if (status === 'IN_PROGRESS') {
      icon = <Clock className="size-4 animate-pulse text-amber-600" />;
      colorClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (status === 'SUBMITTED') {
      icon = <CheckCircle2 className="size-4 text-emerald-600" />;
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (status === 'GRADED') {
      icon = <Award className="size-4 text-indigo-600" />;
      colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
    } else if (status === 'LOCKED') {
      icon = <Lock className="size-4 text-rose-600" />;
      colorClass = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (status === 'EXPIRED') {
      icon = <Clock className="size-4 text-slate-400" />;
      colorClass = "bg-slate-50 text-slate-500 border-slate-200";
    }

    return (
      <Tooltip content={label}>
        <Badge variant="outline" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs select-none ${colorClass}`}>
          {icon}
          <span>{label}</span>
        </Badge>
      </Tooltip>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{copy.eyebrow}</p>
        <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{copy.title}</h1>
        <p className='mt-2 max-w-2xl text-muted-foreground'>{copy.description}</p>
      </div>

      <Card>
        <CardHeader className='gap-4'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <ClipboardCheck className='size-5 text-primary' />
              {copy.listTitle}
            </CardTitle>
            <CardDescription>{copy.listDescription}</CardDescription>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
            <form
              className='flex flex-1 gap-2 sm:max-w-sm'
              onSubmit={(event) => {
                event.preventDefault();
                applyEmailFilter();
              }}
            >
              <Input
                type='email'
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder={copy.emailPlaceholder}
                className='flex-1'
              />
              <Button type='submit' variant='outline'>
                {copy.filterEmail}
              </Button>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value as ExamAttemptStatus | 'ALL');
              }}
            >
              <SelectTrigger className='w-[200px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>{copy.filterAllStatuses}</SelectItem>
                <SelectItem value='SUBMITTED'>{copy.statusSubmitted}</SelectItem>
                <SelectItem value='GRADED'>{copy.statusGraded}</SelectItem>
                <SelectItem value='IN_PROGRESS'>{copy.statusInProgress}</SelectItem>
                <SelectItem value='LOCKED'>{copy.statusLocked}</SelectItem>
                <SelectItem value='EXPIRED'>{copy.statusExpired}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortScore}
              onValueChange={(value) => {
                setPage(1);
                setSortScore(value as 'DEFAULT' | 'asc' | 'desc');
              }}
            >
              <SelectTrigger className='w-[200px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='DEFAULT'>{copy.sortDefault}</SelectItem>
                <SelectItem value='asc'>{copy.sortScoreAsc}</SelectItem>
                <SelectItem value='desc'>{copy.sortScoreDesc}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='overflow-x-auto rounded-xl border border-border/70 scrollbar-thin'>
            <Table className='min-w-[1000px]'>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.colShortId}</TableHead>
                  <TableHead>{copy.colCandidate}</TableHead>
                  <TableHead>{copy.colExam}</TableHead>
                  <TableHead>{copy.colStatus}</TableHead>
                  <TableHead>{copy.colStartedAt}</TableHead>
                  <TableHead>{copy.colEndedAt}</TableHead>
                  <TableHead>{copy.colScore}</TableHead>
                  <TableHead className='text-right'>{copy.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className='py-10 text-center text-muted-foreground'>
                      {dictionary.common.loading}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='py-10 text-center text-muted-foreground'>
                      {copy.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <span className='font-mono text-sm font-semibold text-primary'>
                          {attempt.shortId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className='font-medium'>{attempt.userFullName || copy.unknownUser}</p>
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
                      <TableCell className='whitespace-nowrap'>
                        {renderStatusBadge(attempt.status)}
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(attempt.startedAt, locale)}
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                        {formatDateTime(endedAt(attempt), locale)}
                      </TableCell>
                      <TableCell className='whitespace-nowrap text-sm'>
                        {attempt.totalScore != null
                          ? copy.scoreLabel
                              .replace('{total}', String(attempt.totalScore))
                              .replace('{max}', String(attempt.maxScore ?? 0))
                          : '—'}
                      </TableCell>
                      <TableCell className='text-right whitespace-nowrap'>
                        <div className='flex justify-end gap-2'>
                          {attempt.status === 'SUBMITTED' ? (
                            <Tooltip content={copy.dialogGradeTitle}>
                              <Button
                                size='icon'
                                variant='outline'
                                className='shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                onClick={() => handleOpenScorePublish(attempt)}
                              >
                                <Settings className='size-4' />
                              </Button>
                            </Tooltip>
                          ) : null}
                          {attempt.status === 'LOCKED' ? (
                            <Tooltip content={unlockingId === attempt.id ? copy.unlocking : copy.unlock}>
                              <Button
                                size='icon'
                                variant='outline'
                                className='shrink-0'
                                disabled={unlockingId === attempt.id}
                                onClick={() => void handleUnlock(attempt.id)}
                              >
                                <Unlock className='size-4' />
                              </Button>
                            </Tooltip>
                          ) : null}
                          {isAttemptExportable(attempt.status) ? (
                            <Tooltip content={exportingId === attempt.id ? copy.exportingPdf : copy.exportPdf}>
                              <Button
                                size='icon'
                                variant='outline'
                                className='shrink-0'
                                disabled={exportingId === attempt.id}
                                onClick={() => void handleExportPdf(attempt.id)}
                              >
                                <Download className='size-4' />
                              </Button>
                            </Tooltip>
                          ) : null}
                          <Tooltip content={copy.review}>
                            <Button asChild size='icon' variant={attempt.status === 'LOCKED' ? 'outline' : 'default'} className='shrink-0'>
                              <Link href={`/admin/exam-attempts/${attempt.id}`}>
                                <Eye className='size-4' />
                              </Link>
                            </Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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

      <Dialog open={!!scorePublishAttempt} onOpenChange={(open) => !open && setScorePublishAttempt(null)}>
        <DialogContent className='sm:max-w-[425px]'>
          <form onSubmit={handleSaveScorePublish}>
            <DialogHeader>
              <DialogTitle>{copy.dialogGradeTitle}</DialogTitle>
              <DialogDescription>
                {scorePublishAttempt?.userFullName || copy.unknownUser} ({scorePublishAttempt?.shortId})
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='totalScore'>{copy.fieldTotalScore}</Label>
                <Input
                  id='totalScore'
                  type='number'
                  step='any'
                  min='0'
                  max={scorePublishAttempt?.maxScore}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  placeholder={`0 - ${scorePublishAttempt?.maxScore ?? 10}`}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='publishScoresAt'>{copy.fieldPublishDate}</Label>
                <Input
                  id='publishScoresAt'
                  type='datetime-local'
                  value={publishDateInput}
                  onChange={(e) => setPublishDateInput(e.target.value)}
                />
                <p className='text-xs text-muted-foreground'>{copy.fieldPublishDateHint}</p>
              </div>
            </div>
            <div className='mt-6 flex justify-end gap-3'>
              <Button type='button' variant='outline' onClick={() => setScorePublishAttempt(null)}>
                {copy.btnCancel}
              </Button>
              <Button type='submit' disabled={savingScorePublish}>
                {savingScorePublish ? copy.btnSaving : copy.btnSave}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
