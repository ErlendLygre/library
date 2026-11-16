import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLogout, useMe } from '../auth'

export default function Layout() {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <img src="/favicon.svg" alt="" width={24} height={24} />
            Home Library
          </Link>
          <nav className="nav">
            <NavLink to="/" end>Books</NavLink>
            <NavLink to="/books/new">Add book</NavLink>
            {me?.isAdmin && <NavLink to="/users">Users</NavLink>}
            <NavLink to="/account">{me?.displayName || 'Account'}</NavLink>
            <button
              className="link-button"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
