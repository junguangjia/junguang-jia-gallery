import { useEffect } from 'react'
import { useLocale } from '../locale.tsx'
import { Link } from './Link.tsx'

export function NotFound() {
  const { t } = useLocale()

  useEffect(() => {
    document.title = t.pageTitle(t.notFound)
  }, [t])

  return (
    <main className="info" data-screen="not-found">
      <h1>{t.notFound}</h1>
      <p>
        <Link href="/">{t.backGalleries}</Link>
      </p>
    </main>
  )
}
