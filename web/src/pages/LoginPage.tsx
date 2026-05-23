import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { Circle, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const cached = qc.getQueryData(['me'])
  useEffect(() => {
    if (cached) navigate('/dashboard', { replace: true })
  }, [cached, navigate])

  const login = useMutation({
    mutationFn: () => authApi.login(username, password),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data.user)
      navigate('/dashboard', { replace: true })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-900">
            <Circle className="h-7 w-7 text-white fill-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Room 9</h1>
            <p className="text-sm text-gray-500">Billiard Point of Sale</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => { e.preventDefault(); login.mutate() }}
          className="card p-6 space-y-4"
        >
          <div>
            <label className="label" htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                className="input pr-10"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {login.isError && (
            <p className="text-sm text-red-400">{login.error.message}</p>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-2.5"
            disabled={login.isPending || !username || !password}
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
