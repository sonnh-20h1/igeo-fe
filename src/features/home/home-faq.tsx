'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type FaqItem = {
  q: string;
  a: string;
};

export function HomeFaq({ items }: { items: readonly FaqItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <div className='divide-y divide-[#022648]/12 border-y border-[#022648]/12'>
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.q}>
            <button
              type='button'
              className='flex w-full items-start justify-between gap-4 py-5 text-left'
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <span className='font-[family-name:var(--font-home-display)] text-lg text-[#022648] sm:text-xl'>
                {item.q}
              </span>
              <ChevronDown
                className={cn(
                  'mt-1 size-5 shrink-0 text-[#022648]/70 transition-transform duration-300',
                  open && 'rotate-180',
                )}
              />
            </button>
            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className='overflow-hidden'>
                <p className='pb-5 text-base leading-relaxed text-[#022648]/78'>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
