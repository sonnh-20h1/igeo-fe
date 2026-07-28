import { Fragment, type ReactNode } from 'react';

const GEC_NAME_RE =
  /(Cuộc thi Địa lý và Môi trường \(GEC\)|Địa lý và Môi trường \(GEC\)|Geography and Environment Competition \(GEC\)|Geography & Environment Challenge \(GEC\)|Geography & Environment Challenge)/g;

const GEC_NAMES = new Set([
  'Cuộc thi Địa lý và Môi trường (GEC)',
  'Địa lý và Môi trường (GEC)',
  'Geography and Environment Competition (GEC)',
  'Geography & Environment Challenge (GEC)',
  'Geography & Environment Challenge',
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
