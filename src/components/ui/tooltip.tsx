import * as React from 'react';

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className='group relative inline-block'>
      {children}
      <div className='pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 scale-95 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-100 group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap'>
        {content}
        <div className='absolute top-full left-1/2 -mt-1 -translate-x-1/2 border-4 border-transparent border-t-slate-900' />
      </div>
    </div>
  );
}
