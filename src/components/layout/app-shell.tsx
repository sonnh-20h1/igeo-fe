'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { NotificationProvider } from '@/components/ui/notification';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import type { AuthSession, Role, User } from '@/features/auth/types';
import { hasStoredAuth } from '@/features/auth/storage';
import { isAdminRole } from '@/features/auth/types';
import { useI18n } from '@/features/i18n/provider';
import { cn, formatCompactDate } from '@/lib/utils';
import { AuthProvider, useAuth } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';
import { APP_NAME, APP_VERSION_LABEL } from '@/lib/app-config';

function getNavItems(
  role: Role | undefined,
  dictionary: ReturnType<typeof useI18n>['dictionary'],
) {
  if (isAdminRole(role)) {
    return [
      { href: '/admin/dashboard', label: dictionary.shell.navDashboard, icon: LayoutDashboard },
      { href: '/admin/users', label: dictionary.shell.navUsers, icon: Users },
      { href: '/admin/questions', label: dictionary.shell.navQuestions, icon: BookOpen },
      { href: '/admin/exams', label: dictionary.shell.navExams, icon: ClipboardList },
      { href: '/admin/exam-periods', label: dictionary.shell.navExamPeriods, icon: CalendarRange },
      { href: '/admin/contacts', label: dictionary.shell.navContacts, icon: Mail },
    ];
  }

  return [];
}

function getShellCopy(
  role: Role | undefined,
  dictionary: ReturnType<typeof useI18n>['dictionary'],
) {
  if (isAdminRole(role)) {
    return {
      sidebarLabel: dictionary.shell.sidebarAdmin,
      sidebarTitle: dictionary.shell.adminHub,
      headerEyebrow: dictionary.shell.adminSpace,
      headerTitle: dictionary.shell.adminHeaderTitle,
    };
  }

  return {
    sidebarLabel: dictionary.shell.sidebarUser,
    sidebarTitle: dictionary.shell.userHub,
    headerEyebrow: dictionary.shell.userSpace,
    headerTitle: dictionary.shell.userHeaderTitle,
  };
}

function getRoleLabel(role: Role | undefined, dictionary: ReturnType<typeof useI18n>['dictionary']) {
  if (role === 'ADMIN') return dictionary.common.admin;
  if (role === 'USER') return dictionary.common.user;
  return dictionary.common.user;
}

function getUserDisplayName(user?: { fullName?: string | null; name?: string | null } | null) {
  return user?.fullName || user?.name || 'User';
}

function getUserInitials(user?: { fullName?: string | null; name?: string | null } | null) {
  const displayName = getUserDisplayName(user);
  const parts = displayName
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return 'IG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function SidebarContent() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { dictionary } = useI18n();
  const navItems = getNavItems(user?.role, dictionary);
  const shellCopy = getShellCopy(user?.role, dictionary);
  const roleLabel = getRoleLabel(user?.role, dictionary);

  return (
    <div className='flex h-full flex-col'>
      <div className='border-b border-[var(--sidebar-border)] px-6 py-6'>
        <div className='space-y-2'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-2xl'>
              <Image
                src='/images/logo_v4.svg'
                alt={APP_NAME}
                className='object-contain'
                style={{ width: 'auto', height: '40px' }}
                width={1023}
                height={1024}
              />
            </div>
            <p className='font-mono text-xs uppercase tracking-[0.24em] text-white/70'>
              {shellCopy.sidebarLabel}
            </p>
          </div>
          <h1 className='text-lg font-semibold text-white'>{shellCopy.sidebarTitle}</h1>
        </div>
      </div>
      <nav className='flex-1 space-y-2 px-4 py-6 text-white'>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                active
                  ? 'bg-[var(--sidebar-muted)] text-[var(--sidebar)] shadow-lg'
                  : 'text-sidebar-foreground/82 hover:bg-white/8 hover:text-white',
              )}
            >
              <Icon className='size-4' />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className='border-t text-white border-[var(--sidebar-border)] px-6 py-5 text-sm text-sidebar-foreground/80'>
        <p className='font-semibold'>{getUserDisplayName(user)}</p>
        <p className='mt-1 text-xs uppercase tracking-[0.2em] text-white/60'>{roleLabel}</p>
        <p className='mt-1 text-sidebar-muted'>{user?.email || 'admin@irecs.local'}</p>
        <div className='mt-4 lg:hidden'>
          <LanguageSwitcher compact className='border-white/15 bg-white/10' />
        </div>
      </div>
    </div>
  );
}

