import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from './api/client'
import type { Me } from './api/types'

export const meQueryKey = ['me']

export function useMe() {
  return useQuery<Me | null>({
    queryKey: meQueryKey,
    queryFn: async () => {
      try {
        return await api.me()
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }
    },
    staleTime: 5 * 60_000,
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return async () => {
    await api.logout()
    qc.clear()
    qc.setQueryData(meQueryKey, null)
  }
}
