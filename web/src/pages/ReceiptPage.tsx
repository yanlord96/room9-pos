import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '@/lib/api'
import { formatRp, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Printer, Circle } from 'lucide-react'

const thermalPrintStyle = `
@media print {
  @page {
    size: 80mm auto;
    margin: 0;
  }
  body {
    margin: 0;
    padding: 0;
    width: 80mm;
    font-size: 12px;
    font-family: 'Courier New', Courier, monospace;
    color: #000 !important;
    background: #fff !important;
  }
  * {
    color: #000 !important;
    background: transparent !important;
    border-color: #000 !important;
    box-shadow: none !important;
  }
}
`

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => bookingsApi.receipt(Number(id)),
  })

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  )

  const { session, orders, duration } = data!

  return (
    <div className="p-6">
      <style>{thermalPrintStyle}</style>
      {/* Screen controls — hidden on print */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <button onClick={() => navigate('/bookings')} className="btn-secondary btn-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Bookings
        </button>
        <button onClick={() => window.print()} className="btn-primary btn-sm">
          <Printer className="h-4 w-4" />
          Print Receipt
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
          <p className="text-xs text-gray-500 print:text-gray-600">Official Receipt</p>
          <div className="my-4 border-t border-dashed border-gray-700 print:border-gray-300" />
        </div>

        {/* Session info */}
        <div className="space-y-2 mb-4">
          <ReceiptRow label="Table" value={session.table_name} />
          <ReceiptRow label="Customer" value={session.customer_name} />
          <ReceiptRow label="Phone" value={session.customer_phone || '—'} />
          <ReceiptRow label="Started" value={formatDateTime(session.started_at)} />
          {session.ended_at && <ReceiptRow label="Ended" value={formatDateTime(session.ended_at)} />}
          <ReceiptRow label="Duration" value={duration} />
          <ReceiptRow label="Payment" value={
            session.payment_method === 'qris' ? 'QRIS' :
            session.payment_method === 'transfer' ? 'Transfer' : 'Cash'
          } />
        </div>

        <div className="border-t border-dashed border-gray-700 print:border-gray-300 my-4" />

        {/* Orders */}
        {orders.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 print:text-gray-600">
              Food & Beverages
            </p>
            <div className="space-y-2 mb-4">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 print:text-gray-700">
                    {o.item_name} × {o.quantity}
                  </span>
                  <span className="text-gray-200 print:text-gray-800 font-medium">
                    {formatRp(o.quantity * o.unit_price)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-gray-700 print:border-gray-300 my-4" />
          </>
        )}

        {/* Totals */}
        <div className="space-y-2 mb-6">
          <ReceiptRow label="Table Charge" value={formatRp(session.table_charge)} />
          <ReceiptRow label="F&B Total" value={formatRp(session.fnb_charge)} />
          <div className="border-t border-gray-700 print:border-gray-300 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white print:text-black">TOTAL</span>
              <span className="text-base font-bold text-brand-400 print:text-black">
                {formatRp(session.total_amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 print:text-gray-500">
          <p>Thank you for playing at Room 9!</p>
          <p className="mt-1">Receipt #{session.id.toString().padStart(6, '0')}</p>
        </div>
      </div>
    </div>
  )
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between text-sm gap-4">
      <span className="text-gray-500 print:text-gray-600 shrink-0">{label}</span>
      <span className="text-gray-200 print:text-gray-800 text-right">{value}</span>
    </div>
  )
}