export function AppShellInner({ children }: { children: React.ReactNode }) {
  const { dictionary, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { ready, user, signOut } = useAuth();
  // Server snapshot must be false so SSR/client first paint match.
  const clientHasStoredAuth = React.useSyncExternalStore(
    () => () => {},
    () => hasStoredAuth(),
    () => false,
  );
  const [today, setToday] = React.useState('');
  React.useEffect(() => {
    setToday(formatCompactDate(new Date(), locale));
  }, [locale]);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement | null>(null);
  const displayName = getUserDisplayName(user);
  const roleLabel = getRoleLabel(user?.role, dictionary);
  const userInitials = getUserInitials(user);
  const shellCopy = getShellCopy(user?.role, dictionary);
  const isAdmin = isAdminRole(user?.role);

  const isPublicRoute =
    pathname === '/' ||
    Boolean(pathname?.startsWith('/login')) ||
    Boolean(pathname?.startsWith('/exams')) ||
    Boolean(pathname?.startsWith('/attempts'));
  // /attempts/:id only — hide chrome while taking an exam (not list or result).
  const isExamTakingRoute = Boolean(pathname && /^\/attempts\/[^/]+$/.test(pathname));

  React.useEffect(() => {
    if (ready && !user && !clientHasStoredAuth && pathname && !isPublicRoute) {
      router.push('/login/admin');
      return;
    }

    if (!ready || !user || !pathname) return;

    // JWT login is admin-only; keep public exam routes open for candidates.
    if (!isAdmin) {
      if (!isPublicRoute) {
        router.replace('/exams');
      }
      return;
    }

    if (pathname === '/dashboard' || pathname.startsWith('/profile')) {
      router.replace('/admin/dashboard');
    }
  }, [clientHasStoredAuth, isAdmin, isPublicRoute, ready, user, pathname, router]);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (isPublicRoute) {
    return <div className='min-h-screen'>{children}</div>;
  }

  if (!ready) {
    return <div className='min-h-screen bg-background' />;
  }

  if (!user && clientHasStoredAuth) {
    return <div className='min-h-screen bg-background' />;
  }

  if (user && isAdmin && (pathname === '/dashboard' || pathname?.startsWith('/profile'))) {
    return <div className='min-h-screen bg-background' />;
  }

  if (user && !isAdmin && !isPublicRoute) {
    return <div className='min-h-screen bg-background' />;
  }

  if (isExamTakingRoute) {
    return <div className='min-h-screen bg-background'>{children}</div>;
  }

  return (
    <div className='min-h-screen lg:grid lg:grid-cols-[280px_1fr]'>
      <aside className='sticky top-0 hidden h-screen overflow-y-auto border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:block'>
        <SidebarContent />
      </aside>
      <div className='flex min-h-screen min-w-0 flex-col'>
        <header className='sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur'>
          <div className='flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-10'>
            <div className='flex min-w-0 items-center gap-2.5 sm:gap-3'>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant='outline' size='icon' className='lg:hidden'>
                    <Menu className='size-5' />
                    <span className='sr-only'>Open navigation</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className='left-0 top-0 h-screen max-w-[320px] translate-x-0 translate-y-0 rounded-none border-0 bg-[var(--sidebar)] p-0'>
                  <SidebarContent />
                </DialogContent>
              </Dialog>
              <div className='min-w-0'>
                <p className='font-mono text-xs uppercase tracking-[0.28em] text-primary'>
                  {shellCopy.headerEyebrow}
                </p>
                <h2 className='truncate text-sm font-semibold sm:text-xl lg:text-2xl'>
                  {shellCopy.headerTitle}
                </h2>
              </div>
            </div>
            <div className='hidden rounded-2xl border border-border/80 bg-card px-4 py-3 text-right sm:block'>
              <p className='font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground'>
                {dictionary.shell.today}
              </p>
              <p className='mt-1 text-sm font-medium capitalize' suppressHydrationWarning>
                {today || '\u00a0'}
              </p>
            </div>
            <div className='relative ml-auto' ref={accountMenuRef}>
              <LanguageSwitcher compact />
              <Button
                variant='ghost'
                className='h-auto rounded-2xl px-2 py-2 hover:bg-muted/70'
                onClick={() => setAccountMenuOpen((current) => !current)}
              >
                <div className='flex items-center gap-3'>
                  <div className='flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground sm:size-10 sm:text-sm'>
                    {userInitials}
                  </div>
                  <div className='hidden min-w-0 text-left sm:block'>
                    <p className='text-xs text-muted-foreground'>{dictionary.shell.accountMenu}</p>
                    <p className='truncate text-sm font-semibold'>{displayName}</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'size-4 text-muted-foreground transition-transform',
                      accountMenuOpen && 'rotate-180',
                    )}
                  />
                </div>
              </Button>

              {accountMenuOpen ? (
                <div className='absolute right-0 top-[calc(100%+0.75rem)] z-40 w-64 rounded-2xl border border-border/80 bg-card p-2 shadow-xl'>
                  <div className='rounded-xl px-3 py-3'>
                    <p className='text-sm font-semibold'>{displayName}</p>
                    <p className='mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground'>
                      {roleLabel}
                    </p>
                    <p className='mt-2 break-all text-sm text-muted-foreground'>
                      {user?.email || 'admin@irecs.local'}
                    </p>
                  </div>
                  <div className='mt-1 border-t border-border/70 pt-2'>
                    <button
                      type='button'
                      className='flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10'
                      onClick={() => {
                        setAccountMenuOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut className='size-4' />
                      {dictionary.common.logout}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className='flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8'>{children}</main>
        <footer className='relative border-t border-border/60 px-4 py-3 sm:px-6 lg:px-10'>
          <div className='pointer-events-none absolute bottom-3 right-4 text-[11px] text-muted-foreground/80 sm:right-6 lg:right-10'>
            {APP_VERSION_LABEL}
          </div>
        </footer>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  initialSession = null,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialSession?: AuthSession | null;
  initialUser?: User | null;
}) {
  return (
    <AuthProvider initialSession={initialSession} initialUser={initialUser}>
      <NotificationProvider>
        <AppShellInner>{children}</AppShellInner>
      </NotificationProvider>
    </AuthProvider>
  );
}
