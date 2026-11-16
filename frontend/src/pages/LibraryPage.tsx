import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import Cover from '../components/Cover'
import { Stars } from '../components/Stars'

const PAGE_SIZE = 24

export default function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'title'
  const page = Number(params.get('page') ?? '1')
  const [draft, setDraft] = useState(search)
  const debounce = useRef<number | undefined>(undefined)

  function update(changes: Record<string, string>) {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      return next
    }, { replace: true })
  }

  function onSearchChange(value: string) {
    setDraft(value)
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => update({ q: value, page: '' }), 300)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['books', search, sort, page],
    queryFn: () => api.listBooks({ search, sort, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search title, author, ISBN or shelf…"
          value={draft}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Search books"
        />
        <select value={sort} onChange={e => update({ sort: e.target.value, page: '' })} aria-label="Sort by">
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="added">Recently added</option>
          <option value="rating">Rating</option>
          <option value="year">Year</option>
        </select>
        <Link to="/books/new" className="button">+ Add book</Link>
      </div>

      {error && <p className="error">{(error as Error).message}</p>}
      {isLoading && <p className="muted">Loading…</p>}

      {data && (
        <>
          <p className="muted small">{data.total} {data.total === 1 ? 'book' : 'books'}</p>
          {data.items.length === 0 ? (
            <div className="empty">
              <p>{search ? 'No books match your search.' : 'Your library is empty.'}</p>
              {!search && <Link to="/books/new" className="button">Add your first book</Link>}
            </div>
          ) : (
            <ul className="book-grid">
              {data.items.map(b => (
                <li key={b.id}>
                  <Link to={`/books/${b.id}`} className="book-card">
                    <Cover url={b.coverUrl} title={b.title} />
                    <div className="book-card-body">
                      <strong className="book-title">{b.title}</strong>
                      <span className="muted small">{b.authors}</span>
                      <span className="book-card-meta">
                        <Stars value={b.averageRating} size="sm" />
                        {b.reviewCount > 0 && <span className="muted small">({b.reviewCount})</span>}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <div className="pager">
              <button className="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>← Prev</button>
              <span className="muted">Page {page} of {pages}</span>
              <button className="secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Next →</button>
            </div>
          )}
        </>
      )}
    </>
  )
}
