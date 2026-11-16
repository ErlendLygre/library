import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { useMe } from '../auth'

export default function AccountPage() {
  const { data: me } = useMe()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmNext, setConfirmNext] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (next !== confirmNext) {
      setMsg({ ok: false, text: 'The new passwords do not match.' })
      return
    }
    try {
      await api.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirmNext('')
      setMsg({ ok: true, text: 'Password changed.' })
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message })
    }
  }

  return (
    <div className="narrow">
      <h1>Your account</h1>
      <p>
        <strong>{me?.displayName}</strong>
        <br />
        <span className="muted">{me?.email}{me?.isAdmin && ' · Administrator'}</span>
      </p>
      <form className="card stack" onSubmit={submit}>
        <h2>Change password</h2>
        <label>
          Current password
          <input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required />
        </label>
        <label>
          New password
          <input type="password" autoComplete="new-password" minLength={8} value={next} onChange={e => setNext(e.target.value)} required />
        </label>
        <label>
          Confirm new password
          <input type="password" autoComplete="new-password" minLength={8} value={confirmNext} onChange={e => setConfirmNext(e.target.value)} required />
        </label>
        {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
        <div><button type="submit">Change password</button></div>
      </form>
    </div>
  )
}
