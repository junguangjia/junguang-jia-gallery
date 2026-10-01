import { categoryFromPath } from '../photos.ts'
import { useLocale } from '../locale.tsx'
import { Link } from './Link.tsx'
import { LanguageToggle } from './LanguageToggle.tsx'

type Props = {
  path: string
  menuOpen: boolean
  onMenu: () => void
  onNavigate: () => void
}

export function Header({ path, menuOpen, onMenu, onNavigate }: Props) {
  const { t } = useLocale()
  const galleriesCurrent = path === '/' || Boolean(categoryFromPath(path))

  return (
    <header className="site-header">
      {path !== '/information' ? (
        <Link href="/" className="site-title" onClick={onNavigate}>
          {t.siteTitle}
        </Link>
      ) : null}
      <div className="header-tools">
        <nav className="desktop-nav" aria-label={t.galleries}>
          <Link href="/" current={galleriesCurrent} onClick={onNavigate}>
            {t.galleries}
          </Link>
          <Link href="/information" current={path === '/information'} onClick={onNavigate}>
            {t.information}
          </Link>
          <LanguageToggle />
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
