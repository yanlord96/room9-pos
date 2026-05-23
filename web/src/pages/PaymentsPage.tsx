import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { paymentsApi, type Payment } from '@/lib/api'
import { formatRp, formatDateTime } from '@/lib/utils'
import { Banknote, QrCode, Building2, Receipt } from 'lucide-react'

const METHOD_STYLE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  cash:     { label: 'Cash',     cls: 'badge-green',  icon: Banknote  },
  qris:     { label: 'QRIS',     cls: 'badge bg-purple-900/50 text-purple-400 border border-purple-800', icon: QrCode   },
  transfer: { label: 'Transfer', cls: 'badge bg-blue-900/50 text-blue-400 border border-blue-800',       icon: Building2 },
}

export default function PaymentsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.list,
    staleTime: 0,
  })

  const payments = data?.payments ?? []

  // summary by method
  const summary = payments.reduce<Record<string, { count: number; total: number }>>((acc, p) => {
    const m = p.payment_method || 'cash'
    if (!acc[m]) acc[m] = { count: 0, total: 0 }
    acc[m].count++
    acc[m].total += p.total_amount
    return acc
  }, {})

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Payments</h1>
        <p className="text-sm text-gray-500">{payments.length} completed transactions</p>
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
                <p className="text-lg font-bold text-white">{formatRp(Math.ceil(s.total / 1000) * 1000)}</p>
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
                  No payments yet
                </td>
              </tr>
            ) : (
              payments.map((p) => <PaymentRow key={p.id} payment={p} onReceipt={() => navigate(`/bookings/${p.id}/receipt`)} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PaymentRow({ payment: p, onReceipt }: { payment: Payment; onReceipt: () => void }) {
  const m = METHOD_STYLE[p.payment_method] ?? METHOD_STYLE.cash
  const Icon = m.icon
  return (
    <tr className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-3 text-gray-500 text-xs">#{String(p.id).padStart(4, '0')}</td>
      <td className="px-4 py-3">
        <p className="text-white font-medium">{p.customer_name}</p>
        <p className="text-xs text-gray-500">{p.customer_phone}</p>
      </td>
      <td className="px-4 py-3 text-gray-300">{p.table_name}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{p.ended_at ? formatDateTime(p.ended_at) : '—'}</td>
      <td className="px-4 py-3">
        <span className={`${m.cls} flex items-center gap-1 w-fit`}>
          <Icon className="h-3 w-3" />{m.label}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-300 text-right">{formatRp(p.table_charge)}</td>
      <td className="px-4 py-3 text-gray-300 text-right">{formatRp(p.fnb_charge)}</td>
      <td className="px-4 py-3 text-brand-400 font-semibold text-right">{formatRp(p.total_amount)}</td>
      <td className="px-4 py-3">
        <button onClick={onReceipt} className="btn-ghost btn-sm p-1.5" title="View receipt">
          <Receipt className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}
