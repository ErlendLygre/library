import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api, isDemo } from '../api/client'
import { DEMO_ACCOUNTS } from '../api/demo'
import { meQueryKey, useMe } from '../auth'

export default function LoginPage() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState(isDemo ? DEMO_ACCOUNTS[0].email : '')
  const [password, setPassword] = useState(isDemo ? DEMO_ACCOUNTS[0].password : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (me) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await api.login(email, password)
      qc.setQueryData(meQueryKey, user)
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <h1>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={32} height={32} /> Home Library
        </h1>
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {isDemo ? (
          <div className="demo-accounts small">
            <strong>Demo accounts</strong> (password <code>demo</code>)
            <ul>
              {DEMO_ACCOUNTS.map(a => (
                <li key={a.email}>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setEmail(a.email)
                      setPassword(a.password)
                    }}
                  >
                    {a.email}
                  </button>{' '}
                  <span className="muted">· {a.role}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted small">Accounts are created by an administrator.</p>
        )}
      </form>
    </div>
  )
}
