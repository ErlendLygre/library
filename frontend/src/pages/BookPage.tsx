import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { BookDetail, Review } from '../api/types'
import { useMe } from '../auth'
import Cover from '../components/Cover'
import { StarInput, Stars } from '../components/Stars'

export default function BookPage() {
  const id = Number(useParams().id)
  const { data: me } = useMe()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: book, isLoading, error } = useQuery({
    queryKey: ['book', id],
    queryFn: () => api.getBook(id),
  })

  const del = useMutation({
    mutationFn: () => api.deleteBook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] })
      navigate('/')
    },
  })

  if (isLoading) return <p className="muted">Loading…</p>
  if (error || !book) return <p className="error">{(error as Error)?.message ?? 'Not found'}</p>

  const myReview = book.reviews.find(r => r.userId === me?.id)
  const others = book.reviews.filter(r => r.userId !== me?.id)

  return (
    <article className="book-detail">
      <div className="book-detail-cover">
        <Cover url={book.coverUrl} title={book.title} />
      </div>
      <div className="book-detail-main">
        <h1>{book.title}</h1>
        {book.authors && <p className="authors">{book.authors}</p>}
        <p className="rating-line">
          <Stars value={book.averageRating} />
          {book.averageRating !== null && (
            <span className="muted">
              {book.averageRating.toFixed(1)} · {book.reviews.length} {book.reviews.length === 1 ? 'review' : 'reviews'}
            </span>
          )}
        </p>

        <dl className="facts">
          {book.publishedYear && <><dt>Published</dt><dd>{book.publishedYear}</dd></>}
          {book.publisher && <><dt>Publisher</dt><dd>{book.publisher}</dd></>}
          {book.pageCount && <><dt>Pages</dt><dd>{book.pageCount}</dd></>}
          {book.isbn && <><dt>ISBN</dt><dd>{book.isbn}</dd></>}
          {book.location && <><dt>Shelf</dt><dd>{book.location}</dd></>}
          {book.addedByName && <><dt>Added by</dt><dd>{book.addedByName}</dd></>}
        </dl>

        {book.description && <p className="description">{book.description}</p>}

        <div className="row">
          <Link to={`/books/${book.id}/edit`} className="button secondary">Edit details</Link>
          {book.canEdit && (
            <button
              className="danger"
              disabled={del.isPending}
              onClick={() => confirm(`Delete "${book.title}" and all its reviews?`) && del.mutate()}
            >
              Delete book
            </button>
          )}
        </div>
        {del.error && <p className="error">{(del.error as Error).message}</p>}

        <section className="reviews">
          <h2>Your review</h2>
          <MyReview book={book} review={myReview} />

          <h2>Reviews from others</h2>
          {others.length === 0 ? (
            <p className="muted">No one else has reviewed this book yet.</p>
          ) : (
            <ul className="review-list">
              {others.map(r => (
                <li key={r.id} className="card review">
                  <div className="review-head">
                    <strong>{r.userName}</strong>
                    <Stars value={r.rating} size="sm" />
                    <span className="muted small">
                      {r.readDate ? `Read ${r.readDate}` : new Date(r.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.text && <p className="review-text">{r.text}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  )
}

function MyReview({ book, review }: { book: BookDetail; review?: Review }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(!review)
  const [rating, setRating] = useState(review?.rating ?? 0)
  const [text, setText] = useState(review?.text ?? '')
  const [readDate, setReadDate] = useState(review?.readDate ?? '')

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['book', book.id] })
    qc.invalidateQueries({ queryKey: ['books'] })
  }

  const save = useMutation({
    mutationFn: () => api.saveMyReview(book.id, { rating, text: text.trim() || null, readDate: readDate || null }),
    onSuccess: () => {
      setEditing(false)
      refresh()
    },
  })

  const remove = useMutation({
    mutationFn: () => api.deleteMyReview(book.id),
    onSuccess: () => {
      setRating(0)
      setText('')
      setReadDate('')
      setEditing(true)
      refresh()
    },
  })

  if (review && !editing) {
    return (
      <div className="card review mine">
        <div className="review-head">
          <Stars value={review.rating} />
          {review.readDate && <span className="muted small">Read {review.readDate}</span>}
        </div>
        {review.text && <p className="review-text">{review.text}</p>}
        <div className="row">
          <button className="secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="link-button" disabled={remove.isPending} onClick={() => confirm('Delete your review?') && remove.mutate()}>
            Delete
          </button>
        </div>
      </div>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <form className="card review-form" onSubmit={submit}>
      <StarInput value={rating} onChange={setRating} />
      <label>
        Thoughts
        <textarea value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={20000} placeholder="What did you think?" />
      </label>
      <label className="inline">
        Finished reading
        <input type="date" value={readDate} onChange={e => setReadDate(e.target.value)} />
      </label>
      {save.error && <p className="error">{(save.error as Error).message}</p>}
      <div className="row">
        <button type="submit" disabled={rating === 0 || save.isPending}>
          {save.isPending ? 'Saving…' : review ? 'Update review' : 'Post review'}
        </button>
        {review && <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>}
        {rating === 0 && <span className="muted small">Pick a rating to post.</span>}
      </div>
    </form>
  )
}
