import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { isDemo } from '../api/client'
import { resetDemoData } from '../api/demo'
import { useLogout, useMe } from '../auth'

export default function Layout() {
  const { data: me } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const qc = useQueryClient()

  return (
    <>
      {isDemo && (
        <div className="demo-banner">
          <span>
            <strong>Demo</strong> · runs entirely in your browser, data is stored locally
          </span>
          <button
            className="link-button"
            onClick={() => {
              if (!confirm('Reset all demo data to the original sample library?')) return
              resetDemoData()
              qc.invalidateQueries()
              navigate('/')
            }}
          >
            Reset demo data
          </button>
        </div>
      )}
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={24} height={24} />
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
