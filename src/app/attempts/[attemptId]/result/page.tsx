'use client';

import { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { userExamAttemptsApi } from '@/features/user-exam-attempts/api';
import type { ExamAttemptResult } from '@/features/user-exam-attempts/types';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/components/ui/notification';

export default function AttemptResultPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const { dictionary } = useI18n();
  const copy = dictionary.examResult;
  const { error: notifyError } = useNotification();
  const [result, setResult] = useState<ExamAttemptResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await userExamAttemptsApi.getResult(attemptId);
        if (!cancelled) {
          startTransition(() => {
            setResult(data);
            setLoading(false);
          });
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
  }, [attemptId, copy.loadFailed, notifyError]);

  if (loading) {
    return <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>;
  }

  if (!result) {
    return <p className='py-16 text-center text-muted-foreground'>{copy.loadFailed}</p>;
  }

  const answers = [...(result.answers ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className='space-y-6'>
      <Button asChild variant='outline' className='gap-2'>
        <Link href='/exams?tab=history'>
          <ArrowLeft className='size-4' />
          {copy.backToList}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>
            {copy.attemptCode}: {result.shortId} · {copy.examCode}: {result.examId}
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-3'>
          <div className='rounded-xl border border-border/70 p-4'>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>{copy.totalScore}</p>
            <p className='mt-2 text-3xl font-semibold'>
              {result.totalScore}/{result.maxScore}
            </p>
          </div>
          <div className='rounded-xl border border-border/70 p-4'>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>{copy.mcScore}</p>
            <p className='mt-2 text-3xl font-semibold'>{result.mcScore}</p>
          </div>
          <div className='rounded-xl border border-border/70 p-4'>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>{copy.essayScore}</p>
            <p className='mt-2 text-3xl font-semibold'>
              {result.status === 'PENDING_REVIEW'
                ? copy.pendingReview
                : (result.essayScore ?? 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className='space-y-3'>
        {answers.map((item, index) => (
          <Card key={item.questionShortId}>
            <CardHeader className='pb-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <CardTitle className='text-base'>
                  {copy.questionLabel.replace('{n}', String(index + 1))}
                </CardTitle>
                <Badge variant='outline' className='font-mono'>
                  {item.questionShortId}
                </Badge>
                {item.type === 'MULTIPLE_CHOICE' ? (
                  item.isCorrect ? (
                    <Badge className='gap-1 bg-emerald-100 text-emerald-700'>
                      <CheckCircle2 className='size-3.5' />
                      {copy.correct}
                    </Badge>
                  ) : (
                    <Badge className='gap-1 bg-red-100 text-red-700'>
                      <XCircle className='size-3.5' />
                      {copy.incorrect}
                    </Badge>
                  )
                ) : (
                  <Badge variant='outline'>{copy.essay}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <p className='whitespace-pre-wrap'>{item.question?.content}</p>
              <p>
                <span className='text-muted-foreground'>{copy.yourAnswer}: </span>
                {item.userAnswer || copy.noAnswer}
              </p>
              <p>
                <span className='text-muted-foreground'>{copy.earnedScore}: </span>
                {item.earnedScore ?? 0}/{item.score}
              </p>
              {item.feedback ? (
                <p>
                  <span className='text-muted-foreground'>{copy.feedback}: </span>
                  {item.feedback}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
