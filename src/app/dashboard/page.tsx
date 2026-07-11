'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { isAdminRole } from '@/features/auth/types';
import { useI18n } from '@/features/i18n/provider';
import { formatMessage } from '@/features/i18n/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const { dictionary } = useI18n();
  const router = useRouter();
  const name = user?.fullName || user?.name || dictionary.common.user;
  const copy = dictionary.dashboard;

  useEffect(() => {
    if (isAdminRole(user?.role)) {
      router.replace('/admin/dashboard');
    }
  }, [router, user?.role]);

  if (isAdminRole(user?.role)) {
    return <div className='min-h-screen bg-background' />;
  }

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
        <CardContent className='space-y-2 text-sm text-muted-foreground'>
          <p>
            {dictionary.common.role}: {dictionary.common.user}
          </p>
          {user?.className ? (
            <p>
              {dictionary.profile.className}: {user.className}
            </p>
          ) : null}
          {user?.school ? (
            <p>
              {dictionary.profile.school}: {user.school}
            </p>
          ) : null}
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
        <CardContent className='flex flex-wrap gap-2'>
          <Button asChild>
            <Link href='/exams'>{copy.goToExams}</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/exams?tab=history'>{copy.goToAttempts}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
