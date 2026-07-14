'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/features/i18n/provider';
import { useAuth } from '@/lib/auth';
import { isAdminRole } from '@/features/auth/types';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#about', key: 'about' as const },
  { href: '#why', key: 'why' as const },
  { href: '#igeo', key: 'igeo' as const },
  { href: '#structure', key: 'structure' as const },
  { href: '#faq', key: 'faq' as const },
  { href: '#contact', key: 'contact' as const },
];

type HomeHeaderProps = {
  /** Hide login / dashboard button */
  hideAuth?: boolean;
  /** Always use solid navy bar (for non-hero pages) */
  solid?: boolean;
  /** Logo / brand link target */
  brandHref?: string;
  /** Prefix for section anchors, e.g. "/" → "/#about" */
  sectionBase?: string;
};

export function HomeHeader({
  hideAuth = false,
  solid = false,
  brandHref = '#top',
  sectionBase = '',
}: HomeHeaderProps) {
  const { dictionary } = useI18n();
  const { user, ready } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(solid);
  const home = dictionary.home;

  React.useEffect(() => {
    if (solid) {
      setScrolled(true);
      return;
    }
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [solid]);

  const authHref = user && isAdminRole(user.role) ? '/admin/dashboard' : '/exams';
  const authLabel =
    user && isAdminRole(user.role) ? home.nav.dashboard : home.nav.takeExam;

  function sectionHref(hash: string) {
    if (!sectionBase) return hash;
    return `${sectionBase}${hash}`;
  }

  const BrandTag = brandHref.startsWith('#') ? 'a' : Link;

  return (
    <header
      className={cn(
        'home-header fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,border-color] duration-300',
        scrolled || solid
          ? 'border-b border-white/20 bg-[#022648]/92 shadow-lg shadow-[#022648]/20 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6'>
        <BrandTag href={brandHref} className='flex min-w-0 items-center gap-3 text-white'>
          <Image
            src='/images/logo-light.png'
            alt={home.brandShort}
            className='shrink-0 object-contain'
            style={{ width: 'auto', height: '40px' }}
            width={1023}
            height={1024}
            priority
          />
          <span className='truncate font-[family-name:var(--font-home-display)] text-lg tracking-tight sm:text-xl'>
            {home.brandShort}
          </span>
        </BrandTag>

        <nav className='hidden items-center gap-1 lg:flex'>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={sectionHref(link.href)}
              className='rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white'
            >
              {home.nav[link.key]}
            </a>
          ))}
        </nav>

        <div className='flex items-center gap-2'>
          <div className='home-lang-switcher'>
            <LanguageSwitcher compact className='!h-full' />
          </div>
          {!hideAuth && ready ? (
            <Button asChild size='sm' variant='secondary' className='hidden sm:inline-flex'>
              <Link href={authHref}>{authLabel}</Link>
            </Button>
          ) : null}
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='text-white hover:bg-white/10 lg:hidden'
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-label={open ? home.nav.closeMenu : home.nav.openMenu}
          >
            {open ? <X className='size-5' /> : <Menu className='size-5' />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className='border-t border-white/15 bg-[#022648] px-4 py-4 lg:hidden'>
          <nav className='flex flex-col gap-1'>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={sectionHref(link.href)}
                className='rounded-lg px-3 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10'
                onClick={() => setOpen(false)}
              >
                {home.nav[link.key]}
              </a>
            ))}
            {!hideAuth && ready ? (
              <Link
                href={authHref}
                className='mt-2 rounded-lg bg-[#E0C389] px-3 py-3 text-center text-sm font-semibold text-[#022648]'
                onClick={() => setOpen(false)}
              >
                {authLabel}
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
