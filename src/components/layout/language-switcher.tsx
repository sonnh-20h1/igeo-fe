'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/features/i18n/provider';
import type { Locale } from '@/features/i18n/config';
import { cn } from '@/lib/utils';

const LOCALE_SHORT: Record<Locale, string> = {
  vi: 'VN',
  en: 'EN',
};

export function LanguageSwitcher({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  const { locale, setLocale, dictionary } = useI18n();

  return (
    <div
      className={cn(
        'inline-flex items-center',
        compact
          ? 'h-8 gap-0.5 rounded-full px-0.5 sm:h-9'
          : 'h-8 gap-1 rounded-full border border-border/70 bg-background/80 p-0.5 sm:h-9',
        className,
      )}
      aria-label={dictionary.locale.label}
    >
      {!compact ? <Languages className='ml-1 size-3.5 text-muted-foreground' /> : null}
      {(['vi', 'en'] as Locale[]).map((item) => (
        <Button
          key={item}
          type='button'
          size='sm'
          variant={locale === item ? 'default' : 'ghost'}
          className={cn(
            'h-7 rounded-full px-2 text-[10px] font-bold tracking-wide sm:h-8 sm:px-2.5',
            compact &&
              (locale === item
                ? 'shadow-sm'
                : 'text-muted-foreground hover:text-foreground'),
          )}
          onClick={() => setLocale(item)}
          aria-label={dictionary.locale[item]}
          aria-pressed={locale === item}
        >
          {LOCALE_SHORT[item]}
        </Button>
      ))}
    </div>
  );
}
