import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AppShell } from '@/components/layout/app-shell';
import {
  parseStoredSessionValue,
  parseStoredUserValue,
  SESSION_COOKIE_NAME,
  USER_COOKIE_NAME,
} from '@/features/auth/storage';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE_NAME } from '@/features/i18n/config';
import { I18nProvider } from '@/features/i18n/provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Geography & Environment Challenge (GEC)',
    template: '%s · GEC',
  },
  description:
    'Geography & Environment Challenge (GEC) — selection and training for the International Geography Olympiad (iGeo).',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const initialLocale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const userCookieRaw = cookieStore.get(USER_COOKIE_NAME)?.value;
  const initialSession = parseStoredSessionValue(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
    userCookieRaw,
  );
  const initialUser = parseStoredUserValue(userCookieRaw);

  return (
    <html lang={initialLocale}>
      <body>
        <I18nProvider initialLocale={initialLocale}>
          <AppShell initialSession={initialSession} initialUser={initialUser}>
            {children}
          </AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
