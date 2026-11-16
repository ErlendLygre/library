import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useMe } from '../auth'

export default function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { data: me, isLoading } = useMe()
  const location = useLocation()

  if (isLoading) return <div className="center muted">Loading…</div>
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (admin && !me.isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
