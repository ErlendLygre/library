import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import BookForm from '../components/BookForm'

export default function AddBookPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return (
    <>
      <h1>Add a book</h1>
      <p className="muted">Tip: enter an ISBN and press “Look up” to fill in the details automatically.</p>
      <BookForm
        submitLabel="Add book"
        onCancel={() => navigate(-1)}
        onSubmit={async input => {
          const book = await api.createBook(input)
          qc.invalidateQueries({ queryKey: ['books'] })
          navigate(`/books/${book.id}`)
        }}
      />
    </>
  )
}
