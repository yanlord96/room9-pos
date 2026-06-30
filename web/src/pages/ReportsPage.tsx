import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { reportsApi } from '@/lib/api'
import { formatRp, calcPB1, roundToHundred, MONTH_NAMES } from '@/lib/utils'
import { Printer, BarChart3, ChevronDown, ChevronRight, Lock, Unlock, X, Eye, EyeOff } from 'lucide-react'

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const
type Period = typeof PERIODS[number]

export default function ReportsPage() {
  const now = new Date()
  const [period, setPeriod] = useState<Period>('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [fullView, setFullView] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['reports', period, year, month, fullView],
    queryFn: () => reportsApi.get({ period, year, month, full: fullView }),
  })

  const { data: drilldown, isLoading: drillLoading } = useQuery({
    queryKey: ['reports-drill', year, selectedMonth, fullView],
    queryFn: () => reportsApi.get({ period: 'daily', year, month: selectedMonth!, full: fullView }),
    enabled: !!selectedMonth,
  })

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  const handleMonthClick = (periodLabel: string) => {
    if (period !== 'monthly') return
    const mn = MONTH_NAMES.indexOf(periodLabel) + 1
    setSelectedMonth(selectedMonth === mn ? null : mn)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Reports</h1>
            <p className="text-sm text-gray-500">Financial summary</p>
          </div>
          <button
            onClick={() => fullView ? setFullView(false) : setShowPasswordModal(true)}
            className={`p-2 rounded-lg transition-colors ${fullView ? 'bg-brand-600/20 text-brand-400 hover:bg-brand-600/30' : 'btn-ghost text-gray-500 hover:text-white'}`}
            title={fullView ? 'Kunci kembali' : ''}
          >
            {fullView ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </button>
        </div>
        <button onClick={() => window.print()} className="btn-secondary btn-sm print:hidden">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {showPasswordModal && (
        <OwnerPasswordModal
          onSuccess={() => { setFullView(true); setShowPasswordModal(false) }}
          onClose={() => setShowPasswordModal(false)}
        />
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 print:hidden">
        <div>
          <label className="label">Period</label>
          <select className="input w-36" value={period} onChange={(e) => { setPeriod(e.target.value as Period); setSelectedMonth(null) }}>
            {PERIODS.map((p) => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <select className="input w-28" value={year} onChange={(e) => { setYear(Number(e.target.value)); setSelectedMonth(null) }}>
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
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Sessions" value={String(data.grand.sessions)} />
            <SummaryCard label="Table Revenue" value={formatRp(data.grand.table_charge)} />
            <SummaryCard label="F&B Revenue" value={formatRp(data.grand.fnb_charge)} />
            <SummaryCard label="Total Revenue" value={formatRp(data.grand.total)} highlight />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.grand.fnb_charge > 0 && (
              <div className="card p-4 border-orange-900/40 bg-orange-950/20">
                <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide mb-3">PB1 — Pajak Restoran (10%)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dasar (F&B)</p>
                    <p className="text-sm font-bold text-gray-200">{formatRp(data.grand.fnb_charge)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">PB1 (10%)</p>
                    <p className="text-sm font-bold text-orange-400">{formatRp(calcPB1(data.grand.fnb_charge))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Incl. PB1</p>
                    <p className="text-sm font-bold text-orange-300">{formatRp(roundToHundred(data.grand.fnb_charge + calcPB1(data.grand.fnb_charge)))}</p>
                  </div>
                </div>
              </div>
            )}
            {data.grand.table_charge > 0 && (
              <div className="card p-4 border-yellow-900/40 bg-yellow-950/20">
                <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide mb-3">PH — Pajak Hiburan Billiard (10%)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dasar (Table)</p>
                    <p className="text-sm font-bold text-gray-200">{formatRp(data.grand.table_charge)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">PH (10%)</p>
                    <p className="text-sm font-bold text-yellow-400">{formatRp(calcPB1(data.grand.table_charge))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Incl. Pajak</p>
                    <p className="text-sm font-bold text-yellow-300">{formatRp(roundToHundred(data.grand.table_charge + calcPB1(data.grand.table_charge)))}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Main table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300 capitalize">{period} breakdown · {year}</span>
          {period === 'monthly' && <span className="text-xs text-gray-600 ml-1">· klik bulan untuk detail harian</span>}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-right">Table</th>
              <th className="px-4 py-3 text-right">F&B</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right text-yellow-500">PH (10%)</th>
              <th className="px-4 py-3 text-right text-orange-500">PB1 F&B</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : data!.summaries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-600">No data for this period</td>
              </tr>
            ) : (
              data!.summaries.map((s) => {
                const mn = period === 'monthly' ? MONTH_NAMES.indexOf(s.period) + 1 : null
                const isExpanded = mn !== null && selectedMonth === mn
                return (
                  <tr
                    key={s.period}
                    className={`border-b border-gray-800 last:border-0 transition-colors ${period === 'monthly' ? 'cursor-pointer hover:bg-gray-800/40' : 'hover:bg-gray-800/30'} ${isExpanded ? 'bg-gray-800/40' : ''}`}
                    onClick={() => handleMonthClick(s.period)}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      <span className="flex items-center gap-1.5">
                        {period === 'monthly' && (
                          isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            : <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                        )}
                        {s.period}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right">{formatRp(s.table_charge)}</td>
                    <td className="px-4 py-3 text-gray-300 text-right">{formatRp(s.fnb_charge)}</td>
                    <td className="px-4 py-3 text-brand-400 font-semibold text-right">{formatRp(s.total)}</td>
                    <td className="px-4 py-3 text-yellow-400 font-semibold text-right">
                      {s.table_charge > 0 ? formatRp(calcPB1(s.table_charge)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-orange-400 font-semibold text-right">
                      {s.fnb_charge > 0 ? formatRp(calcPB1(s.fnb_charge)) : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Daily drill-down */}
      {selectedMonth && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-medium text-white">
              Daily breakdown · {MONTH_NAMES[selectedMonth - 1]} {year}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-right">Table</th>
                <th className="px-4 py-3 text-right">F&B</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right text-yellow-500">PH (10%)</th>
                <th className="px-4 py-3 text-right text-orange-500">PB1 F&B</th>
              </tr>
            </thead>
            <tbody>
              {drillLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : !drilldown || drilldown.summaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-600">Tidak ada transaksi</td>
                </tr>
              ) : (
                drilldown.summaries.map((s) => (
                  <tr key={s.period} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-white font-medium">
                      {MONTH_NAMES[selectedMonth - 1]} {s.period}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-right">{formatRp(s.table_charge)}</td>
                    <td className="px-4 py-3 text-gray-300 text-right">{formatRp(s.fnb_charge)}</td>
                    <td className="px-4 py-3 text-brand-400 font-semibold text-right">{formatRp(s.total)}</td>
                    <td className="px-4 py-3 text-yellow-400 font-semibold text-right">
                      {s.table_charge > 0 ? formatRp(calcPB1(s.table_charge)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-orange-400 font-semibold text-right">
                      {s.fnb_charge > 0 ? formatRp(calcPB1(s.fnb_charge)) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OwnerPasswordModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const verify = useMutation({
    mutationFn: () => reportsApi.verify(password),
    onSuccess: () => onSuccess(),
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-brand-400" />
            <h2 className="text-base font-semibold text-white">Owner Access</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-gray-500">Masukkan password owner untuk melihat revenue sesungguhnya.</p>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            className="input w-full pr-10"
            placeholder="Password owner"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && password && verify.mutate()}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Batal</button>
          <button
            className="btn-primary flex-1"
            disabled={!password || verify.isPending}
            onClick={() => verify.mutate()}
          >
            {verify.isPending ? 'Memverifikasi…' : 'Buka'}
          </button>
        </div>
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
