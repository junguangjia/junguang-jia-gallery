import { useEffect, useRef } from 'react'
import { categories } from '../photos.ts'
import { useLocale } from '../locale.tsx'
import { Link } from './Link.tsx'

type Props = {
  path: string
  onClose: () => void
}

export function Menu({ path, onClose }: Props) {
  const { t, toggleLocale } = useLocale()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <div className="overlay menu-overlay" role="dialog" aria-modal="true" aria-label={t.closeMenu}>
      <div className="overlay-bar">
        <p className="site-title">
          <img src="/signature.png" alt="Junguang Jia" />
        </p>
        <button ref={closeRef} type="button" className="text-button" onClick={onClose}>
          {t.close}
        </button>
      </div>
      <nav className="menu-list" aria-label={t.galleries}>
        <Link href="/" className="menu-link" current={path === '/'} onClick={onClose}>
          {t.galleries}
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={category.path}
            className="menu-link"
            current={path === category.path}
            onClick={onClose}
          >
            {category.word}
          </Link>
        ))}
        <Link
          href="/information"
          className="menu-link"
          current={path === '/information'}
          onClick={onClose}
        >
          {t.information}
        </Link>
        <button
          type="button"
          className="menu-link text-button"
          onClick={() => {
            toggleLocale()
            onClose()
          }}
          aria-label={t.languageLabel}
        >
          {t.language}
        </button>
      </nav>
    </div>
  )
}
