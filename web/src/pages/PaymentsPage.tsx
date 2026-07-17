import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { paymentsApi, type Payment } from '@/lib/api'
import { formatRp, formatDateTime } from '@/lib/utils'
import { Banknote, QrCode, Building2, Receipt, Trash2, Eye, EyeOff, X, ChevronLeft, ChevronRight } from 'lucide-react'

const METHOD_STYLE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  cash:     { label: 'Cash',     cls: 'badge-green',  icon: Banknote  },
  qris:     { label: 'QRIS',     cls: 'badge bg-purple-900/50 text-purple-400 border border-purple-800', icon: QrCode   },
  transfer: { label: 'Transfer', cls: 'badge bg-blue-900/50 text-blue-400 border border-blue-800',       icon: Building2 },
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export default function PaymentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: 'table' | 'walkin' } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['payments', year, month],
    queryFn: () => paymentsApi.list(year, month),
    staleTime: 0,
  })

  const payments = data?.payments ?? []

  const summary = payments.reduce<Record<string, { count: number; total: number }>>((acc, p) => {
    const m = p.payment_method || 'cash'
    if (!acc[m]) acc[m] = { count: 0, total: 0 }
    acc[m].count++
    acc[m].total += p.total_amount
    return acc
  }, {})

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Payments</h1>
          <p className="text-sm text-gray-500">{payments.length} transactions</p>
        </div>

        {/* Month picker */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
          <button onClick={prevMonth} className="btn-ghost p-1">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-white w-28 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="btn-ghost p-1 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && payments.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(['cash', 'qris', 'transfer'] as const).map((m) => {
            const s = summary[m] ?? { count: 0, total: 0 }
            const { label, icon: Icon } = METHOD_STYLE[m]
            return (
              <div key={m} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-400">{label}</span>
                </div>
                <p className="text-lg font-bold text-white">{formatRp(s.total)}</p>
                <p className="text-xs text-gray-500">{s.count} transaction{s.count !== 1 ? 's' : ''}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Table</th>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-right">Table</th>
              <th className="px-4 py-3 text-right">F&B</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-600">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Tidak ada transaksi di {MONTH_NAMES[month - 1]} {year}
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <PaymentRow
                  key={`${p.type}-${p.id}`}
                  payment={p}
                  onReceipt={() => navigate(p.type === 'walkin' ? `/walk-in/${p.id}/receipt` : `/bookings/${p.id}/receipt`)}
                  onDelete={() => setDeleteTarget({ id: p.id, type: p.type })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            queryClient.invalidateQueries({ queryKey: ['payments'] })
          }}
        />
      )}
    </div>
  )
}

function PaymentRow({ payment: p, onReceipt, onDelete }: { payment: Payment; onReceipt: () => void; onDelete: () => void }) {
  const m = METHOD_STYLE[p.payment_method] ?? METHOD_STYLE.cash
  const Icon = m.icon
  return (
    <tr className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-3 text-gray-500 text-xs">#{String(p.id).padStart(4, '0')}</td>
      <td className="px-4 py-3">
        <p className="text-white font-medium">{p.customer_name}</p>
        <p className="text-xs text-gray-500">{p.customer_phone}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-gray-300">{p.table_name}</p>
        {p.type === 'walkin' && <span className="text-xs text-orange-400 font-medium">Walk-in</span>}
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(p.started_at)}</td>
      <td className="px-4 py-3">
        <span className={`${m.cls} flex items-center gap-1 w-fit`}>
          <Icon className="h-3 w-3" />{m.label}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-300 text-right">{p.type === 'walkin' ? '—' : formatRp(p.table_charge)}</td>
      <td className="px-4 py-3 text-gray-300 text-right">{p.type === 'walkin' ? '—' : formatRp(p.fnb_charge)}</td>
      <td className="px-4 py-3 text-brand-400 font-semibold text-right">{formatRp(p.total_amount)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={onReceipt} className="btn-ghost btn-sm p-1.5" title="View receipt">
            <Receipt className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="btn-ghost btn-sm p-1.5 text-red-500 hover:text-red-400" title="Delete transaction">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function DeleteModal({
  target,
  onClose,
  onDeleted,
}: {
  target: { id: number; type: 'table' | 'walkin' }
  onClose: () => void
  onDeleted: () => void
}) {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (pw: string) =>
      target.type === 'walkin'
        ? paymentsApi.deleteWalkin(target.id, pw)
        : paymentsApi.deleteSession(target.id, pw),
    onSuccess: onDeleted,
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate(password)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">Hapus Transaksi</h2>
            <p className="text-xs text-gray-500 mt-0.5">#{String(target.id).padStart(4, '0')} · {target.type === 'walkin' ? 'Walk-in' : 'Table session'}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Masukkan password owner untuk menghapus transaksi ini. Tindakan ini tidak bisa dibatalkan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password owner"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              className="input w-full pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-1"
            >
              {showPw ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Batal
            </button>
            <button
              type="submit"
              disabled={!password || mutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {mutation.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
