import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { bookingsApi, type PoolTable, type Customer, type Session } from '@/lib/api'
import { formatRp, formatDuration } from '@/lib/utils'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { Clock, Users, Play, X } from 'lucide-react'

export default function BookingsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [startModal, setStartModal] = useState<PoolTable | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.page,
    refetchInterval: 30_000,
  })

  const start = useMutation({
    mutationFn: ({ tableId, customerId }: { tableId: number; customerId: number }) =>
      bookingsApi.start({ table_id: tableId, customer_id: customerId, billing_type: 'open', duration_minutes: 0 }),
    onSuccess: (res: { session_id: number }) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      navigate(`/bookings/${res.session_id}`)
    },
  })

  if (isLoading) return <PageSkeleton />

  const { tables, customers, active_sessions } = data!
  const sessionByTable = new Map(active_sessions.map((s) => [s.table_id, s]))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Bookings</h1>
        <p className="text-sm text-gray-500">Select a table to start a new session</p>
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tables.map((table) => {
          const session = sessionByTable.get(table.id)
          return (
            <TableCard
              key={table.id}
              table={table}
              session={session}
              onClick={() => {
                if (!session) setStartModal(table)
                else navigate(`/bookings/${session.id}`)
              }}
            />
          )
        })}
      </div>

      {/* Active sessions list */}
      {active_sessions.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Active Sessions</h2>
          <div className="space-y-2">
            {active_sessions.map((s) => (
              <ActiveSessionRow
                key={s.id}
                session={s}
                onClick={() => navigate(`/bookings/${s.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Start modal */}
      {startModal && (
        <StartBookingModal
          table={startModal}
          customers={customers}
          isPending={start.isPending}
          error={start.error?.message}
          onStart={(customerId) => start.mutate({ tableId: startModal.id, customerId })}
          onClose={() => setStartModal(null)}
        />
      )}
    </div>
  )
}

function TableCard({
  table, session, onClick,
}: { table: PoolTable; session?: Session; onClick: () => void }) {
  const { charge } = useSessionTimer(session?.started_at ?? '', table.hourly_rate, !!session)
  const occupied = table.status === 'occupied'

  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left transition-all hover:border-gray-600 active:scale-95 ${
        occupied ? 'border-yellow-700/50 bg-yellow-950/20' : 'hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Table</span>
        <span className={occupied ? 'badge-yellow' : 'badge-green'}>
          {occupied ? 'Occupied' : 'Free'}
        </span>
      </div>
      <p className="text-lg font-bold text-white mb-1">{table.name}</p>
      <p className="text-xs text-gray-500">{formatRp(table.hourly_rate)}/hr</p>
      {session && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-400 truncate">{session.customer_name}</p>
          <p className="text-sm font-semibold text-yellow-400 mt-1">{formatRp(charge)}</p>
          <p className="text-xs text-gray-500">{formatDuration(session.started_at)}</p>
        </div>
      )}
    </button>
  )
}

function ActiveSessionRow({ session, onClick }: { session: Session; onClick: () => void }) {
  const { charge } = useSessionTimer(session.started_at, session.hourly_rate, true)

  return (
    <button
      onClick={onClick}
      className="card w-full flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors text-left"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-900/30">
        <Clock className="h-5 w-5 text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{session.table_name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Users className="h-3 w-3" />
          {session.customer_name} · {formatDuration(session.started_at)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-yellow-400">{formatRp(charge)}</p>
        <p className="text-xs text-gray-500">table charge</p>
      </div>
    </button>
  )
}

function StartBookingModal({
  table, customers, isPending, error, onStart, onClose,
}: {
  table: PoolTable
  customers: Customer[]
  isPending: boolean
  error?: string
  onStart: (customerId: number) => void
  onClose: () => void
}) {
  const [customerId, setCustomerId] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Start Booking</h2>
            <p className="text-sm text-gray-500">{table.name} · {formatRp(table.hourly_rate)}/hr</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="label">Select Customer</label>
          <select
            className="input"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">— Choose customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            disabled={!customerId || isPending}
            onClick={() => onStart(Number(customerId))}
          >
            <Play className="h-4 w-4" />
            {isPending ? 'Starting…' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-gray-800 rounded" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-36" />
        ))}
      </div>
    </div>
  )
}
