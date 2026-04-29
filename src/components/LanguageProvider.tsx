'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { isRTL } from '@/i18n/languages';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { lang, isReady } = useTranslation();

  useEffect(() => {
    if (!isReady) return;

    const html = document.documentElement;
    const dir = isRTL(lang) ? 'rtl' : 'ltr';

    html.setAttribute('lang', lang);
    html.setAttribute('dir', dir);
    document.body.setAttribute('dir', dir);
  }, [lang, isReady]);

  // Prevent flash of wrong direction
  if (!isReady) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
}
