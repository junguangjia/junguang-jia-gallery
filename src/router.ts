import { useEffect, useState } from 'react'
import { sitePath, siteUrl } from './paths.ts'

export function navigate(href: string) {
  const url = new URL(siteUrl(href), window.location.origin)
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next !== current) {
    window.history.pushState(null, '', next)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function usePathname() {
  const [path, setPath] = useState(() => sitePath(window.location.pathname))

  useEffect(() => {
    const sync = () => setPath(sitePath(window.location.pathname))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return path
}
