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
      <blockquote className="info-quote">
        <p>“{t.infoQuote}”</p>
        <footer>— {t.infoQuoteAuthor}</footer>
      </blockquote>
      <p>{t.infoBody}</p>
      <p>{t.infoPurpose}</p>
      <div className="info-signature" aria-hidden="true">
        <img src="/signature.png" alt="" width="813" height="204" />
      </div>
    </main>
  )
}
