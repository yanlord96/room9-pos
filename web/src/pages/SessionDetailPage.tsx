import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi, ordersApi, type MenuItem, type Order } from '@/lib/api'
import { formatRp, formatDateTime } from '@/lib/utils'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { useAuth } from '@/hooks/useAuth'
import {
  ArrowLeft, Square, Plus, Minus, Trash2, ShoppingCart,
  Clock, User, Table2, X, Banknote, QrCode, Building2,
} from 'lucide-react'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const sessionId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => bookingsApi.detail(sessionId),
  })

  const [paymentModal, setPaymentModal] = useState(false)

  const endSession = useMutation({
    mutationFn: (paymentMethod: string) => bookingsApi.end(sessionId, paymentMethod),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      navigate(`/bookings/${sessionId}/receipt`)
    },
  })

  const addOrder = useMutation({
    mutationFn: (vars: { menu_item_id: number; quantity: number }) =>
      ordersApi.create({ session_id: sessionId, ...vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session', sessionId] }),
  })

  const deleteOrder = useMutation({
    mutationFn: (orderId: number) => ordersApi.delete(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session', sessionId] }),
  })

  const { isAdmin } = useAuth()
  const { charge: tableCharge, timerDisplay, isExpired } = useSessionTimer(
    data?.session.started_at ?? '',
    data?.session.hourly_rate ?? 0,
    data?.session.status === 'active',
    data?.session.billing_type,
    data?.session.duration_minutes,
  )

  if (isLoading) return <DetailSkeleton />

  const { session, orders, menu_items } = data!
  const fnbTotal = orders.reduce((sum, o) => sum + o.quantity * o.unit_price, 0)
  const grandTotal = tableCharge + fnbTotal

  const byCategory = menu_items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-800 px-6 py-4">
        <button onClick={() => navigate('/bookings')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <Table2 className="h-4 w-4 text-gray-400" />
            {session.table_name}
            <span className="badge-yellow ml-1">Active</span>
          </h1>
          <p className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{session.customer_name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(session.started_at)}</span>
            <span className={`font-mono font-semibold ${isExpired ? 'text-red-400' : 'text-brand-400'}`}>
              {session.billing_type === 'fixed'
                ? (isExpired ? '⚠ Time up' : `${timerDisplay} left`)
                : timerDisplay}
            </span>
          </p>
        </div>
        <button
          onClick={() => setPaymentModal(true)}
          disabled={endSession.isPending}
          className="btn-danger"
        >
          <Square className="h-4 w-4" />
          {endSession.isPending ? 'Ending…' : 'End Session'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: order list + totals */}
        <div className="flex w-80 shrink-0 flex-col border-r border-gray-800">
          {/* Charges */}
          {isAdmin && (
            <div className="p-4 space-y-3 border-b border-gray-800">
              <ChargeRow label="Table Charge" value={tableCharge} highlight />
              <ChargeRow label="F&B" value={fnbTotal} />
              <div className="border-t border-gray-700 pt-3">
                <ChargeRow label="Grand Total" value={grandTotal} bold />
              </div>
            </div>
          )}

          {/* Orders */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Orders</p>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-600 text-center mt-8">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <OrderItem
                    key={o.id}
                    order={o}
                    onDelete={() => deleteOrder.mutate(o.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {paymentModal && (
        <PaymentModal
          total={grandTotal}
          isPending={endSession.isPending}
          showTotal={isAdmin}
          onConfirm={(method) => endSession.mutate(method)}
          onClose={() => setPaymentModal(false)}
        />
      )}

      {/* Right: menu */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Menu</p>
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category} className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{category}</p>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAdd={(qty) => addOrder.mutate({ menu_item_id: item.id, quantity: qty })}
                    isPending={addOrder.isPending}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChargeRow({
  label, value, highlight, bold,
}: { label: string; value: number; highlight?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-white' : 'text-gray-400'}`}>{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-yellow-400' : bold ? 'text-white' : 'text-gray-200'}`}>
        {formatRp(value)}
      </span>
    </div>
  )
}

function OrderItem({ order, onDelete }: { order: Order; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-800 px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-200 truncate">{order.item_name}</p>
        <p className="text-xs text-gray-500">{order.quantity} × {formatRp(order.unit_price)}</p>
      </div>
      <span className="text-xs font-semibold text-gray-300">
        {formatRp(order.quantity * order.unit_price)}
      </span>
      <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function MenuItemCard({
  item, onAdd, isPending,
}: { item: MenuItem; onAdd: (qty: number) => void; isPending: boolean }) {
  const [qty, setQty] = useState(1)

  return (
    <div className="card p-3 space-y-2">
      <div>
        <p className="text-sm font-medium text-white leading-tight">{item.name}</p>
        <p className="text-xs text-brand-400 font-semibold">{formatRp(item.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-gray-800 p-0.5">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="p-1 text-gray-400 hover:text-white"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-6 text-center text-xs font-medium text-white">{qty}</span>
          <button
            onClick={() => setQty(qty + 1)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <button
          onClick={() => { onAdd(qty); setQty(1) }}
          disabled={isPending}
          className="btn-primary btn-sm flex-1"
        >
          <ShoppingCart className="h-3 w-3" />
          Add
        </button>
      </div>
    </div>
  )
}

function PaymentModal({ total, isPending, showTotal, onConfirm, onClose }: {
  total: number
  isPending: boolean
  showTotal?: boolean
  onConfirm: (method: string) => void
  onClose: () => void
}) {
  const [method, setMethod] = useState('cash')

  const methods = [
    { value: 'cash', label: 'Cash', icon: Banknote, color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-700' },
    { value: 'qris', label: 'QRIS', icon: QrCode, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-700' },
    { value: 'transfer', label: 'Transfer', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-700' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Select Payment Method</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="h-4 w-4" /></button>
        </div>

        {showTotal && (
          <div className="text-center py-2">
            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-white">{formatRp(total)}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {methods.map(({ value, label, icon: Icon, color, bg, border }) => (
            <button
              key={value}
              onClick={() => setMethod(value)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                method === value ? `${bg} ${border} ${color}` : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={isPending}>Cancel</button>
          <button className="btn-primary flex-1" disabled={isPending} onClick={() => onConfirm(method)}>
            <Square className="h-4 w-4" />
            {isPending ? 'Processing…' : 'Confirm & End'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-800 rounded" />
      <div className="flex gap-4">
        <div className="w-80 h-96 bg-gray-800 rounded-xl" />
        <div className="flex-1 h-96 bg-gray-800 rounded-xl" />
      </div>
    </div>
  )
}
