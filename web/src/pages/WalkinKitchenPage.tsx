import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { walkinApi } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { ArrowLeft, Printer } from 'lucide-react'

const kitchenPrintStyle = `
@media print {
  @page { size: 80mm auto; margin: 0; }
  body {
    margin: 0; padding: 0; width: 80mm;
    font-family: 'Courier New', Courier, monospace;
    color: #000 !important;
    background: #fff !important;
  }
  * { color: #000 !important; background: transparent !important; box-shadow: none !important; }
}
`

export default function WalkinKitchenPage() {
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
  const now = new Date()

  return (
    <div className="p-6">
      <style>{kitchenPrintStyle}</style>

      <div className="flex items-center gap-3 mb-6 print:hidden">
        <button onClick={() => navigate(`/walk-in/${id}/receipt`)} className="btn-secondary btn-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button onClick={() => window.print()} className="btn-primary btn-sm">
          <Printer className="h-4 w-4" />
          Print Dapur
        </button>
      </div>

      {/* Kitchen Ticket */}
      <div className="mx-auto max-w-xs bg-white text-black p-4 print:p-2 print:max-w-none rounded-xl shadow print:shadow-none">
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
          <p className="text-2xl font-black tracking-widest">DAPUR</p>
          <p className="text-xs text-gray-500">Walk-in Order</p>
        </div>

        <div className="mb-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-xs font-bold text-gray-500">ORDER #</span>
            <span className="text-lg font-black">{String(order.id).padStart(6, '0')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-bold text-gray-500">WAKTU</span>
            <span className="text-xs">{formatDateTime(now.toISOString())}</span>
          </div>
          {order.note && (
            <div className="flex justify-between">
              <span className="text-xs font-bold text-gray-500">CATATAN</span>
              <span className="text-xs font-semibold text-right max-w-[60%]">{order.note}</span>
            </div>
          )}
        </div>

        <div className="border-t-2 border-dashed border-gray-400 my-3" />

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <span className="text-2xl font-black min-w-[2rem] text-center leading-none">{item.quantity}x</span>
              <div>
                <p className="text-base font-bold leading-tight">{item.item_name}</p>
                <p className="text-xs text-gray-500">{item.item_category}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-dashed border-gray-400 mt-3 pt-3">
          <p className="text-center text-xs text-gray-500">
            {items.reduce((sum, i) => sum + i.quantity, 0)} item · Segera diproses
          </p>
        </div>
      </div>
    </div>
  )
}
