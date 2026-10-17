import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { copy, type Locale } from './copy.ts'
import { createDefaultLocaleController } from './default-locale.ts'

type LocaleValue = {
  locale: Locale
  toggleLocale: () => void
  t: (typeof copy)[Locale]
}

const LocaleContext = createContext<LocaleValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => createDefaultLocaleController())
  const [locale, setLocale] = useState<Locale>(() => controller.getLocale())

  useEffect(() => {
    const activation = controller.start(setLocale)
    return activation.cancel
  }, [controller])

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-Hans' : 'en'
  }, [locale])

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      toggleLocale: () => controller.choose(controller.getLocale() === 'en' ? 'zh' : 'en'),
      t: copy[locale],
    }),
    [locale, controller],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}
