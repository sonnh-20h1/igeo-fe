'use client';

import { startTransition, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ClipboardCheck, ClipboardList, Users } from 'lucide-react';
import { adminUsersApi } from '@/features/admin-users/api';
import { adminQuestionsApi } from '@/features/admin-questions/api';
import { adminExamsApi } from '@/features/admin-exams/api';
import { adminExamAttemptsApi } from '@/features/admin-exam-attempts/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/features/i18n/provider';
import { formatMessage } from '@/features/i18n/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { dictionary } = useI18n();
  const copy = dictionary.adminDashboard;
  const name = user?.fullName || user?.name || dictionary.common.admin;
  const [userTotal, setUserTotal] = useState<number | null>(null);
  const [questionTotal, setQuestionTotal] = useState<number | null>(null);
  const [examTotal, setExamTotal] = useState<number | null>(null);
  const [pendingReviewTotal, setPendingReviewTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const [users, questions, exams, pending] = await Promise.all([
          adminUsersApi.list({ page: 1, size: 1 }),
          adminQuestionsApi.list({ page: 1, size: 1 }),
          adminExamsApi.list({ page: 1, size: 1 }),
          adminExamAttemptsApi.list({ page: 1, size: 1, status: 'PENDING_REVIEW' }),
        ]);
        if (cancelled) return;
        startTransition(() => {
          setUserTotal(users.pageInfo?.total ?? 0);
          setQuestionTotal(questions.pageInfo?.total ?? 0);
          setExamTotal(exams.pageInfo?.total ?? 0);
          setPendingReviewTotal(pending.pageInfo?.total ?? 0);
          setLoading(false);
        });
      } catch {
        if (cancelled) return;
        startTransition(() => {
          setUserTotal(null);
          setQuestionTotal(null);
          setExamTotal(null);
          setPendingReviewTotal(null);
          setLoading(false);
        });
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className='space-y-6'>
      <div>
        <p className='font-mono text-xs uppercase tracking-[0.24em] text-primary'>{copy.eyebrow}</p>
        <h1 className='mt-2 text-2xl font-semibold sm:text-3xl'>{copy.title}</h1>
        <p className='mt-2 max-w-2xl text-muted-foreground'>{copy.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{formatMessage(copy.welcome, { name })}</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          {dictionary.common.role}: {dictionary.common.admin}
        </CardContent>
      </Card>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Users className='size-5 text-primary' />
              {copy.usersCardTitle}
            </CardTitle>
            <CardDescription>{copy.usersCardDescription}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-3xl font-semibold tracking-tight'>
              {loading ? '—' : (userTotal ?? '—')}
            </p>
            <Button asChild>
              <Link href='/admin/users'>{copy.manageUsers}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <BookOpen className='size-5 text-primary' />
              {copy.questionsCardTitle}
            </CardTitle>
            <CardDescription>{copy.questionsCardDescription}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-3xl font-semibold tracking-tight'>
              {loading ? '—' : (questionTotal ?? '—')}
            </p>
            <Button asChild>
              <Link href='/admin/questions'>{copy.manageQuestions}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <ClipboardList className='size-5 text-primary' />
              {copy.examsCardTitle}
            </CardTitle>
            <CardDescription>{copy.examsCardDescription}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-3xl font-semibold tracking-tight'>
              {loading ? '—' : (examTotal ?? '—')}
            </p>
            <Button asChild>
              <Link href='/admin/exams'>{copy.manageExams}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <ClipboardCheck className='size-5 text-primary' />
              {copy.attemptsCardTitle}
            </CardTitle>
            <CardDescription>{copy.attemptsCardDescription}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-3xl font-semibold tracking-tight'>
              {loading ? '—' : (pendingReviewTotal ?? '—')}
            </p>
            <Button asChild>
              <Link href='/admin/exam-attempts'>{copy.manageAttempts}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
