import { Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import AccountPage from './pages/AccountPage'
import AddBookPage from './pages/AddBookPage'
import BookPage from './pages/BookPage'
import EditBookPage from './pages/EditBookPage'
import LibraryPage from './pages/LibraryPage'
import LoginPage from './pages/LoginPage'
import UsersPage from './pages/UsersPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<LibraryPage />} />
        <Route path="books/new" element={<AddBookPage />} />
        <Route path="books/:id" element={<BookPage />} />
        <Route path="books/:id/edit" element={<EditBookPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="users" element={<RequireAuth admin><UsersPage /></RequireAuth>} />
        <Route path="*" element={<p className="muted">Page not found.</p>} />
      </Route>
    </Routes>
  )
}
