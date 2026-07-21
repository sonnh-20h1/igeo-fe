import { Lora } from 'next/font/google';

/**
 * Always include `vietnamese` so diacritics (ă â ê ô ơ ư ạ …) load correctly.
 * CSS @import from Google Fonts often only ships the latin slice and falls back
 * to system fonts inconsistently — causing mixed / broken Vietnamese glyphs.
 */
export const fontSans = Lora({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lora',
  display: 'swap',
});
