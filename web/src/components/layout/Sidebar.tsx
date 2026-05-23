import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, UtensilsCrossed,
  Table2, BarChart3, LogOut, Circle, CreditCard, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/tables', label: 'Tables', icon: Table2 },
]

const adminNav = [
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: ShieldCheck },
]

export default function Sidebar() {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.setQueryData(['me'], null)
      navigate('/login', { replace: true })
    },
  })

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900 border-r border-gray-800 print:hidden">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Circle className="h-4 w-4 text-white fill-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Room 9</p>
          <p className="text-xs text-gray-500 mt-0.5">Billiard POS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-brand-600/20 text-brand-400 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="my-2 border-t border-gray-800" />
            {adminNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-600/20 text-brand-400 font-medium'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white uppercase">
            {user?.name?.[0] ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-200">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
