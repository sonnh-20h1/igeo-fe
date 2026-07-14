'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { hasExamSession } from '@/features/exam-session/storage';
import { useI18n } from '@/features/i18n/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AttemptSubmittedPage() {
  const router = useRouter();
  const { dictionary } = useI18n();
  const copy = dictionary.examResult;

  useEffect(() => {
    if (!hasExamSession()) {
      router.replace('/exams');
    }
  }, [router]);

  return (
    <div className='mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-4'>
      <Card className='w-full text-center'>
        <CardHeader className='items-center gap-3'>
          <div className='flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
            <CheckCircle2 className='size-8' />
          </div>
          <CardTitle className='text-2xl'>{copy.title}</CardTitle>
          <CardDescription className='text-base'>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className='w-full sm:w-auto'>
            <Link href='/exams'>{copy.backToList}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
