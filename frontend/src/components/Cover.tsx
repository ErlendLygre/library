import { useState } from 'react'

const palette = ['#8b5e34', '#2f6f5e', '#b4472f', '#3d5a80', '#6d597a', '#7a6c2f']

export default function Cover({ url, title, className = '' }: { url: string | null; title: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return <img className={`cover ${className}`} src={url} alt={`Cover of ${title}`} loading="lazy" onError={() => setFailed(true)} />
  }
  const color = palette[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length]
  return (
    <div className={`cover cover-placeholder ${className}`} style={{ background: color }} aria-hidden>
      <span>{title}</span>
    </div>
  )
}
