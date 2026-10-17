/** Resolve runtime links and public assets beneath Vite's configured base. */
export function siteUrl(path: string, base = import.meta.env.BASE_URL) {
  return `${base}${path.replace(/^\/+/, '')}`
}

/** Keep application routes independent of the host's project directory. */
export function sitePath(pathname: string, base = import.meta.env.BASE_URL) {
  const prefix = base.replace(/\/$/, '')
  const path = prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))
    ? pathname.slice(prefix.length)
    : pathname
  return path.replace(/\/+$/, '') || '/'
}
