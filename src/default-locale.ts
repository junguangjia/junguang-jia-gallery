import type { Locale } from './copy.ts'

export const LOCALE_CHOICE_KEY = 'jj-locale-choice'
export const COUNTRY_CACHE_KEY = 'jj-country-cache'
export const TRACE_ENDPOINT = 'https://www.cloudflare.com/cdn-cgi/trace'
export const COUNTRY_CACHE_TTL_MS = 60 * 60 * 1000
export const LOOKUP_TIMEOUT_MS = 1_800
const LEGACY_LOCALE_KEY = 'jj-locale'

type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'> | undefined
type Options = {
  localStorage?: StorageAccess
  sessionStorage?: StorageAccess
  fetch?: typeof globalThis.fetch
  now?: () => number
  timeoutMs?: number
}
type Activation = {
  active: boolean
  onChange: (locale: Locale) => void
  cancelRequest?: () => void
}

function readStorage(storage: StorageAccess, key: string) {
  try { return storage()?.getItem(key) ?? null } catch { return null }
}

function writeStorage(storage: StorageAccess, key: string, value: string) {
  try { storage()?.setItem(key, value) } catch { /* Preferences still work in memory. */ }
}

function isCountry(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value) && value !== 'XX' && value !== 'ZZ'
}

export function parseTraceCountry(trace: string): string | null {
  const values = trace.split(/\r?\n/).filter((line) => line.startsWith('loc='))
  if (values.length !== 1) return null
  const country = values[0].slice(4)
  return isCountry(country) ? country : null
}

function cachedCountry(storage: StorageAccess, now: number): string | null {
  try {
    const cache = JSON.parse(readStorage(storage, COUNTRY_CACHE_KEY) ?? 'null')
    if (
      isCountry(cache?.country) && typeof cache?.at === 'number' && Number.isFinite(cache.at) &&
      cache.at <= now && now - cache.at < COUNTRY_CACHE_TTL_MS
    ) return cache.country
  } catch { /* Invalid or unavailable cache is a cache miss. */ }
  return null
}

/** Country chooses a default only; an explicit visitor choice always wins. */
export function createDefaultLocaleController(options: Options = {}) {
  const localStorage = options.localStorage ?? (() => typeof window === 'undefined' ? undefined : window.localStorage)
  const sessionStorage = options.sessionStorage ?? (() => typeof window === 'undefined' ? undefined : window.sessionStorage)
  const fetchImpl = options.fetch ?? ((input, init) => globalThis.fetch(input, init))
  const now = options.now ?? Date.now
  const timeoutMs = Math.min(LOOKUP_TIMEOUT_MS, Math.max(1, options.timeoutMs ?? LOOKUP_TIMEOUT_MS))
  const storedChoice = readStorage(localStorage, LOCALE_CHOICE_KEY)
  const explicitChoice: Locale | null = storedChoice === 'en' || storedChoice === 'zh' ? storedChoice : null
  // The former provider wrote "en" automatically, so it cannot prove a choice.
  const legacyChoice: Locale | null = !explicitChoice && readStorage(localStorage, LEGACY_LOCALE_KEY) === 'zh' ? 'zh' : null
  const initialCountry = cachedCountry(sessionStorage, now())
  let chosen = explicitChoice ?? legacyChoice
  let locale: Locale = chosen ?? (initialCountry === 'CN' ? 'zh' : 'en')
  let resolved = initialCountry !== null
  let activation: Activation | null = null

  function choose(next: Locale) {
    chosen = next
    resolved = true
    activation?.cancelRequest?.()
    locale = next
    writeStorage(localStorage, LOCALE_CHOICE_KEY, next)
    if (activation?.active) activation.onChange(locale)
  }

  function lookup(current: Activation) {
    return new Promise<void>((settle) => {
      const abort = new AbortController()
      let finished = false
      let timer: ReturnType<typeof setTimeout> | undefined
      const finish = (country: string | null, cancelled = false) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        if (!cancelled && activation === current && current.active && !chosen) {
          resolved = true
          if (country) {
            // Never retain the trace response, IP address, or other trace fields.
            writeStorage(sessionStorage, COUNTRY_CACHE_KEY, JSON.stringify({ country, at: now() }))
            locale = country === 'CN' ? 'zh' : 'en'
            current.onChange(locale)
          }
        }
        settle()
      }
      current.cancelRequest = () => {
        abort.abort()
        // Effect cleanup is not a failed lookup and must not poison a replay.
        finish(null, true)
      }
      timer = setTimeout(() => {
        abort.abort()
        finish(null)
      }, timeoutMs)
      void (async () => {
        try {
          const response = await fetchImpl(TRACE_ENDPOINT, {
            signal: abort.signal,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            cache: 'no-store',
          })
          if (finished) return
          if (!response.ok) { finish(null); return }
          const trace = await response.text()
          if (!finished) finish(parseTraceCountry(trace))
        } catch { finish(null) }
      })()
    })
  }

  function start(onChange: (locale: Locale) => void) {
    if (activation) {
      activation.active = false
      activation.cancelRequest?.()
    }
    const current: Activation = { active: true, onChange }
    activation = current
    onChange(locale)
    if (legacyChoice && chosen === legacyChoice) writeStorage(localStorage, LOCALE_CHOICE_KEY, legacyChoice)
    const settled = chosen || resolved ? Promise.resolve() : lookup(current)
    return {
      settled,
      cancel() {
        current.active = false
        current.cancelRequest?.()
        if (activation === current) activation = null
      },
    }
  }

  return { getLocale: () => locale, choose, start }
}
