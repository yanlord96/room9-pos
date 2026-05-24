import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '@/lib/api'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { Circle, Clock } from 'lucide-react'

export default function TableDisplayPage() {
  const [now, setNow] = useState(new Date())

  const { data } = useQuery({
    queryKey: ['display'],
    queryFn: bookingsApi.page,
    staleTime: 0,
    refetchInterval: 10_000,
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const sessionByTable = new Map((data?.active_sessions ?? []).map((s) => [s.table_id, s]))
  const tables = data?.tables ?? []

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Circle className="h-5 w-5 text-white fill-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-none">Room 9 Billiard</p>
            <p className="text-sm text-gray-500 mt-0.5">Status Meja</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold text-white">
            {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Tables grid */}
      <div className="flex-1 p-8">
        <div className="h-full grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(tables.length))}, 1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(tables.length / Math.ceil(Math.sqrt(tables.length)))}, 1fr)`,
          }}
        >
          {tables.map((table) => {
            const session = sessionByTable.get(table.id)
            return (
              <TableCard key={table.id} table={table} session={session} />
            )
          })}
        </div>
      </div>

      {/* Footer legend */}
      <div className="flex items-center justify-center gap-8 px-8 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-400" />
          <span className="text-sm text-gray-400">Tersedia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="text-sm text-gray-400">Sedang Digunakan</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <span className="text-sm text-gray-400">Waktu Habis</span>
        </div>
      </div>
    </div>
  )
}

function TableCard({ table, session }: {
  table: { id: number; name: string; hourly_rate: number }
  session?: { started_at: string; customer_name: string; billing_type: 'open' | 'fixed'; duration_minutes: number }
}) {
  const { timerDisplay, isExpired } = useSessionTimer(
    session?.started_at ?? '',
    table.hourly_rate,
    !!session,
    session?.billing_type,
    session?.duration_minutes,
  )

  const occupied = !!session
  const isFixed = session?.billing_type === 'fixed'

  return (
    <div className={`rounded-2xl border-2 p-8 flex flex-col gap-5 transition-all h-full ${
      isExpired
        ? 'border-red-600 bg-red-950/30'
        : occupied
        ? 'border-yellow-600 bg-yellow-950/20'
        : 'border-green-700 bg-green-950/20'
    }`}>
      {/* Table name & status */}
      <div className="flex items-center justify-between">
        <span className="text-3xl font-bold text-white">{table.name}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          isExpired
            ? 'bg-red-500/20 text-red-400'
            : occupied
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-green-500/20 text-green-400'
        }`}>
          {isExpired ? 'Habis' : occupied ? 'Dipakai' : 'Tersedia'}
        </span>
      </div>

      {/* Session info */}
      {session ? (
        <div className="space-y-2">
          <p className="text-xl font-semibold text-gray-200 truncate">{session.customer_name}</p>
          <div className={`flex items-center gap-2 font-mono text-5xl font-bold ${
            isExpired ? 'text-red-400' : 'text-brand-400'
          }`}>
            <Clock className="h-5 w-5 shrink-0" />
            {isFixed
              ? (isExpired ? 'HABIS' : timerDisplay)
              : timerDisplay}
          </div>
          <p className="text-xs text-gray-500">
            {isFixed ? 'Durasi Tetap' : 'Open Billing'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl text-green-400 font-medium">Siap Digunakan</p>
          <p className="text-base text-gray-500">Rp {(table.hourly_rate / 1000).toFixed(0)}k/jam</p>
        </div>
      )}
    </div>
  )
}
