import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import BookForm from '../components/BookForm'

export default function EditBookPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: book, isLoading, error } = useQuery({ queryKey: ['book', id], queryFn: () => api.getBook(id) })

  if (isLoading) return <p className="muted">Loading…</p>
  if (error || !book) return <p className="error">{(error as Error)?.message ?? 'Not found'}</p>

  return (
    <>
      <h1>Edit “{book.title}”</h1>
      <BookForm
        initial={book}
        submitLabel="Save changes"
        onCancel={() => navigate(`/books/${id}`)}
        onSubmit={async input => {
          const updated = await api.updateBook(id, input)
          qc.setQueryData(['book', id], updated)
          qc.invalidateQueries({ queryKey: ['books'] })
          navigate(`/books/${id}`)
        }}
      />
    </>
  )
}
