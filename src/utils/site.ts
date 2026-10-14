import defaultLogo from '@/assets/svg-icon/logo.svg';

/** Map backend image defaults to assets available in this frontend. */
export function resolveSiteImage(code: 'SITE_LOGO' | 'SITE_FAVICON', value?: string | null) {
  const legacyDefault = code === 'SITE_LOGO' ? '/logo.svg' : '/favicon.ico';
  const defaultImage = code === 'SITE_LOGO' ? defaultLogo : `${import.meta.env.BASE_URL}favicon.svg`;
  return !value || value === legacyDefault ? defaultImage : value;
}
