import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { copy, type Locale } from './copy.ts'

const STORAGE_KEY = 'jj-locale'

type LocaleValue = {
  locale: Locale
  toggleLocale: () => void
  t: (typeof copy)[Locale]
}

const LocaleContext = createContext<LocaleValue | null>(null)

function readLocale(): Locale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'zh' ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readLocale)

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-Hans' : 'en'
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* private mode */
    }
  }, [locale])

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      toggleLocale: () => setLocale((current) => (current === 'en' ? 'zh' : 'en')),
      t: copy[locale],
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}
