'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/features/i18n/provider';

export default function UserAttemptsRedirectPage() {
  const router = useRouter();
  const { dictionary } = useI18n();

  useEffect(() => {
    router.replace('/exams?tab=history');
  }, [router]);

  return <p className='py-16 text-center text-muted-foreground'>{dictionary.common.loading}</p>;
}
