import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { walkinApi } from '@/lib/api'
import { formatRp, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Printer, Circle, UtensilsCrossed } from 'lucide-react'

const thermalPrintStyle = `
@media print {
  @page { size: 80mm auto; margin: 0; }
  body {
    margin: 0; padding: 0; width: 80mm;
    font-size: 12px;
    font-family: 'Courier New', Courier, monospace;
    color: #000 !important;
    background: #fff !important;
  }
  * { color: #000 !important; background: transparent !important; box-shadow: none !important; }
}
`

export default function WalkinReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['walkin-receipt', id],
    queryFn: () => walkinApi.receipt(Number(id)),
  })

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  )

  const { order, items } = data!

  return (
    <div className="p-6">
      <style>{thermalPrintStyle}</style>

      <div className="flex items-center gap-3 mb-6 print:hidden">
        <button onClick={() => navigate('/walk-in')} className="btn-secondary btn-sm">
          <ArrowLeft className="h-4 w-4" />
          Order Baru
        </button>
        <button onClick={() => window.print()} className="btn-primary btn-sm">
          <Printer className="h-4 w-4" />
          Print Struk
        </button>
        <button onClick={() => navigate(`/walk-in/${id}/kitchen`)} className="btn-secondary btn-sm text-orange-400 border-orange-700/50 hover:border-orange-600">
          <UtensilsCrossed className="h-4 w-4" />
          Print Dapur
        </button>
      </div>

      {/* Receipt */}
      <div className="mx-auto max-w-sm card p-6 print:shadow-none print:border-0 print:max-w-none print:p-2 print:w-[72mm]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 print:bg-gray-200">
              <Circle className="h-5 w-5 text-white fill-white print:fill-black print:text-black" />
            </div>
          </div>
          <h1 className="text-lg font-bold text-white print:text-black">Room 9 Billiard</h1>
          <p className="text-xs text-gray-500 print:text-gray-600">Walk-in Order</p>
          <div className="my-4 border-t border-dashed border-gray-700 print:border-gray-300" />
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4">
          <Row label="Waktu" value={formatDateTime(order.created_at)} />
          <Row label="Kasir" value={order.created_name} />
          <Row label="Pembayaran" value={
            order.payment_method === 'qris' ? 'QRIS' :
            order.payment_method === 'transfer' ? 'Transfer' : 'Cash'
          } />
          {order.note && <Row label="Catatan" value={order.note} />}
        </div>

        <div className="border-t border-dashed border-gray-700 print:border-gray-300 my-4" />

        {/* Items */}
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-300 print:text-gray-700">
                {item.item_name} × {item.quantity}
              </span>
              <span className="text-gray-200 print:text-gray-800 font-medium">
                {formatRp(item.quantity * item.unit_price)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-700 print:border-gray-300 my-4" />

        {/* Total */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-base font-bold text-white print:text-black">TOTAL</span>
          <span className="text-base font-bold text-brand-400 print:text-black">{formatRp(order.total)}</span>
        </div>

        <div className="text-center text-xs text-gray-500 print:text-gray-500">
          <p>Terima kasih telah berkunjung!</p>
          <p className="mt-1">Receipt #{String(order.id).padStart(6, '0')}</p>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between text-sm gap-4">
      <span className="text-gray-500 print:text-gray-600 shrink-0">{label}</span>
      <span className="text-gray-200 print:text-gray-800 text-right">{value}</span>
    </div>
  )
}
