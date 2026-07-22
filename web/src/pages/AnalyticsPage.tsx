import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api'
import { formatRp, MONTH_NAMES } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Table2, UtensilsCrossed, Trophy } from 'lucide-react'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function fmtHours(h: number): string {
  if (h <= 0) return '—'
  const totalMin = Math.round(h * 60)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}j`
  return `${hours}j ${mins}m`
}

export default function AnalyticsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', year, month],
    queryFn: () => analyticsApi.get(year, month),
  })

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const tableUsage = data?.table_usage ?? []
  const productSales = data?.product_sales ?? []
  const totalHours = tableUsage.reduce((sum, t) => sum + t.total_hours, 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-gray-500">Utilisasi meja & produk terlaris</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
          <button onClick={prevMonth} className="btn-ghost p-1"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-white w-28 text-center">{MONTH_SHORT[month - 1]} {year}</span>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="btn-ghost p-1 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table utilization */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Table2 className="h-4 w-4 text-brand-400" />
          <span className="text-sm font-medium text-gray-300">Utilisasi Meja · {MONTH_NAMES[month - 1]} {year}</span>
          {totalHours > 0 && <span className="text-xs text-gray-600 ml-1">· total {fmtHours(totalHours)}</span>}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Meja</th>
              <th className="px-4 py-3 text-right">Sesi</th>
              <th className="px-4 py-3 text-right">Total Jam</th>
              <th className="px-4 py-3 text-right">Rata²/Sesi</th>
              <th className="px-4 py-3 text-right">Rata²/Hari</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : tableUsage.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">Tidak ada data</td></tr>
            ) : (
              tableUsage.map((t) => (
                <tr key={t.table_name} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white font-medium">{t.table_name}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{t.sessions}</td>
                  <td className="px-4 py-3 text-brand-400 font-semibold text-right">{fmtHours(t.total_hours)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{fmtHours(t.avg_hours_per_use)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{fmtHours(t.avg_hours_per_day)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Best-selling F&B */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium text-gray-300">Produk F&B Terlaris · {MONTH_NAMES[month - 1]} {year}</span>
          <span className="text-xs text-gray-600 ml-1">· buat panduan belanja stok</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Produk</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-right">Qty Terjual</th>
              <th className="px-4 py-3 text-right">Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : productSales.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">Tidak ada penjualan</td></tr>
            ) : (
              productSales.map((p, i) => (
                <tr key={p.item_name} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {i < 3 ? <Trophy className={`h-4 w-4 ${['text-yellow-400', 'text-gray-300', 'text-orange-600'][i]}`} /> : i + 1}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{p.item_name}</td>
                  <td className="px-4 py-3 text-gray-400">{p.item_category}</td>
                  <td className="px-4 py-3 text-orange-400 font-semibold text-right">{p.qty_sold}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRp(p.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
