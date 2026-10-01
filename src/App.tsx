import { useCallback, useEffect, useState } from 'react'
import { EnterHandoff } from './components/EnterHandoff.tsx'
import { Header } from './components/Header.tsx'
import { Home } from './components/Home.tsx'
import { Information } from './components/Information.tsx'
import { Menu } from './components/Menu.tsx'
import { NotFound } from './components/NotFound.tsx'
import { Series } from './components/Series.tsx'
import { useLocale } from './locale.tsx'
import { categoryFromPath, type Category } from './photos.ts'
import { navigate, usePathname } from './router.ts'

type Handoff = {
  id: Category['id']
  src: string
  focal: string
}

export default function App() {
  const path = usePathname()
  const category = categoryFromPath(path)
  const { t } = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const clearHandoff = useCallback(() => setHandoff(null), [])

  const openCategory = (next: Category) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cover = next.photos[0]
    if (cover && !reduce) {
      setHandoff({ id: next.id, src: cover.src, focal: cover.focal })
    } else {
      setHandoff(null)
    }
    navigate(next.path)
  }

  useEffect(() => {
    if (path === '/') document.title = t.siteTitle
  }, [path, t.siteTitle])

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false)
    const onWide = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false)
    }
    const wide = window.matchMedia('(min-width: 761px)')
    window.addEventListener('popstate', closeMenu)
    wide.addEventListener('change', onWide)
    return () => {
      window.removeEventListener('popstate', closeMenu)
      wide.removeEventListener('change', onWide)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('locked', menuOpen)
  }, [menuOpen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <Header
        path={path}
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen((open) => !open)}
        onNavigate={() => setMenuOpen(false)}
      />
      {path === '/' ? <Home onOpen={openCategory} menuOpen={menuOpen} /> : null}
      {category ? (
        <Series category={category} concealFirst={handoff?.id === category.id} />
      ) : null}
      {handoff && category?.id === handoff.id ? (
        <EnterHandoff src={handoff.src} focal={handoff.focal} onDone={clearHandoff} />
      ) : null}
      {path === '/information' ? <Information /> : null}
      {path !== '/' && !category && path !== '/information' ? <NotFound /> : null}
      {menuOpen ? <Menu path={path} onClose={() => setMenuOpen(false)} /> : null}
    </>
  )
}
