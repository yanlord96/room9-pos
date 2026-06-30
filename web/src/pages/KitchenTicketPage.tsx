import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '@/lib/api'
import { ArrowLeft, Printer } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const kitchenPrintStyle = `
@media print {
  @page {
    size: 80mm auto;
    margin: 0;
  }
  body {
    margin: 0;
    padding: 0;
    width: 80mm;
    font-family: 'Courier New', Courier, monospace;
    color: #000 !important;
    background: #fff !important;
  }
  * {
    color: #000 !important;
    background: transparent !important;
    box-shadow: none !important;
  }
}
`

export default function KitchenTicketPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['session', Number(id)],
    queryFn: () => bookingsApi.detail(Number(id)),
  })

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  )

  const { session, orders } = data!
  const fnbOrders = orders.filter((o) => o.item_category !== undefined)
  const now = new Date()

  return (
    <div className="p-6">
      <style>{kitchenPrintStyle}</style>

      {/* Screen controls */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <button onClick={() => navigate(`/bookings/${id}`)} className="btn-secondary btn-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button onClick={() => window.print()} className="btn-primary btn-sm">
          <Printer className="h-4 w-4" />
          Print Kitchen Ticket
        </button>
      </div>

      {/* Kitchen Ticket */}
      <div className="mx-auto max-w-xs bg-white text-black p-4 print:p-2 print:max-w-none rounded-xl shadow print:shadow-none">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
          <p className="text-2xl font-black tracking-widest">DAPUR</p>
          <p className="text-xs text-gray-500 print:text-gray-600">Kitchen Order Ticket</p>
        </div>

        {/* Table & customer info */}
        <div className="mb-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-xs font-bold text-gray-500">MEJA</span>
            <span className="text-lg font-black">{session.table_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-bold text-gray-500">PELANGGAN</span>
            <span className="text-sm font-semibold">{session.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-bold text-gray-500">WAKTU</span>
            <span className="text-xs">{formatDateTime(now.toISOString())}</span>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-gray-400 my-3" />

        {/* Orders */}
        {fnbOrders.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">Tidak ada pesanan</p>
        ) : (
          <div className="space-y-3">
            {fnbOrders.map((o) => (
              <div key={o.id} className="flex items-start gap-2">
                <span className="text-2xl font-black min-w-[2rem] text-center leading-none">{o.quantity}x</span>
                <div>
                  <p className="text-base font-bold leading-tight">{o.item_name}</p>
                  <p className="text-xs text-gray-500">{o.item_category}</p>
                  {o.note && (
                    <p className="text-xs font-semibold mt-0.5">* {o.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t-2 border-dashed border-gray-400 mt-3 pt-3">
          <p className="text-center text-xs text-gray-500">
            {fnbOrders.reduce((sum, o) => sum + o.quantity, 0)} item · Segera diproses
          </p>
        </div>
      </div>
    </div>
  )
}
