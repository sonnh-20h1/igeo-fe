import type { Metadata } from 'next';
import { HomePage } from '@/features/home/home-page';

export const metadata: Metadata = {
  title: 'Geography & Environment Challenge (GEC)',
  description:
    'GEC is an academic selection and training programme for students aiming for the International Geography Olympiad (iGeo).',
};

export default function Page() {
  return <HomePage />;
}
