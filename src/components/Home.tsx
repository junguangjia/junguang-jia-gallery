import { useEffect, useRef, useState, type FocusEvent, type TouchEvent } from 'react'
import { categories, type Category } from '../photos.ts'
import { useLocale } from '../locale.tsx'

const MOBILE_QUERY = '(max-width: 760px), (pointer: coarse)'
const PREVIEW_STATE_KEY = 'galleryHomePreview'
const SWIPE_HINT_DELAY = 900
const SWIPE_HINT_DURATION = 2100

function PreviewSwipeHint({ coverId, menuOpen }: { coverId: string; menuOpen: boolean }) {
  const [visible, setVisible] = useState(false)
  const dismissRef = useRef(() => {})

  useEffect(() => {
    const image = document.getElementById(coverId)?.querySelector('img')
    if (!image) return

    let dismissed = false
    let scheduled = false
    let revealTimer: number | undefined
    let removalTimer: number | undefined
    const viewport = window.visualViewport
    const fitsViewport = () => (viewport?.height ?? window.innerHeight) >= 480
    const clearTimers = () => {
      window.clearTimeout(revealTimer)
      window.clearTimeout(removalTimer)
    }
    const dismiss = () => {
      dismissed = true
      clearTimers()
      setVisible(false)
    }
    dismissRef.current = dismiss

    const onReady = () => {
      if (dismissed || scheduled || !image.naturalWidth) return
      scheduled = true
      // Loading and activation must both be complete before the quiet interval starts.
      revealTimer = window.setTimeout(() => {
        if (dismissed || !fitsViewport() || document.visibilityState !== 'visible') return
        setVisible(true)
        removalTimer = window.setTimeout(dismiss, SWIPE_HINT_DURATION)
      }, SWIPE_HINT_DELAY)
    }
    const onResize = () => {
      if (!fitsViewport()) dismiss()
    }
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') dismiss()
    }
    const passiveCapture = { capture: true, passive: true }
    window.addEventListener('pointerdown', dismiss, passiveCapture)
    window.addEventListener('touchstart', dismiss, passiveCapture)
    window.addEventListener('click', dismiss, true)
    window.addEventListener('keydown', dismiss, true)
    window.addEventListener('popstate', dismiss)
    window.addEventListener('resize', onResize)
    viewport?.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    image.addEventListener('load', onReady)
    image.addEventListener('error', dismiss)

    if (!fitsViewport() || document.visibilityState !== 'visible') dismiss()
    if (image.complete) {
      if (image.naturalWidth) onReady()
      else dismiss()
    }

    return () => {
      dismissed = true
      clearTimers()
      dismissRef.current = () => {}
      window.removeEventListener('pointerdown', dismiss, true)
      window.removeEventListener('touchstart', dismiss, true)
      window.removeEventListener('click', dismiss, true)
      window.removeEventListener('keydown', dismiss, true)
      window.removeEventListener('popstate', dismiss)
      window.removeEventListener('resize', onResize)
      viewport?.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      image.removeEventListener('load', onReady)
      image.removeEventListener('error', dismiss)
    }
  }, [coverId])

  useEffect(() => {
    // Closing the menu must not re-arm a hint already dismissed during this visit.
    if (menuOpen) dismissRef.current()
  }, [menuOpen])

  return visible && !menuOpen ? <div className="home-swipe-hint" aria-hidden="true" /> : null
}

function readPreview() {
  if (window.location.pathname !== '/') return null
  const id: unknown = window.history.state?.[PREVIEW_STATE_KEY]
  return categories.some((category) => category.id === id) ? id as string : null
}

type Gesture = {
  x: number
  y: number
  identifier: number
  category: string
  moved: boolean
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
  menuOpen: boolean
}

