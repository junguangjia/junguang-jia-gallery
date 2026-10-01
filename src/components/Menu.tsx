import { useEffect, useRef } from 'react'
import { useLocale } from '../locale.tsx'
import { Link } from './Link.tsx'
import { LanguageToggle } from './LanguageToggle.tsx'

type Props = {
  path: string
  onClose: () => void
}

export function Menu({ path, onClose }: Props) {
  const { t } = useLocale()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div className="overlay menu-overlay" role="dialog" aria-modal="true" aria-label={t.closeMenu}>
      <div className="overlay-bar">
        {path !== '/information' ? <p className="site-title">{t.siteTitle}</p> : null}
        <button ref={closeRef} type="button" className="menu-close" aria-label={t.closeMenu} onClick={onClose}>
          <span className="burger-lines" data-open="true" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </div>
      <nav className="menu-list" aria-label={t.galleries}>
        <Link href="/" className="menu-link" current={path === '/'} onClick={onClose}>
          {t.galleries}
        </Link>
        <Link
          href="/information"
          className="menu-link"
          current={path === '/information'}
          onClick={onClose}
        >
          {t.information}
        </Link>
        <LanguageToggle showLabel onToggle={onClose} />
      </nav>
    </div>
  )
}
