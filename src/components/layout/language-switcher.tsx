'use client';

import type { ReactNode } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/features/i18n/provider';
import type { Locale } from '@/features/i18n/config';

export function LanguageSwitcher({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  const { locale, setLocale, dictionary } = useI18n();

  const icons: Record<Locale, ReactNode> = {
    vi: <span aria-hidden>🇻🇳</span>,
    en: <span aria-hidden>🇬🇧</span>,
  };

  return (
    <div
      className={`inline-flex items-center ${
        compact
          ? 'gap-0.5 rounded-full px-0.5 py-0.5'
          : 'gap-1 rounded-full border border-border/70 bg-background/80 p-1'
      } ${className}`}
      aria-label={dictionary.locale.label}
    >
      {!compact ? <Languages className='ml-1 size-4 text-muted-foreground' /> : null}
      {(['vi', 'en'] as Locale[]).map((item) => (
        <Button
          key={item}
          type='button'
          size='sm'
          variant={locale === item ? 'default' : 'ghost'}
          className={
            compact
              ? `h-7 min-w-7 rounded-full px-1.5 text-[11px] ${
                  locale === item ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`
              : 'h-8 rounded-full px-3 text-xs'
          }
          onClick={() => setLocale(item)}
        >
          <span className='lg-item'>{icons[item]}</span>
          <span className='sr-only'>{dictionary.locale[item]}</span>
        </Button>
      ))}
    </div>
  );
}
