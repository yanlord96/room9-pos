import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { menuApi, walkinApi, type MenuItem } from '@/lib/api'
import { formatRp } from '@/lib/utils'
import { Plus, Minus, Trash2, ShoppingCart, X, Banknote, QrCode, Building2, CheckCircle } from 'lucide-react'

type CartItem = {
  item: MenuItem
  quantity: number
}

export default function WalkinPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [note, setNote] = useState('')
  const [paymentModal, setPaymentModal] = useState(false)

  const { data } = useQuery({ queryKey: ['menu'], queryFn: menuApi.list })

  const checkout = useMutation({
    mutationFn: (paymentMethod: string) =>
      walkinApi.checkout({
        payment_method: paymentMethod,
        note,
        items: cart.map((c) => ({ menu_item_id: c.item.id, quantity: c.quantity })),
      }),
    onSuccess: (res) => navigate(`/walk-in/${res.order_id}/receipt`),
  })

  const items = data?.items ?? []
  const byCategory = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!item.is_available) return acc
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const total = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0)
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0)

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (existing) return prev.map((c) => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { item, quantity: 1 }]
    })
  }

  const updateQty = (itemId: number, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((c) => c.item.id !== itemId))
    else setCart((prev) => prev.map((c) => c.item.id === itemId ? { ...c, quantity: qty } : c))
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-white">Walk-in Order</h1>
          <p className="text-xs text-gray-500">Order F&B tanpa booking meja</p>
        </div>
        {totalItems > 0 && (
          <button
            onClick={() => setPaymentModal(true)}
            className="btn-primary"
          >
            <ShoppingCart className="h-4 w-4" />
            Checkout · {formatRp(total)}
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Cart */}
        <div className="flex w-72 shrink-0 flex-col border-r border-gray-800">
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Keranjang {totalItems > 0 ? `(${totalItems})` : ''}
            </p>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-16 text-gray-700">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Keranjang kosong</p>
                <p className="text-xs">Pilih menu di sebelah kanan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.item.id} className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200 truncate">{c.item.name}</p>
                      <p className="text-xs text-gray-500">{formatRp(c.item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-gray-700 p-0.5">
                      <button onClick={() => updateQty(c.item.id, c.quantity - 1)} className="p-1 text-gray-400 hover:text-white">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-medium text-white">{c.quantity}</span>
                      <button onClick={() => updateQty(c.item.id, c.quantity + 1)} className="p-1 text-gray-400 hover:text-white">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => updateQty(c.item.id, 0)} className="text-gray-600 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note & Total */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-800 space-y-3">
              <textarea
                className="input text-xs resize-none h-16"
                placeholder="Catatan (opsional)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total</span>
                <span className="text-base font-bold text-white">{formatRp(total)}</span>
              </div>
              <button onClick={() => setPaymentModal(true)} className="btn-primary w-full">
                <ShoppingCart className="h-4 w-4" />
                Checkout
              </button>
            </div>
          )}
        </div>

        {/* Right: Menu */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Menu</p>
          {Object.entries(byCategory).map(([category, catItems]) => (
            <div key={category} className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{category}</p>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                {catItems.map((item) => {
                  const outOfStock = item.stock !== -1 && item.stock === 0
                  const inCart = cart.find((c) => c.item.id === item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => !outOfStock && addToCart(item)}
                      disabled={outOfStock}
                      className={`card p-3 text-left transition-all hover:border-gray-600 active:scale-95 ${
                        outOfStock ? 'opacity-40 cursor-not-allowed' : ''
                      } ${inCart ? 'border-brand-500/50 bg-brand-900/10' : ''}`}
                    >
                      <p className="text-sm font-medium text-white leading-tight">{item.name}</p>
                      <p className="text-xs text-brand-400 font-semibold mt-0.5">{formatRp(item.price)}</p>
                      <div className="flex items-center justify-between mt-2">
                        {item.stock !== -1 && (
                          <span className={`text-xs ${outOfStock ? 'text-red-400' : item.stock <= 5 ? 'text-yellow-400' : 'text-gray-600'}`}>
                            {outOfStock ? 'Habis' : `Stok: ${item.stock}`}
                          </span>
                        )}
                        {inCart && (
                          <span className="text-xs font-semibold text-brand-400 ml-auto flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />{inCart.quantity}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          total={total}
          isPending={checkout.isPending}
          onConfirm={(method) => checkout.mutate(method)}
          onClose={() => setPaymentModal(false)}
        />
      )}
    </div>
  )
}

function PaymentModal({ total, isPending, onConfirm, onClose }: {
  total: number
  isPending: boolean
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
          <h2 className="text-base font-semibold text-white">Pilih Pembayaran</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <div className="text-center py-2">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-white">{formatRp(total)}</p>
        </div>
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
          <button className="btn-secondary flex-1" onClick={onClose} disabled={isPending}>Batal</button>
          <button className="btn-primary flex-1" disabled={isPending} onClick={() => onConfirm(method)}>
            <CheckCircle className="h-4 w-4" />
            {isPending ? 'Memproses…' : 'Konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  )
}
