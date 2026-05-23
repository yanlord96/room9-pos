import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi, bookingsApi, type PoolTable, type Customer, type Session } from '@/lib/api'
import { formatRp } from '@/lib/utils'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { useAuth } from '@/hooks/useAuth'
import { Activity, Table2, TrendingUp, Users, Play, X, Clock } from 'lucide-react'

export default function DashboardPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [startModal, setStartModal] = useState<PoolTable | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    staleTime: 0,
    refetchInterval: 10_000,
  })

  const { data: booking, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.page,
    staleTime: 0,
    refetchInterval: 10_000,
  })

  const start = useMutation({
    mutationFn: (vars: { tableId: number; customerId: number; billingType: 'open' | 'fixed'; durationMinutes: number }) =>
      bookingsApi.start({ table_id: vars.tableId, customer_id: vars.customerId, billing_type: vars.billingType, duration_minutes: vars.durationMinutes }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      navigate(`/bookings/${res.session_id}`)
    },
  })

  const { isAdmin } = useAuth()
  const sessionByTable = new Map((booking?.active_sessions ?? []).map((s) => [s.table_id, s]))

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Active Sessions" value={stats?.active_sessions ?? '—'} icon={Activity} color="text-yellow-400" bg="bg-yellow-900/20" />
        <StatCard label="Available Tables" value={stats ? `${stats.available_tables} / ${stats.total_tables}` : '—'} icon={Table2} color="text-green-400" bg="bg-green-900/20" />
        {isAdmin && <StatCard label="Today's Revenue" value={stats ? formatRp(Math.ceil(stats.today_revenue / 1000) * 1000) : '—'} icon={TrendingUp} color="text-brand-400" bg="bg-brand-900/20" />}
        <StatCard label="Customers" value={booking?.customers.length ?? '—'} icon={Users} color="text-purple-400" bg="bg-purple-900/20" />
      </div>

      {/* Tables */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Tables</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-36" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {(booking?.tables ?? []).map((table) => {
              const session = sessionByTable.get(table.id)
              return (
                <TableCard
                  key={table.id}
                  table={table}
                  session={session}
                  showMoney={isAdmin}
                  onClick={() => session ? navigate(`/bookings/${session.id}`) : setStartModal(table)}
                />
              )
            })}
          </div>
        )}
      </div>

      {startModal && (
        <StartModal
          table={startModal}
          customers={booking?.customers ?? []}
          isPending={start.isPending}
          error={start.error?.message}
          onStart={(customerId, billingType, durationMinutes) => start.mutate({ tableId: startModal.id, customerId, billingType, durationMinutes })}
          onClose={() => setStartModal(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: string | number; icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  )
}

function TableCard({ table, session, onClick, showMoney }: {
  table: PoolTable; session?: Session; onClick: () => void; showMoney: boolean
}) {
  const { charge, timerDisplay, isExpired } = useSessionTimer(
    session?.started_at ?? '', table.hourly_rate, !!session,
    session?.billing_type, session?.duration_minutes,
  )
  const occupied = !!session
  const isFixed = session?.billing_type === 'fixed'

  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left w-full transition-all hover:border-gray-600 active:scale-95 ${
        isExpired ? 'border-red-700/60 bg-red-950/20' :
        occupied ? 'border-yellow-700/50 bg-yellow-950/20' : 'hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{table.name}</span>
        <span className={isExpired ? 'badge-red' : occupied ? 'badge-yellow' : 'badge-green'}>
          {isExpired ? 'Expired' : occupied ? 'Busy' : 'Free'}
        </span>
      </div>

      <p className="text-xs text-gray-500">{formatRp(table.hourly_rate)}/hr</p>

      {session ? (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
          <p className="text-xs text-gray-300 font-medium truncate">{session.customer_name}</p>
          <p className={`text-xs flex items-center gap-1 font-mono ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
            <Clock className="h-3 w-3 shrink-0" />
            {isFixed ? (isExpired ? 'Time up!' : `${timerDisplay} left`) : timerDisplay}
          </p>
          {showMoney && <p className="text-sm font-bold text-yellow-400">{formatRp(charge)}</p>}
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-600 flex items-center gap-1">
            <Play className="h-3 w-3" /> Tap to book
          </p>
        </div>
      )}
    </button>
  )
}

function StartModal({ table, customers, isPending, error, onStart, onClose }: {
  table: PoolTable
  customers: Customer[]
  isPending: boolean
  error?: string
  onStart: (customerId: number, billingType: 'open' | 'fixed', durationMinutes: number) => void
  onClose: () => void
}) {
  const [customerId, setCustomerId] = useState('')
  const [billingType, setBillingType] = useState<'open' | 'fixed'>('open')
  const [hours, setHours] = useState(1)
  const [minutes, setMinutes] = useState(0)

  const durationMinutes = hours * 60 + minutes
  const fixedCharge = billingType === 'fixed'
    ? Math.ceil((durationMinutes / 60) * table.hourly_rate / 1000) * 1000
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Start Booking</h2>
            <p className="text-sm text-gray-500">{table.name} · {formatRp(table.hourly_rate)}/hr</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="h-4 w-4" /></button>
        </div>

        {/* Billing type toggle */}
        <div>
          <label className="label">Billing Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(['open', 'fixed'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBillingType(t)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  billingType === t
                    ? 'border-brand-500 bg-brand-600/20 text-brand-400'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                {t === 'open' ? '⏱ Open' : '⏳ Fixed Duration'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1.5">
            {billingType === 'open' ? 'Timer counts up, charge grows per minute.' : 'Pay upfront for a set duration, timer counts down.'}
          </p>
        </div>

        {/* Duration input for fixed */}
        {billingType === 'fixed' && (
          <div>
            <label className="label">Duration</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  className="input text-center"
                  type="number" min="0" max="23"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
                />
                <p className="text-xs text-center text-gray-500 mt-1">hours</p>
              </div>
              <span className="text-gray-500 text-lg font-bold pb-5">:</span>
              <div className="flex-1">
                <input
                  className="input text-center"
                  type="number" min="0" max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                />
                <p className="text-xs text-center text-gray-500 mt-1">minutes</p>
              </div>
            </div>
            {durationMinutes > 0 && (
              <p className="text-sm text-brand-400 font-semibold text-center mt-2">
                Charge: {formatRp(fixedCharge)}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="label">Select Customer</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— Choose customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            className="btn-primary flex-1"
            disabled={!customerId || isPending || (billingType === 'fixed' && durationMinutes <= 0)}
            onClick={() => onStart(Number(customerId), billingType, durationMinutes)}
          >
            <Play className="h-4 w-4" />
            {isPending ? 'Starting…' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
