import { useState } from 'react'

export function Stars({ value, size = 'md' }: { value: number | null; size?: 'sm' | 'md' }) {
  if (value === null) return <span className="muted small">No ratings</span>
  const rounded = Math.round(value * 2) / 2
  return (
    <span className={`stars stars-${size}`} aria-label={`${value.toFixed(1)} out of 5`} title={value.toFixed(1)}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rounded ? 'on' : i - 0.5 === rounded ? 'half' : 'off'}>★</span>
      ))}
    </span>
  )
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value
  return (
    <span className="stars stars-lg star-input" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          className={i <= shown ? 'on' : 'off'}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
        >
          ★
        </button>
      ))}
    </span>
  )
}
