'use client';

import { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { adminExamAttemptsApi } from '@/features/admin-exam-attempts/api';
import {
  buildAttemptPdfLabelsFromCopy,
  exportAttemptPdf,
  isAttemptExportable,
} from '@/features/admin-exam-attempts/export-attempt-pdf';
import type { ExamAttemptAdminDetail, ExamAttemptStatus } from '@/features/user-exam-attempts/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/ui/notification';

export default function AdminExamAttemptDetailPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const { dictionary, locale } = useI18n();
  const copy = dictionary.adminExamAttempts;
  const { error: notifyError, success } = useNotification();

  const [attempt, setAttempt] = useState<ExamAttemptAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  function formatDateTime(value: string | Date | null | undefined) {
    if (!value) return '—';
    return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  function statusLabel(status: ExamAttemptStatus) {
    if (status === 'IN_PROGRESS') return copy.statusInProgress;
    if (status === 'SUBMITTED') return copy.statusSubmitted;
    return copy.statusExpired;
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const detail = await adminExamAttemptsApi.getById(attemptId);
        if (cancelled) return;
        startTransition(() => {
          setAttempt(detail);
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
  }, [attemptId, copy.loadFailed, notifyError]);

  async function handleExportPdf() {
    if (!attempt) return;
    setExporting(true);
    try {
      await exportAttemptPdf(attempt, buildAttemptPdfLabelsFromCopy(copy), locale);
      success(copy.exportPdfDone);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.exportPdfFailed, copy.exportPdfFailed);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>;
  }

  if (!attempt) {
    return <p className='py-16 text-center text-muted-foreground'>{copy.loadFailed}</p>;
  }

  const answers = [...(attempt.answers ?? [])].sort((a, b) => a.order - b.order);
  const canExport = isAttemptExportable(attempt.status);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button asChild variant='outline' className='gap-2'>
          <Link href='/admin/exam-attempts'>
            <ArrowLeft className='size-4' />
            {copy.backToList}
          </Link>
        </Button>
        {canExport ? (
          <Button
            variant='outline'
            className='gap-2'
            disabled={exporting}
            onClick={() => void handleExportPdf()}
          >
            <Download className='size-4' />
            {exporting ? copy.exportingPdf : copy.exportPdf}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {copy.detailTitle} · {attempt.shortId}
          </CardTitle>
          <CardDescription>
            {attempt.userFullName || copy.unknownUser}
            {attempt.userEmail ? ` · ${attempt.userEmail}` : ''}
            <br />
            {attempt.examTitle ? `${attempt.examTitle} · ` : null}
            {copy.examCode}: {attempt.examId}
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-4 text-sm'>
          <span>
            {copy.colStartedAt}: {formatDateTime(attempt.startedAt)}
          </span>
          <span>
            {copy.colEndedAt}:{' '}
            {formatDateTime(
              attempt.submittedAt || (attempt.status === 'EXPIRED' ? attempt.expiresAt : null),
            )}
          </span>
          <Badge variant='outline'>{statusLabel(attempt.status)}</Badge>
        </CardContent>
      </Card>

      <div className='space-y-4'>
        {answers.map((item, index) => (
          <Card key={item.questionShortId}>
            <CardHeader>
              <div className='flex flex-wrap items-center gap-2'>
                <CardTitle className='text-base'>
                  {copy.questionLabel.replace('{n}', String(index + 1))}
                </CardTitle>
                <Badge variant='outline' className='font-mono'>
                  {item.questionShortId}
                </Badge>
                <Badge variant='outline'>
                  {item.type === 'MULTIPLE_CHOICE' ? copy.pdfTypeMcq : copy.pdfTypeEssay}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <p className='whitespace-pre-wrap'>{item.question?.content}</p>
              {item.type === 'MULTIPLE_CHOICE' && item.question?.options?.length ? (
                <ul className='space-y-1 text-muted-foreground'>
                  {item.question.options.map((option) => (
                    <li key={option.key}>
                      <span className='font-medium text-foreground'>{option.key}.</span> {option.text}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p>
                <span className='text-muted-foreground'>{copy.userAnswer}: </span>
                {item.userAnswer || '—'}
              </p>
              {item.type === 'MULTIPLE_CHOICE' ? (
                <p>
                  <span className='text-muted-foreground'>{copy.correctAnswer}: </span>
                  {item.question?.correctAnswer || '—'}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
