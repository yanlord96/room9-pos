import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tablesApi, type PoolTable } from '@/lib/api'
import { formatRp } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Check, Table2 } from 'lucide-react'

type FormState = { id?: number; name: string; hourly_rate: string }

export default function TablesPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['tables'], queryFn: tablesApi.list, staleTime: 0 })

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: form!.name, hourly_rate: Number(form!.hourly_rate) }
      return form!.id ? tablesApi.update(form!.id, payload) : tablesApi.create(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables'] }); setForm(null) },
  })

  const del = useMutation({
    mutationFn: (id: number) => tablesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables'] }); setDeleteId(null) },
  })

  const tables = data?.tables ?? []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Pool Tables</h1>
          <p className="text-sm text-gray-500">{tables.length} tables</p>
        </div>
        <button className="btn-primary" onClick={() => setForm({ name: '', hourly_rate: '' })}>
          <Plus className="h-4 w-4" /> Add Table
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-36" />)}
        </div>
      ) : tables.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-600">
          <Table2 className="h-10 w-10 mb-3 opacity-30" />
          <p>No tables yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((t) => <TableCard key={t.id} table={t} onEdit={() => setForm({ id: t.id, name: t.name, hourly_rate: String(t.hourly_rate) })} onDelete={() => setDeleteId(t.id)} />)}
        </div>
      )}

      {form !== null && (
        <Modal title={form.id ? 'Edit Table' : 'New Table'} onClose={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-4">
            <div>
              <label className="label">Table Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Table A" />
            </div>
            <div>
              <label className="label">Hourly Rate (IDR) *</label>
              <input className="input" required type="number" min="0" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} placeholder="30000" />
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

      {deleteId !== null && (
        <Modal title="Delete table?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-400 mb-4">This cannot be undone. Tables with active sessions cannot be deleted.</p>
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

function TableCard({ table, onEdit, onDelete }: { table: PoolTable; onEdit: () => void; onDelete: () => void }) {
  const occupied = table.status === 'occupied'
  return (
    <div className={`card p-5 ${occupied ? 'border-yellow-700/40' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`rounded-lg p-2 ${occupied ? 'bg-yellow-900/30' : 'bg-green-900/20'}`}>
          <Table2 className={`h-5 w-5 ${occupied ? 'text-yellow-400' : 'text-green-400'}`} />
        </div>
        <span className={occupied ? 'badge-yellow' : 'badge-green'}>{occupied ? 'Occupied' : 'Free'}</span>
      </div>
      <p className="text-base font-bold text-white mb-1">{table.name}</p>
      <p className="text-xs text-gray-400">{formatRp(table.hourly_rate)}/hr</p>
      <div className="flex gap-1 mt-4">
        <button onClick={onEdit} className="btn-ghost btn-sm flex-1 justify-center" disabled={occupied}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="btn-ghost btn-sm flex-1 justify-center text-red-500 hover:text-red-400" disabled={occupied}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
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
