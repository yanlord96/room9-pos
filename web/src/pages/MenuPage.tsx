import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { menuApi, type MenuItem } from '@/lib/api'
import { formatRp } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Check, UtensilsCrossed } from 'lucide-react'

type FormState = { id?: number; name: string; category: string; price: string; is_available: boolean }

export default function MenuPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['menu'], queryFn: menuApi.list })

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form!.name,
        category: form!.category,
        price: Number(form!.price),
        is_available: form!.is_available,
      }
      return form!.id ? menuApi.update(form!.id, payload) : menuApi.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu'] }); setForm(null) },
  })

  const del = useMutation({
    mutationFn: (id: number) => menuApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['menu'] }); setDeleteId(null) },
  })

  const items = data?.items ?? []
  const byCategory = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const blankForm = (): FormState => ({ name: '', category: '', price: '', is_available: true })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Menu</h1>
          <p className="text-sm text-gray-500">{items.length} items</p>
        </div>
        <button className="btn-primary" onClick={() => setForm(blankForm())}>
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-28" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-600">
          <UtensilsCrossed className="h-10 w-10 mb-3 opacity-30" />
          <p>No menu items yet</p>
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, catItems]) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{cat}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {catItems.map((item) => (
                <div key={item.id} className={`card p-4 ${!item.is_available ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className={item.is_available ? 'badge-green' : 'badge-gray'}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-tight mb-1">{item.name}</p>
                  <p className="text-sm font-bold text-brand-400">{formatRp(item.price)}</p>
                  <div className="flex gap-1 mt-3">
                    <button
                      onClick={() => setForm({ id: item.id, name: item.name, category: item.category, price: String(item.price), is_available: item.is_available })}
                      className="btn-ghost btn-sm flex-1 justify-center"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="btn-ghost btn-sm flex-1 justify-center text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {form !== null && (
        <Modal title={form.id ? 'Edit Item' : 'New Menu Item'} onClose={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Category *</label>
              <input className="input" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Food, Drinks, Snacks…" />
            </div>
            <div>
              <label className="label">Price (IDR) *</label>
              <input className="input" required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-300">Available for ordering</span>
            </label>
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

      {deleteId !== null && (
        <Modal title="Delete menu item?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-400 mb-4">This cannot be undone.</p>
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
