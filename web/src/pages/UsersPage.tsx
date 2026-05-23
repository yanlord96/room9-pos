import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type User } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Plus, Pencil, Trash2, X, Check, ShieldCheck, UserIcon } from 'lucide-react'

type FormState = {
  id?: number
  username: string
  name: string
  password: string
  role: 'admin' | 'staff'
}

export default function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const [form, setForm] = useState<FormState | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list, staleTime: 0 })

  const save = useMutation({
    mutationFn: () => {
      if (form!.id) {
        return usersApi.update(form!.id, { name: form!.name, role: form!.role, password: form!.password || undefined })
      }
      return usersApi.create({ username: form!.username, name: form!.name, password: form!.password, role: form!.role })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setForm(null) },
  })

  const del = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteId(null) },
  })

  const users = data?.users ?? []
  const admins = users.filter(u => u.role === 'admin')
  const staff = users.filter(u => u.role === 'staff')

  const blankForm = (): FormState => ({ username: '', name: '', password: '', role: 'staff' })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">User Management</h1>
          <p className="text-sm text-gray-500">{users.length} accounts</p>
        </div>
        <button className="btn-primary" onClick={() => setForm(blankForm())}>
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Admins */}
      <Section title="Admins" icon={ShieldCheck} iconClass="text-brand-400">
        <UserTable users={admins} isLoading={isLoading} me={me} onEdit={(u) => setForm({ id: u.id, username: u.username, name: u.name, password: '', role: u.role })} onDelete={setDeleteId} />
      </Section>

      {/* Staff */}
      <Section title="Staff" icon={UserIcon} iconClass="text-gray-400">
        <UserTable users={staff} isLoading={isLoading} me={me} onEdit={(u) => setForm({ id: u.id, username: u.username, name: u.name, password: '', role: u.role })} onDelete={setDeleteId} />
      </Section>

      {/* Form modal */}
      {form !== null && (
        <Modal title={form.id ? 'Edit User' : 'New User'} onClose={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-4">
            {!form.id && (
              <div>
                <label className="label">Username *</label>
                <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. john" autoComplete="off" />
              </div>
            )}
            <div>
              <label className="label">Display Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label className="label">{form.id ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input
                className="input"
                type="password"
                required={!form.id}
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={form.id ? '••••••' : 'Min. 6 characters'}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Role *</label>
              <div className="grid grid-cols-2 gap-2">
                {(['staff', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors capitalize ${
                      form.role === r
                        ? 'border-brand-500 bg-brand-600/20 text-brand-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {r === 'admin' ? '🛡 Admin' : '👤 Staff'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1.5">
                {form.role === 'admin' ? 'Full access including reports and user management.' : 'Bookings and orders only. No reports or settings.'}
              </p>
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
        <Modal title="Delete user?" onClose={() => setDeleteId(null)}>
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

function Section({ title, icon: Icon, iconClass, children }: {
  title: string; icon: React.ElementType; iconClass: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        <h2 className="text-sm font-medium text-gray-400">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function UserTable({ users, isLoading, me, onEdit, onDelete }: {
  users: User[]
  isLoading: boolean
  me: User | null
  onEdit: (u: User) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Username</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-800 rounded animate-pulse" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-800 rounded animate-pulse" /></td>
                <td />
              </tr>
            ))
          ) : users.length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-600 text-xs">None</td></tr>
          ) : (
            users.map((u) => (
              <tr key={u.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700/50 text-xs font-bold text-brand-300 uppercase">
                      {u.name[0]}
                    </div>
                    <span className="font-medium text-white">{u.name}</span>
                    {me?.id === u.id && <span className="badge-gray text-xs">You</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(u)} className="btn-ghost btn-sm p-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(u.id)}
                      disabled={me?.id === u.id}
                      className="btn-ghost btn-sm p-1.5 text-red-500 hover:text-red-400 disabled:opacity-30"
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
