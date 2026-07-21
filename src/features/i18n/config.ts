export const LOCALES = ['vi', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'vi';

export const LOCALE_COOKIE_NAME = 'irecs_locale';

/** Backend nestjs-i18n languages: `vn` | `en` */
export type ApiLang = 'vn' | 'en';

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'vi' || value === 'en';
}

export function toApiLang(locale: Locale | string | null | undefined): ApiLang {
  return locale === 'en' ? 'en' : 'vn';
}

let currentLocale: Locale = DEFAULT_LOCALE;

export function setCurrentLocale(locale: Locale) {
  currentLocale = locale;
}

export function getCurrentLocale(): Locale {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`));
    const fromCookie = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (isLocale(fromCookie)) {
      return fromCookie;
    }
  }
  return currentLocale;
}

export function getApiLang(): ApiLang {
  return toApiLang(getCurrentLocale());
}
