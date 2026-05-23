import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { authApi, type User } from '@/lib/api'

export function useAuth() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await authApi.me()
        return res.user
      } catch {
        return null
      }
    },
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    const handler = () => qc.setQueryData<User | null>(['me'], null)
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [qc])

  return {
    user: data ?? null,
    isLoading,
    isAdmin: data?.role === 'admin',
  }
}
