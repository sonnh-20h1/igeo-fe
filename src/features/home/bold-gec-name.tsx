import { Fragment, type ReactNode } from 'react';

const GEC_NAME_RE =
  /(Geography & Environment Challenge \(GEC\)|Cuộc thi Địa lý và Môi trường \(GEC\))/g;

const GEC_NAMES = new Set([
  'Geography & Environment Challenge (GEC)',
  'Cuộc thi Địa lý và Môi trường (GEC)',
]);

/** Bold the full GEC programme name wherever it appears in copy. */
export function boldGecName(text: string): ReactNode {
  const parts = text.split(GEC_NAME_RE);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (GEC_NAMES.has(part)) {
      return (
        <strong key={index} className='home-gec-name'>
          {part}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
