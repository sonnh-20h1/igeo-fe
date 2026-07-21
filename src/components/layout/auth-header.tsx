'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useI18n } from '@/features/i18n/provider';
import { APP_NAME } from '@/lib/app-config';

export default function AuthHeader() {
  const { dictionary } = useI18n();

  return (
    <header className='fixed left-0 top-0 z-40 w-full border-b border-white/40 bg-white/82 backdrop-blur-sm'>
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6'>
        <Link href='/login/admin' className='flex min-w-0 items-center gap-3'>
          <Image
            src='/images/logo.png'
            alt={APP_NAME}
            className='shrink-0 object-contain'
            style={{ width: 'auto', height: '40px' }}
            width={1023}
            height={1024}
          />
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-foreground'>{APP_NAME}</p>
            <p className='text-xs text-muted-foreground'>{dictionary.authHeader.subtitle}</p>
          </div>
        </Link>

        <div className='flex items-center gap-2'>
          <LanguageSwitcher compact />
          <Link
            href='/login/admin'
            className='text-sm font-medium text-primary transition hover:text-primary/80 hover:underline'
          >
            {dictionary.authHeader.backToLogin}
          </Link>
        </div>
      </div>
    </header>
  );
}
