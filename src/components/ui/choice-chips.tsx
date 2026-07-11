'use client';

import { cn } from '@/lib/utils';

type ChoiceChipsProps<T extends string> = {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: ChoiceChipsProps<T>) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? <p className='text-sm font-medium'>{label}</p> : null}
      <div className='flex flex-wrap gap-2' role='radiogroup' aria-label={label}>
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type='button'
              role='radio'
              aria-checked={active}
              onClick={() => onChange(option)}
              className={cn(
                'rounded-full border px-3 py-2 text-sm font-medium transition',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background hover:border-primary/35 hover:bg-muted/40',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
