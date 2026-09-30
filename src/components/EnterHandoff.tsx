import { useEffect, useRef } from 'react'

const EASE_MS = 640

type Props = {
  src: string
  focal: string
  onDone: () => void
}

export function EnterHandoff({ src, focal, onDone }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const go = () => {
      const rect = img.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (finished) return
          frame.style.setProperty('--top', `${rect.top}px`)
          frame.style.setProperty('--left', `${rect.left}px`)
          frame.style.setProperty('--width', `${rect.width}px`)
          frame.style.setProperty('--height', `${rect.height}px`)
          frame.dataset.go = 'true'
        })
      })
    }

    if (img.complete && img.naturalWidth > 0) go()
    else img.addEventListener('load', go, { once: true })

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== frame || event.propertyName !== 'width') return
      finish()
    }
    frame.addEventListener('transitionend', onEnd)
    const timer = window.setTimeout(finish, EASE_MS + 280)

    return () => {
      finished = true
      document.body.style.overflow = previous
      frame.removeEventListener('transitionend', onEnd)
      window.clearTimeout(timer)
      img.removeEventListener('load', go)
    }
  }, [onDone])

  return (
    <div ref={frameRef} className="enter-handoff" data-screen="handoff">
      <img src={src} alt="" style={{ objectPosition: focal }} />
    </div>
  )
}
