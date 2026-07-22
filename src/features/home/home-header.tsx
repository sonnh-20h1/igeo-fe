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
  /** Light hero: navy text on cream background when not scrolled */
  light?: boolean;
  /** Logo / brand link target */
  brandHref?: string;
  /** Prefix for section anchors, e.g. "/" → "/#about" */
  sectionBase?: string;
};

export function HomeHeader({
  hideAuth = false,
  solid = false,
  light = false,
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
  const onLightHero = light && !scrolled && !solid;
  const onLightScrolled = light && scrolled && !solid;

  return (
    <header
      className={cn(
        'home-header fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,border-color] duration-300',
        onLightHero
          ? 'home-header--light home-header--light-top border-b border-transparent'
          : onLightScrolled
            ? 'home-header--light home-header--light-scrolled border-b'
            : scrolled || solid
              ? 'border-b border-white/20 bg-[#022648]/92 shadow-lg shadow-[#022648]/20 backdrop-blur-md'
              : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6'>
        <BrandTag
          href={brandHref}
          className={cn(
            'flex min-w-0 items-center gap-3',
            onLightHero || onLightScrolled ? 'text-[#022648]' : 'text-white',
          )}
        >
          <Image
            src='/images/logo_v2.png'
            alt={home.brandShort}
            className='shrink-0 object-contain'
            style={{ width: 'auto', height: '40px' }}
            width={1070}
            height={664}
            priority
          />
          <span className='home-header-brand-text truncate font-[family-name:var(--font-home-display)]'>
            <span className='home-header-brand-irecs'>IRECS -</span>{' '}
            <span className='home-header-brand-gec'>GEC</span>
          </span>
        </BrandTag>

        <nav className='hidden items-center gap-1 lg:flex'>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={sectionHref(link.href)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                onLightHero || onLightScrolled
                  ? 'text-[#022648]/80 hover:bg-[#022648]/5 hover:text-[#022648]'
                  : 'text-white/80 hover:bg-white/10 hover:text-white',
              )}
            >
              {home.nav[link.key]}
            </a>
          ))}
        </nav>

        <div className='flex items-center gap-2'>
          <div
            className={cn(
              'home-lang-switcher',
              (onLightHero || onLightScrolled) && 'home-lang-switcher--light',
            )}
          >
            <LanguageSwitcher compact className='!h-full' />
          </div>
          {!hideAuth && ready ? (
            <Button
              asChild
              size='sm'
              variant={onLightHero || onLightScrolled ? 'default' : 'secondary'}
              className={cn(
                'hidden sm:inline-flex',
                (onLightHero || onLightScrolled) &&
                  'bg-[#E0C389] text-[#022648] hover:bg-[#ebd4a8]',
              )}
            >
              <Link href={authHref}>{authLabel}</Link>
            </Button>
          ) : null}
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className={cn(
              'lg:hidden',
              onLightHero || onLightScrolled
                ? 'text-[#022648] hover:bg-[#022648]/5'
                : 'text-white hover:bg-white/10',
            )}
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
