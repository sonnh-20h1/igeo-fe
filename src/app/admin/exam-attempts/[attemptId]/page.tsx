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
import type { ExamAttemptAdminDetail } from '@/features/user-exam-attempts/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/ui/notification';

type GradeDraft = Record<string, { earnedScore: string; feedback: string }>;

export default function AdminExamAttemptDetailPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const { dictionary, locale } = useI18n();
  const copy = dictionary.adminExamAttempts;
  const { error: notifyError, success } = useNotification();

  const [attempt, setAttempt] = useState<ExamAttemptAdminDetail | null>(null);
  const [grades, setGrades] = useState<GradeDraft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  function formatDateTime(value: string | Date | null | undefined) {
    if (!value) return '—';
    return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const detail = await adminExamAttemptsApi.getById(attemptId);
        if (cancelled) return;
        const draft: GradeDraft = {};
        for (const answer of detail.answers ?? []) {
          draft[answer.questionShortId] = {
            earnedScore: answer.earnedScore != null ? String(answer.earnedScore) : '',
            feedback: answer.feedback ?? '',
          };
        }
        startTransition(() => {
          setAttempt(detail);
          setGrades(draft);
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

  async function submitGrades() {
    if (!attempt) return;
    const answers = attempt.answers ?? [];
    const payload = {
      grades: answers.map((item) => {
        const draft = grades[item.questionShortId] || { earnedScore: '0', feedback: '' };
        return {
          questionShortId: item.questionShortId,
          earnedScore: Number(draft.earnedScore || 0),
          feedback: draft.feedback.trim() || undefined,
        };
      }),
    };

    if (
      payload.grades.some((item) => {
        const answer = answers.find((a) => a.questionShortId === item.questionShortId);
        return (
          !Number.isFinite(item.earnedScore) ||
          item.earnedScore < 0 ||
          (answer != null && item.earnedScore > answer.score)
        );
      })
    ) {
      notifyError(copy.invalidScore, copy.gradeFailed);
      return;
    }

    setSaving(true);
    try {
      const updated = await adminExamAttemptsApi.gradeAttempt(attemptId, payload);
      const draft: GradeDraft = {};
      for (const answer of updated.answers ?? []) {
        draft[answer.questionShortId] = {
          earnedScore: answer.earnedScore != null ? String(answer.earnedScore) : '',
          feedback: answer.feedback ?? '',
        };
      }
      setAttempt(updated);
      setGrades(draft);
      success(copy.graded);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : copy.gradeFailed, copy.gradeFailed);
    } finally {
      setSaving(false);
    }
  }

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
  const canGrade =
    attempt.status === 'PENDING_REVIEW' ||
    attempt.status === 'SUBMITTED' ||
    attempt.status === 'GRADED' ||
    attempt.status === 'EXPIRED';
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
          <span>
            {copy.scoreLabel
              .replace('{total}', String(attempt.totalScore))
              .replace('{max}', String(attempt.maxScore))}
          </span>
          <span>
            MC: {attempt.mcScore} · Essay: {attempt.essayScore ?? '—'}
          </span>
          <Badge variant='outline'>{attempt.status}</Badge>
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
                <Badge variant='outline'>{item.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <p className='whitespace-pre-wrap'>{item.question?.content}</p>
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
              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='space-y-1'>
                  <Label>
                    {copy.earnedScore} (max {item.score})
                  </Label>
                  <Input
                    type='number'
                    min={0}
                    max={item.score}
                    step={0.1}
                    disabled={!canGrade}
                    value={grades[item.questionShortId]?.earnedScore ?? ''}
                    onChange={(event) =>
                      setGrades((current) => ({
                        ...current,
                        [item.questionShortId]: {
                          earnedScore: event.target.value,
                          feedback: current[item.questionShortId]?.feedback ?? '',
                        },
                      }))
                    }
                  />
                </div>
                <div className='space-y-1 sm:col-span-2'>
                  <Label>{copy.feedback}</Label>
                  <Textarea
                    rows={3}
                    disabled={!canGrade}
                    value={grades[item.questionShortId]?.feedback ?? ''}
                    onChange={(event) =>
                      setGrades((current) => ({
                        ...current,
                        [item.questionShortId]: {
                          earnedScore: current[item.questionShortId]?.earnedScore ?? '',
                          feedback: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canGrade && answers.length > 0 ? (
        <div className='flex justify-end'>
          <Button disabled={saving} onClick={() => void submitGrades()}>
            {saving ? dictionary.common.loading : copy.saveGrades}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
