import { useLayoutEffect, useRef } from 'react'

const EASE_MS = 640
const IMAGE_WAIT_MS = 5000

type Props = {
  src: string
  focal: string
  onDone: () => void
}

export function EnterHandoff({ src, focal, onDone }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const frame = frameRef.current
    const img = document.querySelector<HTMLImageElement>('main[data-screen="series"] .plate img')
    if (!frame || !img) {
      onDone()
      return
    }

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      onDone()
    }

    const previousOverflow = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight
    const previousHeaderGap = document.body.style.getPropertyValue('--handoff-gutter')
    const previousHeaderGapPriority = document.body.style.getPropertyPriority('--handoff-gutter')
    const header = document.querySelector<HTMLElement>('.site-header')
    const bodyWidth = document.body.getBoundingClientRect().width
    const headerWidth = header?.getBoundingClientRect().width ?? 0
    const paddingRight = Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0
    document.body.style.overflow = 'hidden'
    // Compensate actual expansion without changing the viewport units used by the photos.
    const bodyExpansion = Math.max(0, document.body.getBoundingClientRect().width - bodyWidth)
    const headerExpansion = Math.max(0, (header?.getBoundingClientRect().width ?? 0) - headerWidth)
    if (bodyExpansion > 0) {
      document.body.style.paddingRight = `${paddingRight + bodyExpansion}px`
    }
    document.body.style.setProperty('--handoff-gutter', `${headerExpansion}px`)

    let started = false
    let prepareFrame = 0
    let motionFrame = 0
    let motionTimer: number | undefined
    const imageTimer = window.setTimeout(finish, IMAGE_WAIT_MS)

    const go = () => {
      if (finished || started) return
      started = true
      prepareFrame = requestAnimationFrame(() => {
        motionFrame = requestAnimationFrame(() => {
          if (finished) return
          const rect = img.getBoundingClientRect()
          if (rect.width < 2 || rect.height < 2) {
            finish()
            return
          }
          frame.style.setProperty('--top', `${rect.top}px`)
          frame.style.setProperty('--left', `${rect.left}px`)
          frame.style.setProperty('--width', `${rect.width}px`)
          frame.style.setProperty('--height', `${rect.height}px`)
          frame.dataset.go = 'true'
          window.clearTimeout(imageTimer)
          // Count the fallback from the actual motion start, after image loading.
          motionTimer = window.setTimeout(finish, EASE_MS + 280)
        })
      })
    }

    if (img.complete) {
      if (img.naturalWidth > 0) go()
      else finish()
    } else {
      img.addEventListener('load', go, { once: true })
      img.addEventListener('error', finish, { once: true })
    }

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== frame || event.propertyName !== 'width') return
      finish()
    }
    frame.addEventListener('transitionend', onEnd)

    return () => {
      finished = true
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPadding
      if (previousHeaderGap) {
        document.body.style.setProperty('--handoff-gutter', previousHeaderGap, previousHeaderGapPriority)
      } else {
        document.body.style.removeProperty('--handoff-gutter')
      }
      frame.removeEventListener('transitionend', onEnd)
      window.clearTimeout(imageTimer)
      window.clearTimeout(motionTimer)
      cancelAnimationFrame(prepareFrame)
      cancelAnimationFrame(motionFrame)
      img.removeEventListener('load', go)
      img.removeEventListener('error', finish)
    }
  }, [onDone])

  return (
    <div ref={frameRef} className="enter-handoff" data-screen="handoff">
      <img src={src} alt="" style={{ objectPosition: focal }} />
    </div>
  )
}
