import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Category } from '../photos.ts'
import { useLocale } from '../locale.tsx'
import { Link } from './Link.tsx'

type Props = {
  category: Category
  concealFirst?: boolean
}

export function Series({ category, concealFirst = false }: Props) {
  const { locale, t } = useLocale()
  const title = category.word
  const photos = category.photos
  const stageRef = useRef<HTMLElement>(null)
  const coverRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    document.title = t.pageTitle(title)
  }, [t, title])

  useLayoutEffect(() => {
    const stage = stageRef.current
    const cover = coverRef.current
    if (!stage || !cover) return
    // Measure the fitted cover, including viewport height and mobile gutters.
    // These limits only affect later photographs, leaving the handoff unchanged.
    const measure = () => {
      const { width, height } = cover.getBoundingClientRect()
      stage.style.setProperty('--cover-width', `${width}px`)
      stage.style.setProperty('--cover-height', `${height}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(cover)
    return () => observer.disconnect()
  }, [category.id])

  const lines = [t.photoCount(photos.length), t.endLine]

  return (
    <main
      ref={stageRef}
      className={photos.length === 0 ? 'series series-empty' : 'series'}
      data-screen="series"
      data-category={category.id}
    >
      {category.series.map((series) => (
        <section key={series.id} data-series={series.id} aria-labelledby={`series-${series.id}`}>
          <h2 id={`series-${series.id}`} className="visually-hidden">{series.title[locale]}</h2>
          {photos.filter((photo) => photo.seriesId === series.id).map((photo) => {
            const first = photo === photos[0]
            const align = first ? 'center' : photo.placement === 'right' ? 'right' : 'left'
            const horizontal = (photo.width ?? 0) > (photo.height ?? 0)
            const plateStyle = first ? undefined : {
              '--photo-ratio': (photo.width ?? 1100) / (photo.height ?? 1650),
              '--photo-width': `${photo.width ?? 1100}px`,
            } as CSSProperties
            return (
              <figure
                key={photo.id}
                id={photo.id}
                className={`plate plate--${align} plate--${horizontal ? 'landscape' : 'portrait'}${first ? ' plate--cover' : ` plate--${photo.plateSize ?? 'medium'} plate--inset-${photo.plateInset ?? 'middle'}`}`}
                style={plateStyle}
              >
                <img
                  ref={first ? coverRef : undefined}
                  src={photo.src}
                  alt={photo.alt[locale]}
                  width={photo.width ?? (photo.wide ? 1600 : 1100)}
                  height={photo.height}
                  loading={first ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={first ? 'high' : undefined}
                  data-handoff={concealFirst && first ? 'hidden' : undefined}
                />
              </figure>
            )
          })}
        </section>
      ))}
      <section className="end-frame" data-screen="end">
        <div className="end-copy">
          <h1>{title}</h1>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>
            <Link href="/">{t.backGalleries}</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
