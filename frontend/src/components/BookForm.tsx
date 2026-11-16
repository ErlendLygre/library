import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { BookDetail, BookInput } from '../api/types'
import Cover from './Cover'

interface Props {
  initial?: BookDetail
  submitLabel: string
  onSubmit: (input: BookInput) => Promise<void>
  onCancel: () => void
}

type FormState = Record<keyof BookInput, string>

const toForm = (b?: BookDetail): FormState => ({
  title: b?.title ?? '',
  authors: b?.authors ?? '',
  isbn: b?.isbn ?? '',
  publishedYear: b?.publishedYear?.toString() ?? '',
  publisher: b?.publisher ?? '',
  description: b?.description ?? '',
  coverUrl: b?.coverUrl ?? '',
  pageCount: b?.pageCount?.toString() ?? '',
  location: b?.location ?? '',
})

const str = (s: string) => (s.trim() === '' ? null : s.trim())
const num = (s: string) => (s.trim() === '' ? null : Number(s))

export default function BookForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(initial))
  const [error, setError] = useState<string | null>(null)
  const [lookupMsg, setLookupMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)

  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function lookup() {
    setLookupMsg(null)
    setLookingUp(true)
    try {
      const r = await api.lookupIsbn(form.isbn)
      setForm(f => ({
        ...f,
        isbn: r.isbn,
        title: r.title ?? f.title,
        authors: r.authors ?? f.authors,
        publisher: r.publisher ?? f.publisher,
        publishedYear: r.publishedYear?.toString() ?? f.publishedYear,
        pageCount: r.pageCount?.toString() ?? f.pageCount,
        coverUrl: r.coverUrl ?? f.coverUrl,
        description: f.description || r.description || '',
      }))
      setLookupMsg('Details filled in from Open Library.')
    } catch (e) {
      setLookupMsg((e as Error).message)
    } finally {
      setLookingUp(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        authors: str(form.authors),
        isbn: str(form.isbn),
        publishedYear: num(form.publishedYear),
        publisher: str(form.publisher),
        description: str(form.description),
        coverUrl: str(form.coverUrl),
        pageCount: num(form.pageCount),
        location: str(form.location),
      })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <form className="book-form" onSubmit={submit}>
      <div className="book-form-cover">
        <Cover url={str(form.coverUrl)} title={form.title || 'New book'} />
      </div>
      <div className="book-form-fields">
        <label>
          ISBN
          <div className="row">
            <input value={form.isbn} onChange={set('isbn')} placeholder="978…" inputMode="numeric" />
            <button type="button" className="secondary" onClick={lookup} disabled={!form.isbn.trim() || lookingUp}>
              {lookingUp ? 'Looking up…' : 'Look up'}
            </button>
          </div>
          {lookupMsg && <span className="hint">{lookupMsg}</span>}
        </label>
        <label>
          Title *
          <input value={form.title} onChange={set('title')} required maxLength={500} />
        </label>
        <label>
          Author(s)
          <input value={form.authors} onChange={set('authors')} maxLength={500} placeholder="Separate with commas" />
        </label>
        <div className="grid-2">
          <label>
            Year
            <input type="number" value={form.publishedYear} onChange={set('publishedYear')} min={0} max={3000} />
          </label>
          <label>
            Pages
            <input type="number" value={form.pageCount} onChange={set('pageCount')} min={1} />
          </label>
        </div>
        <div className="grid-2">
          <label>
            Publisher
            <input value={form.publisher} onChange={set('publisher')} maxLength={200} />
          </label>
          <label>
            Shelf / location
            <input value={form.location} onChange={set('location')} maxLength={200} placeholder="e.g. Living room, top shelf" />
          </label>
        </div>
        <label>
          Cover image URL
          <input type="url" value={form.coverUrl} onChange={set('coverUrl')} maxLength={1000} />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={set('description')} rows={4} maxLength={10000} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </form>
  )
}
