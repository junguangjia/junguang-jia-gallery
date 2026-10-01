import { useEffect } from 'react'
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

  useEffect(() => {
    document.title = t.pageTitle(title)
  }, [t, title])

  let side = 0
  const lines =
    category.id === 'documentary'
      ? [t.documentaryLine, t.endLine]
      : category.id === 'film'
        ? [t.filmLine, t.endLine]
        : category.id === 'landscape'
          ? [t.landscapeLine, t.endLine]
          : [t.wildlifeCount, t.endLine]

  return (
    <main
      className={photos.length === 0 ? 'series series-empty' : 'series'}
      data-screen="series"
      data-category={category.id}
    >
      {photos.map((photo, index) => {
        const align = photo.wide ? 'center' : side++ % 2 === 0 ? 'left' : 'right'
        return (
          <figure key={photo.id} id={photo.id} className={`plate plate--${align}${photo.width > photo.height ? ' plate--landscape' : ''}`}>
            <img
              src={photo.src}
              alt={photo.alt[locale]}
              width={photo.width}
              height={photo.height}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              data-handoff={concealFirst && index === 0 ? 'hidden' : undefined}
            />
          </figure>
        )
      })}
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
