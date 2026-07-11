'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/features/i18n/provider';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { APP_NAME } from '@/lib/app-config';
import { authRepository } from '@/features/auth/repository';

export default function AdminLoginPage() {
  const { signIn, signing } = useAuth();
  const { dictionary } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const user = await signIn({ email, password }, 'ADMIN');
      if (user.role !== 'ADMIN') {
        authRepository.signOut();
        setError(dictionary.login.onlyAdminAllowed);
        return;
      }
      router.push('/admin/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : dictionary.login.loginFailed;
      setError(message);
    }
  }

  return (
    <div className='relative min-h-screen w-full bg-gradient-to-br from-[#f2e5d2] via-[#f8f1e6] to-white text-foreground flex flex-col justify-between overflow-hidden pt-24 px-4'>
      {/* Light Header matching AuthHeader */}
      <header className='absolute left-0 top-0 z-40 w-full border-b border-white/40 bg-white/82 backdrop-blur-sm'>
        <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6'>
          <div className='flex min-w-0 items-center gap-3'>
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
          </div>

          <div className='flex items-center gap-2'>
            <LanguageSwitcher compact />
            <Link
              href='/login'
              className='text-sm font-medium text-primary transition hover:text-primary/80 hover:underline'
            >
              {dictionary.login.switchToUser}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Card Area */}
      <div className='relative z-10 flex flex-1 items-center justify-center py-8'>
        <div className='w-full max-w-md rounded-3xl border border-border/60 bg-white p-8 shadow-2xl'>
          <div className='mb-8 text-center'>
            <div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary'>
              <Shield className='size-6' />
            </div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              {dictionary.login.welcomeBackAdmin}
            </h1>
            <p className='mt-2 text-sm text-muted-foreground'>
              {dictionary.login.adminPortal}
            </p>
          </div>

          <form onSubmit={submit} className='space-y-4'>
            <div>
              <label className='mb-1 block text-sm font-medium text-foreground'>
                {dictionary.common.email}
              </label>
              <Input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='admin@igeo.local'
                autoComplete='email'
                required
              />
            </div>
            <div>
              <label className='mb-1 block text-sm font-medium text-foreground'>
                {dictionary.common.password}
              </label>
              <Input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='••••••••'
                autoComplete='current-password'
                required
              />
            </div>

            {error ? (
              <div className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2'>
                <span className='size-1.5 shrink-0 rounded-full bg-red-500' />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type='submit'
              disabled={signing}
              className='w-full bg-primary hover:bg-primary/95 text-white font-semibold shadow-lg shadow-primary/25 transition-all duration-200 h-10 rounded-xl'
            >
              {signing ? dictionary.common.loading : dictionary.common.login}
            </Button>
          </form>

          <div className='mt-8 pt-6 border-t border-slate-100 text-center'>
            <Link
              href='/login'
              className='inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors duration-200 group'
            >
              <ArrowLeft className='size-4 transition-transform duration-200 group-hover:-translate-x-1' />
              {dictionary.login.switchToUser}
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className='relative z-10 py-6 text-center text-xs text-muted-foreground border-t border-slate-100'>
        <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
      </footer>
    </div>
  );
}
