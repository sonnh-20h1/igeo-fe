import packageJson from '../../package.json';

const PACKAGE_VERSION = packageJson.version?.trim() || '0.1.0';
const DEFAULT_BUILD_VERSION = process.env.NODE_ENV === 'production' ? 'prod-local' : 'dev-local';

function ensureVersionPrefix(version: string) {
  return version.startsWith('v') ? version : `v${version}`;
}

export const APP_BUILD_VERSION =
  process.env.NEXT_PUBLIC_APP_BUILD_VERSION?.trim() || DEFAULT_BUILD_VERSION;

export const APP_VERSION_LABEL = ensureVersionPrefix(PACKAGE_VERSION);

export const APP_NAME = 'Igeo';

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@igeo.local';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://igeo.local';
