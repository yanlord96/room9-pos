import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '@/lib/api'
import { Search, Plus, Pencil, Trash2, X, Check, User } from 'lucide-react'

export default function CustomersPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<{ id?: number; name: string; phone: string } | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', q],
    queryFn: () => customersApi.list(q),
  })

  const save = useMutation({
    mutationFn: () =>
      form!.id
        ? customersApi.update(form!.id, { name: form!.name, phone: form!.phone })
        : customersApi.create({ name: form!.name, phone: form!.phone }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setForm(null)
    },
  })

  const del = useMutation({
    mutationFn: (id: number) => customersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      setDeleteId(null)
    },
  })

  const customers = data?.customers ?? []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} registered</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setForm({ name: '', phone: '' })}
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          className="input pl-9"
          placeholder="Search by name or phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-800 rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-800 rounded animate-pulse" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-gray-600">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No customers found
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-gray-400">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setForm({ id: c.id, name: c.name, phone: c.phone })}
                        className="btn-ghost p-1.5 btn-sm"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="btn-ghost p-1.5 btn-sm text-red-500 hover:text-red-400"
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
        <Modal
          title={form.id ? 'Edit Customer' : 'New Customer'}
          onClose={() => setForm(null)}
        >
          <form
            onSubmit={(e) => { e.preventDefault(); save.mutate() }}
            className="space-y-4"
          >
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08xx-xxxx-xxxx"
              />
            </div>
            {save.isError && <p className="text-sm text-red-400">{save.error.message}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={save.isPending}>
                <Check className="h-4 w-4" />
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <Modal title="Delete Customer?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-400 mb-4">This cannot be undone.</p>
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
