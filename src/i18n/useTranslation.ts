'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

type TranslationData = Record<string, unknown>;

// ========== Translation Cache ==========
const translationCache = new Map<string, TranslationData>();

// ========== Load Translation ==========
async function loadTranslation(lang: string): Promise<TranslationData> {
  if (translationCache.has(lang)) {
    return translationCache.get(lang)!;
  }

  try {
    const mod = await import(`./translations/${lang}.json`);
    const data = mod.default as TranslationData;
    translationCache.set(lang, data);
    return data;
  } catch {
    // Fallback to Arabic
    if (lang !== 'ar') {
      return loadTranslation('ar');
    }
    return {};
  }
}

// ========== Nested Key Getter ==========
function getNestedValue(obj: TranslationData, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return key path as fallback
    }
  }
  return typeof current === 'string' ? current : path;
}

// ========== useTranslation Hook ==========
export function useTranslation() {
  const [lang, setLangState] = useState('ar');
  const [translations, setTranslations] = useState<TranslationData>({});
  const [isReady, setIsReady] = useState(false);
  const mountedRef = useRef(true);

  // Load saved language from localStorage on mount
  useEffect(() => {
    mountedRef.current = true;

    const savedLang = localStorage.getItem('iwan_language');
    if (savedLang) {
      setLangState(savedLang);
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load translations when language changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsReady(false);
      const data = await loadTranslation(lang);
      if (!cancelled && mountedRef.current) {
        setTranslations(data);
        setIsReady(true);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const setLanguage = useCallback(async (newLang: string) => {
    setLangState(newLang);
    try {
      localStorage.setItem('iwan_language', newLang);
    } catch {
      // silent
    }
  }, []);

  // Main translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations, key);

      // Replace parameters like {current}, {total} etc.
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }

      return value;
    },
    [translations]
  );

  // Get a section of translations (for arrays like interestsList)
  const tSection = useCallback(
    (section: string): unknown[] => {
      const value = getNestedValue(translations, section);
      if (Array.isArray(value)) return value;
      return [];
    },
    [translations]
  );

  return { t, tSection, lang, setLanguage, isReady };
}

export default useTranslation;
