import { useEffect } from 'react'
import { useLocale } from '../locale.tsx'

export function Information() {
  const { t } = useLocale()

  useEffect(() => {
    document.title = t.pageTitle(t.information)
  }, [t])

  return (
    <main className="info" data-screen="information">
      <h1>{t.siteTitle}</h1>
      <p>{t.infoLead}</p>
      <p>{t.infoBody}</p>
      <p>{t.infoHow}</p>
    </main>
  )
}
