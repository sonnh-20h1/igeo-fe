'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import AuthHeader from '@/components/layout/auth-header';
import { useI18n } from '@/features/i18n/provider';

const HERO_IMG =
  'https://cdn.sanity.io/images/599r6htc/regionalized/cc0c027ecf57ebdfe1d51aa4a2dd5093bb7d00e7-2400x2400.png?w=2400&h=2400&q=75&fit=max&auto=format';

export default function LoginPage() {
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
      await signIn({ email, password }, 'USER');
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : dictionary.login.loginFailed;
      setError(message);
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-[#f2e5d2] via-[#f8f1e6] to-white px-4 pb-8 pt-24'>
      <AuthHeader />
      <div className='flex min-h-[calc(100vh-6rem)] items-center justify-center'>
        <div className='w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl grid grid-cols-1 md:grid-cols-2'>
          <div
            className='hidden bg-cover bg-center md:block'
            style={{ backgroundImage: `url(${HERO_IMG})` }}
          >
            <div className='h-full w-full bg-gradient-to-b from-transparent to-white/80' />
          </div>

          <div className='p-8 md:p-12'>
            <div className='mb-6'>
              <h1 className='text-2xl font-bold'>{dictionary.login.welcomeBack}</h1>
              <p className='mt-1 text-sm text-muted-foreground'>
                {dictionary.login.continueToDashboard}
              </p>
            </div>

            <form onSubmit={submit} className='space-y-4'>
              <div>
                <label className='mb-1 block text-sm'>{dictionary.common.email}</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='user@igeo.local'
                  autoComplete='email'
                />
              </div>
              <div>
                <label className='mb-1 block text-sm'>{dictionary.common.password}</label>
                <Input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  autoComplete='current-password'
                />
              </div>
              {error ? <div className='text-sm text-red-600'>{error}</div> : null}
              <Button type='submit' disabled={signing}>
                {signing ? dictionary.common.loading : dictionary.common.login}
              </Button>
            </form>

            <div className='mt-6 text-center text-sm space-y-3'>
              <p className='text-muted-foreground'>{dictionary.login.accountByAdmin}</p>
              <div className='pt-3 border-t border-slate-100'>
                <Link
                  href='/login/admin'
                  className='text-xs font-semibold text-muted-foreground hover:text-primary transition-colors duration-200'
                >
                  {dictionary.login.switchToAdmin}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
