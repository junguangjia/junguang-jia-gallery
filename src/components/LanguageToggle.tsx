import { useLocale } from '../locale.tsx'

type Props = {
  onToggle?: () => void
}

export function LanguageToggle({ onToggle }: Props) {
  const { t, toggleLocale } = useLocale()

  return (
    <button
      type="button"
      className="language-toggle"
      aria-label={t.languageLabel}
      onClick={() => {
        toggleLocale()
        onToggle?.()
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </svg>
    </button>
  )
}
