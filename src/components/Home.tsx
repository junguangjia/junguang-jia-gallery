import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { categories, type Category } from '../photos.ts'
import { useLocale } from '../locale.tsx'

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() => window.matchMedia('(pointer: coarse)').matches)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarse(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return coarse
}

function containsPoint(el: HTMLElement, x: number, y: number) {
  const box = el.getBoundingClientRect()
  return box.width > 0 && box.height > 0 && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
}

function translationOf(el: HTMLElement) {
  const transform = getComputedStyle(el).transform
  if (!transform || transform === 'none') return { x: 0, y: 0 }
  if (transform.startsWith('matrix3d(')) {
    const parts = transform.slice(9, -1).split(',').map(Number)
    return { x: parts[12] || 0, y: parts[13] || 0 }
  }
  if (transform.startsWith('matrix(')) {
    const parts = transform.slice(7, -1).split(',').map(Number)
    return { x: parts[4] || 0, y: parts[5] || 0 }
  }
  return { x: 0, y: 0 }
}

function titleAt(row: HTMLElement, x: number, y: number) {
  const open = row.querySelector<HTMLElement>('.category-title[data-open="true"]')
  if (open) {
    const rest = open.querySelector<HTMLElement>('.category-rest')
    if (containsPoint(open, x, y) || (rest && containsPoint(rest, x, y))) {
      return open.dataset.category ?? null
    }
  }

  const titles = row.querySelectorAll<HTMLElement>('.category-title')
  for (const title of titles) {
    const letter = title.querySelector<HTMLElement>('.category-letter')
    if (!letter) continue
    const letterBox = letter.getBoundingClientRect()
    const titleBox = title.getBoundingClientRect()
    const shift = translationOf(title.closest('li') ?? title)
    const left = letterBox.left - shift.x
    const right = letterBox.right - shift.x
    const top = titleBox.top - shift.y
    const bottom = titleBox.bottom - shift.y
    if (x >= left && x <= right && y >= top && y <= bottom) {
      return title.dataset.category ?? null
    }
  }
  return null
}

type Props = {
  onOpen: (category: Category) => void
}

export function Home({ onOpen }: Props) {
  const { t } = useLocale()
  const coarsePointer = useCoarsePointer()
  const rowRef = useRef<HTMLUListElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const active = !coarsePointer && hovered ? hovered : focused
  const activeCategory = categories.find((category) => category.id === active)
  const wordOverhang = activeCategory
    ? (activeCategory.letterW * activeCategory.seamNum / activeCategory.seamDen +
        activeCategory.restW - activeCategory.letterW) / activeCategory.inkH
    : 0

  const clearFocus = (id: string, event: FocusEvent<HTMLAnchorElement>) => {
    const next = event.relatedTarget
    if (next instanceof Element && next.closest('.category-title') && rowRef.current?.contains(next)) {
      return
    }
    setFocused((current) => (current === id ? null : current))
  }

  return (
    <main className="home" data-screen="home">
      {categories.map((category) => {
        const cover = category.photos[0]
        if (!cover) return null
        return (
          <div
            key={category.id}
            className="home-cover"
            data-cover={category.id}
            data-active={active === category.id ? 'true' : 'false'}
            aria-hidden="true"
          >
            <img src={cover.src} alt="" style={{ objectPosition: cover.focal }} />
          </div>
        )
      })}
      <h1 className="visually-hidden">{t.galleries}</h1>
      <div className="home-stage">
        <nav
          className="category-hit"
          aria-label={t.galleries}
          onMouseMove={(event) => {
            if (coarsePointer) return
            const row = rowRef.current
            if (!row) return
            const next = titleAt(row, event.clientX, event.clientY)
            if (!next) return
            setHovered((current) => (current === next ? current : next))
          }}
          onMouseLeave={() => setHovered(null)}
        >
          <ul
            ref={rowRef}
            className="category-row"
            data-active={active ? 'true' : 'false'}
            style={{ ['--word-overhang' as string]: wordOverhang }}
          >
            {categories.map((category) => {
              const open = active === category.id
              return (
                <li key={category.id} data-yield={active && !open ? 'true' : 'false'}>
                  <a
                    href={category.path}
                    className="category-title"
                    data-category={category.id}
                    data-open={open ? 'true' : 'false'}
                    aria-label={category.word}
                    onMouseEnter={() => {
                      if (!coarsePointer) setHovered(category.id)
                    }}
                    onFocus={(event) => {
                      if (coarsePointer && !event.currentTarget.matches(':focus-visible')) return
                      setFocused(category.id)
                    }}
                    onBlur={(event) => clearFocus(category.id, event)}
                    onClick={(event) => {
                      if (
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey ||
                        event.button !== 0
                      ) {
                        return
                      }
                      event.preventDefault()
                      onOpen(category)
                    }}
                  >
                    <span
                      className="category-word"
                      aria-hidden="true"
                      style={{
                        ['--canvas-h' as string]: category.canvasH,
                        ['--ink-h' as string]: category.inkH,
                        ['--ink-top' as string]: category.inkTop,
                        ['--letter-w' as string]: category.letterW,
                        ['--rest-w' as string]: category.restW,
                      }}
                    >
                      <img
                        className="category-letter"
                        src={`/titles/${category.id}-letter.png`}
                        alt=""
                        width={category.letterW}
                        height={category.canvasH}
                      />
                      <img
                        className="category-rest"
                        src={`/titles/${category.id}-rest.png`}
                        alt=""
                        width={category.restW}
                        height={category.canvasH}
                        style={{ left: `calc(100% * ${category.seamNum} / ${category.seamDen})` }}
                      />
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </main>
  )
}
