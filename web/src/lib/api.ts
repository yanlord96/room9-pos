const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'))
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/auth/me'),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => request<DashboardData>('/dashboard'),
}

// ── Customers ─────────────────────────────────────────────────────────────────
export const customersApi = {
  list: (q?: string) => request<{ customers: Customer[] }>(`/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (data: { name: string; phone: string }) =>
    request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; phone: string }) =>
    request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/customers/${id}`, { method: 'DELETE' }),
}

// ── Menu ──────────────────────────────────────────────────────────────────────
export const menuApi = {
  list: () => request<{ items: MenuItem[] }>('/menu'),
  create: (data: { name: string; category: string; price: number }) =>
    request<MenuItem>('/menu', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; category: string; price: number; is_available: boolean }) =>
    request<MenuItem>(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/menu/${id}`, { method: 'DELETE' }),
}

// ── Tables ────────────────────────────────────────────────────────────────────
export const tablesApi = {
  list: () => request<{ tables: PoolTable[] }>('/tables'),
  create: (data: { name: string; hourly_rate: number }) =>
    request<PoolTable>('/tables', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; hourly_rate: number; status?: string }) =>
    request<PoolTable>(`/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/tables/${id}`, { method: 'DELETE' }),
}

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingsApi = {
  page: () => request<BookingPageData>('/bookings'),
  start: (data: { table_id: number; customer_id: number; billing_type: 'open' | 'fixed'; duration_minutes: number }) =>
    request<{ session_id: number }>('/bookings/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  detail: (id: number) => request<SessionDetailData>(`/bookings/${id}`),
  end: (id: number, payment_method: string) =>
    request<{ session_id: number }>(`/bookings/${id}/end`, {
      method: 'POST',
      body: JSON.stringify({ payment_method }),
    }),
  receipt: (id: number) => request<ReceiptData>(`/bookings/${id}/receipt`),
}

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  create: (data: { session_id: number; menu_item_id: number; quantity: number }) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean; session_id: number }>(`/orders/${id}`, { method: 'DELETE' }),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => request<{ users: User[] }>('/users'),
  create: (data: { username: string; name: string; password: string; role: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string; role: string; password?: string }) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: () => request<{ payments: Payment[] }>('/payments'),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsApi = {
  get: (params: { period: string; year: number; month: number }) =>
    request<ReportData>(`/reports?period=${params.period}&year=${params.year}&month=${params.month}`),
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type User = {
  id: number
  username: string
  name: string
  role: 'admin' | 'staff'
  created_at?: string
}

export type Customer = {
  id: number
  name: string
  phone: string
}

export type MenuItem = {
  id: number
  name: string
  category: string
  price: number
  is_available: boolean
}

export type PoolTable = {
  id: number
  name: string
  hourly_rate: number
  status: 'available' | 'occupied'
}

export type Session = {
  id: number
  table_id: number
  customer_id: number
  started_at: string
  ended_at?: string
  table_charge: number
  fnb_charge: number
  total_amount: number
  status: 'active' | 'completed'
  table_name: string
  hourly_rate: number
  customer_name: string
  customer_phone: string
  billing_type: 'open' | 'fixed'
  duration_minutes: number
  payment_method: string
}

export type Payment = {
  id: number
  started_at: string
  ended_at: string
  table_charge: number
  fnb_charge: number
  total_amount: number
  payment_method: string
  billing_type: string
  table_name: string
  customer_name: string
  customer_phone: string
}

export type Order = {
  id: number
  session_id: number
  menu_item_id: number
  quantity: number
  unit_price: number
  created_at: string
  item_name: string
  item_category: string
}

export type DashboardData = {
  active_sessions: number
  available_tables: number
  total_tables: number
  today_revenue: number
}

export type BookingPageData = {
  tables: PoolTable[]
  customers: Customer[]
  active_sessions: Session[]
}

export type SessionDetailData = {
  session: Session
  orders: Order[]
  menu_items: MenuItem[]
}

export type ReceiptData = {
  session: Session
  orders: Order[]
  duration: string
}

export type FinancialSummary = {
  period: string
  table_charge: number
  fnb_charge: number
  total: number
  sessions: number
}

export type ReportData = {
  period: string
  year: number
  month: number
  summaries: FinancialSummary[]
  grand: {
    table_charge: number
    fnb_charge: number
    total: number
    sessions: number
  }
}
