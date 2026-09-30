import type { ReactNode } from 'react'
import { navigate } from '../router.ts'

type Props = {
  href: string
  className?: string
  children: ReactNode
  current?: boolean
  onClick?: () => void
}

export function Link({ href, className, children, current = false, onClick }: Props) {
  return (
    <a
      href={href}
      className={className}
      aria-current={current ? 'page' : undefined}
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
        onClick?.()
        navigate(href)
      }}
    >
      {children}
    </a>
  )
}
