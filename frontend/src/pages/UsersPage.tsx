import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { useMe } from '../auth'

export default function UsersPage() {
  const qc = useQueryClient()
  const { data: me } = useMe()
  const { data: users, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: api.listUsers })

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const create = useMutation({
    mutationFn: () => api.createUser({ email, displayName, password, isAdmin }),
    onSuccess: () => {
      setEmail('')
      setDisplayName('')
      setPassword('')
      setIsAdmin(false)
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const remove = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate()
  }

  return (
    <div className="narrow">
      <h1>Users</h1>
      {isLoading && <p className="muted">Loading…</p>}
      {error && <p className="error">{(error as Error).message}</p>}
      {users && (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th /></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td>{u.email}</td>
                <td>{u.isAdmin ? 'Admin' : 'Member'}</td>
                <td className="right">
                  {u.id !== me?.id && (
                    <button
                      className="link-button danger-text"
                      onClick={() => confirm(`Delete ${u.displayName}? Their reviews will be removed.`) && remove.mutate(u.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {remove.error && <p className="error">{(remove.error as Error).message}</p>}

      <form className="card stack" onSubmit={submit}>
        <h2>Add a user</h2>
        <div className="grid-2">
          <label>
            Name
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={100} />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
        </div>
        <label>
          Temporary password
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="off" />
          <span className="hint">Share it with them; they can change it under their account.</span>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
          Administrator (can manage users)
        </label>
        {create.error && <p className="error">{(create.error as Error).message}</p>}
        <div><button type="submit" disabled={create.isPending}>Create user</button></div>
      </form>
    </div>
  )
}
