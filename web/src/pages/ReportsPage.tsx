import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { formatRp, MONTH_NAMES } from '@/lib/utils'
import { Printer, BarChart3 } from 'lucide-react'

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const
type Period = typeof PERIODS[number]

export default function ReportsPage() {
  const now = new Date()
  const [period, setPeriod] = useState<Period>('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading } = useQuery({
    queryKey: ['reports', period, year, month],
    queryFn: () => reportsApi.get({ period, year, month }),
  })

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Reports</h1>
          <p className="text-sm text-gray-500">Financial summary</p>
        </div>
        <button onClick={() => window.print()} className="btn-secondary btn-sm print:hidden">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 print:hidden">
        <div>
          <label className="label">Period</label>
          <select className="input w-36" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {PERIODS.map((p) => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <select className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {(period === 'daily' || period === 'weekly') && (
          <div>
            <label className="label">Month</label>
            <select className="input w-36" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Grand totals */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Sessions" value={String(data.grand.sessions)} />
          <SummaryCard label="Table Revenue" value={formatRp(data.grand.table_charge)} />
          <SummaryCard label="F&B Revenue" value={formatRp(data.grand.fnb_charge)} />
          <SummaryCard label="Total Revenue" value={formatRp(data.grand.total)} highlight />
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300 capitalize">{period} breakdown · {year}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-right">Sessions</th>
              <th className="px-4 py-3 text-right">Table</th>
              <th className="px-4 py-3 text-right">F&B</th>
              <th className="px-4 py-3 text-right">Total</th>
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
            ) : data!.summaries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-600">No data for this period</td>
              </tr>
            ) : (
              data!.summaries.map((s) => (
                <tr key={s.period} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white font-medium">{s.period}</td>
                  <td className="px-4 py-3 text-gray-400 text-right">{s.sessions}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRp(s.table_charge)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRp(s.fnb_charge)}</td>
                  <td className="px-4 py-3 text-brand-400 font-semibold text-right">{formatRp(s.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-brand-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}
