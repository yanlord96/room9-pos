import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/lib/api'
import { formatRp, MONTH_NAMES } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Check, Receipt } from 'lucide-react'

const CATEGORIES = ['Utilities', 'Supplies', 'Maintenance', 'Salary', 'Rent', 'Other']

type FormState = {
  id?: number
  amount: string
  category: string
  description: string
  expense_date: string
}

export default function ExpensesPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [form, setForm] = useState<FormState | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', year, month],
    queryFn: () => expensesApi.list(year, month),
    staleTime: 0,
  })

  const save = useMutation<unknown, Error, void>({
    mutationFn: () => {
      const payload = {
        amount: Number(form!.amount),
        category: form!.category,
        description: form!.description,
        expense_date: form!.expense_date,
      }
      return form!.id ? expensesApi.update(form!.id, payload) : expensesApi.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setForm(null) },
  })

  const del = useMutation({
    mutationFn: (id: number) => expensesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setDeleteId(null) },
  })

  const expenses = data?.expenses ?? []
  const total = data?.total ?? 0
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})

  const blankForm = (): FormState => ({
    amount: '',
    category: CATEGORIES[0],
    description: '',
    expense_date: now.toISOString().slice(0, 10),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Expenses</h1>
          <p className="text-sm text-gray-500">{expenses.length} records · {MONTH_NAMES[month - 1]} {year}</p>
        </div>
        <button className="btn-primary" onClick={() => setForm(blankForm())}>
          <Plus className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input w-36" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Total Pengeluaran</p>
          <p className="text-xl font-bold text-red-400">{formatRp(total)}</p>
        </div>
        {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
          <div key={cat} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{cat}</p>
            <p className="text-base font-bold text-white">{formatRp(amt)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">By</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  Belum ada pengeluaran bulan ini
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-sm">{e.expense_date}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-200">{e.description}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.created_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-400">{formatRp(e.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setForm({ id: e.id, amount: String(e.amount), category: e.category, description: e.description, expense_date: e.expense_date })}
                        className="btn-ghost btn-sm p-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(e.id)}
                        className="btn-ghost btn-sm p-1.5 text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {form !== null && (
        <Modal title={form.id ? 'Edit Expense' : 'Add Expense'} onClose={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-4">
            <div>
              <label className="label">Tanggal *</label>
              <input className="input" type="date" required value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Kategori *</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Keterangan *</label>
              <input className="input" required placeholder="e.g. Tagihan listrik Mei" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Jumlah (IDR) *</label>
              <input className="input" type="number" required min="1" placeholder="0" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            {save.isError && <p className="text-sm text-red-400">{save.error.message}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={save.isPending}>
                <Check className="h-4 w-4" />{save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <Modal title="Hapus pengeluaran?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-400 mb-4">Data tidak bisa dikembalikan.</p>
          {del.isError && <p className="text-sm text-red-400 mb-2">{del.error.message}</p>}
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn-danger flex-1" disabled={del.isPending} onClick={() => del.mutate(deleteId)}>
              {del.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