export function Home({ onOpen, menuOpen }: Props) {
  const { t } = useLocale()
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const rowRef = useRef<HTMLUListElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(readPreview)
  const gestureRef = useRef<Gesture | null>(null)
  const suppressClickUntil = useRef(0)
  const closingPreview = useRef(false)
  const enteringGallery = useRef(false)
  const keyboardInput = useRef(false)

  useEffect(() => {
    const onKey = () => { keyboardInput.current = true }
    const onPointer = () => { keyboardInput.current = false }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onPointer, true)
    window.addEventListener('touchstart', onPointer, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onPointer, true)
      window.removeEventListener('touchstart', onPointer, true)
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const sync = () => {
      setMobile(query.matches)
      setSelected(readPreview())
      setHovered(null)
      setFocused(null)
    }
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const syncPreview = () => {
      const next = readPreview()
      setSelected(next)
      closingPreview.current = false
      enteringGallery.current = false
      gestureRef.current = null
      suppressClickUntil.current = 0
      if (!next && selected && window.location.pathname === '/') {
        if (keyboardInput.current) {
          rowRef.current?.querySelector<HTMLAnchorElement>(`[data-category="${selected}"]`)?.focus({ preventScroll: true })
        } else {
          const focusedElement = document.activeElement
          if (focusedElement instanceof HTMLElement && rowRef.current?.closest('.home')?.contains(focusedElement)) {
            focusedElement.blur()
          }
        }
      }
    }
    window.addEventListener('popstate', syncPreview)
    return () => {
      window.removeEventListener('popstate', syncPreview)
    }
  }, [selected])

  const active = mobile ? selected : hovered || focused
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

  const closePreview = () => {
    if (!selected || closingPreview.current) return
    closingPreview.current = true
    window.history.back()
  }

  const selectPreview = (category: Category) => {
    // A separate history entry lets the browser's native Back gesture close the preview.
    const state = window.history.state
    window.history.pushState({ ...state, [PREVIEW_STATE_KEY]: category.id }, '', window.location.href)
    setSelected(category.id)
    enteringGallery.current = false
    suppressClickUntil.current = 0
  }

  const enterGallery = (category: Category) => {
    if (mobile && enteringGallery.current) return
    enteringGallery.current = true
    onOpen(category)
  }

  const startGesture = (event: TouchEvent<HTMLElement>) => {
    gestureRef.current = null
    if (!mobile || !activeCategory || (event.target instanceof Element && event.target.closest('.home-back'))) return
    if (event.touches.length !== 1) {
      suppressClickUntil.current = event.timeStamp + 650
      return
    }
    const touch = event.touches[0]
    gestureRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      identifier: touch.identifier,
      category: activeCategory.id,
      moved: false,
    }
  }

  const moveGesture = (event: TouchEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    if (!gesture) return
    if (event.touches.length !== 1) {
      gestureRef.current = null
      suppressClickUntil.current = event.timeStamp + 650
      return
    }
    const touch = event.touches[0]
    if (Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) >= 12) gesture.moved = true
  }

  const endGesture = (event: TouchEvent<HTMLElement>) => {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture) return
    const touch = Array.from(event.changedTouches).find((touch) => touch.identifier === gesture.identifier)
    if (!touch) return
    const up = gesture.y - touch.clientY
    const across = Math.abs(touch.clientX - gesture.x)
    if (gesture.moved || Math.hypot(up, across) >= 12) suppressClickUntil.current = event.timeStamp + 650
    if (event.touches.length === 0 && up >= 60 && up > across * 1.3 && activeCategory?.id === gesture.category) {
      enterGallery(activeCategory)
    }
  }

  return (
    <main
      className="home"
      data-screen="home"
      data-preview={mobile && active ? 'true' : 'false'}
      onTouchStartCapture={startGesture}
      onTouchMoveCapture={moveGesture}
      onTouchEndCapture={endGesture}
      onTouchCancelCapture={(event) => {
        if (gestureRef.current) suppressClickUntil.current = event.timeStamp + 650
        gestureRef.current = null
      }}
      onClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest('.home-back')) return
        if (event.timeStamp < suppressClickUntil.current) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      {categories.map((category) => {
        const cover = category.photos[0]
        if (!cover) return null
        return (
          <div
            key={category.id}
            id={`home-cover-${category.id}`}
            className="home-cover"
            data-cover={category.id}
            data-active={active === category.id ? 'true' : 'false'}
            aria-hidden="true"
          >
            <img src={cover.src} alt="" style={{ objectPosition: cover.focal }} />
          </div>
        )
      })}
      {mobile && activeCategory ? (
        <a
          className="home-enter"
          href={activeCategory.path}
          aria-label={t.openGallery(activeCategory.word)}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
            event.preventDefault()
            enterGallery(activeCategory)
          }}
        />
      ) : null}
      {mobile && activeCategory ? (
        <PreviewSwipeHint
          key={activeCategory.id}
          coverId={`home-cover-${activeCategory.id}`}
          menuOpen={menuOpen}
        />
      ) : null}
      {mobile ? (
        <button
          type="button"
          className="home-back"
          data-visible={active ? 'true' : 'false'}
          aria-label={t.backGalleries}
          aria-hidden={!active}
          disabled={!active}
          onClick={closePreview}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <path d="m14 5-7 7 7 7M7 12h14" />
          </svg>
        </button>
      ) : null}
      <h1 className="visually-hidden">{t.galleries}</h1>
      <div className="home-stage">
        <nav
          className="category-hit"
          aria-label={t.galleries}
          onMouseMove={(event) => {
            if (mobile) return
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
            {categories.map((category, index) => {
              const open = active === category.id
              return (
                <li
                  key={category.id}
                  data-yield={active && !open ? 'true' : 'false'}
                  style={{
                    ['--category-index' as string]: index,
                    ['--initial-offset-x' as string]: (category.letterW / 2 - category.letterCenterX) / category.inkH,
                    ['--initial-offset-y' as string]: (category.inkTop + category.inkH / 2 - category.letterCenterY) / category.inkH,
                  }}
                  inert={mobile && Boolean(active) && !open}
                >
                  <a
                    href={category.path}
                    className="category-title"
                    data-category={category.id}
                    data-open={open ? 'true' : 'false'}
                    aria-label={mobile && open ? t.openGallery(category.word) : category.word}
                    role={mobile && !open ? 'button' : undefined}
                    aria-expanded={mobile && !open ? false : undefined}
                    aria-controls={mobile && !open ? `home-cover-${category.id}` : undefined}
                    onMouseEnter={() => {
                      if (!mobile) setHovered(category.id)
                    }}
                    onFocus={() => {
                      if (mobile) return
                      setFocused(category.id)
                    }}
                    onBlur={(event) => clearFocus(category.id, event)}
                    onKeyDown={(event) => {
                      if (mobile && !open && event.key === ' ') {
                        event.preventDefault()
                        event.currentTarget.click()
                      }
                    }}
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
                      if (mobile && !open) {
                        selectPreview(category)
                        return
                      }
                      enterGallery(category)
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
