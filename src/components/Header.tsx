import { categoryFromPath } from '../photos.ts'
import { useLocale } from '../locale.tsx'
import { Link } from './Link.tsx'

type Props = {
  path: string
  menuOpen: boolean
  onMenu: () => void
  onNavigate: () => void
}

export function Header({ path, menuOpen, onMenu, onNavigate }: Props) {
  const { t, toggleLocale } = useLocale()
  const galleriesCurrent = path === '/' || Boolean(categoryFromPath(path))

  return (
    <header className="site-header">
      <Link href="/" className="site-title" onClick={onNavigate}>
        <img src="/signature.png" alt="Junguang Jia" />
      </Link>
      <div className="header-tools">
        <nav className="desktop-nav" aria-label={t.galleries}>
          <Link href="/" current={galleriesCurrent} onClick={onNavigate}>
            {t.galleries}
          </Link>
          <Link href="/information" current={path === '/information'} onClick={onNavigate}>
            {t.information}
          </Link>
          <button type="button" className="text-button" onClick={toggleLocale} aria-label={t.languageLabel}>
            {t.language}
          </button>
        </nav>
        <button
          type="button"
          className="burger"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t.closeMenu : t.openMenu}
          onClick={onMenu}
        >
          <span className="burger-lines" data-open={menuOpen ? 'true' : 'false'}>
            <span />
            <span />
          </span>
        </button>
      </div>
    </header>
  )
}
