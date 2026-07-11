export const LOCALES = ['vi', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'vi';

export const LOCALE_COOKIE_NAME = 'igeo_locale';

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'vi' || value === 'en';
}
