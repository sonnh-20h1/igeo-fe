import { Be_Vietnam_Pro, Fraunces, Inter, Source_Sans_3 } from 'next/font/google';

/**
 * Always include `vietnamese` so diacritics (ă â ê ô ơ ư ạ …) load correctly.
 * CSS @import from Google Fonts often only ships the latin slice and falls back
 * to system fonts inconsistently — causing mixed / broken Vietnamese glyphs.
 */
export const fontSans = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

export const fontHomeBody = Source_Sans_3({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-source-sans',
  display: 'swap',
});

export const fontHomeDisplay = Fraunces({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
});

/** Vietnamese-first UI font (fallback companion). */
export const fontVi = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
  display: 'swap',
});
