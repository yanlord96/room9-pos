import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AppShell from '@/components/layout/AppShell'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import BookingsPage from '@/pages/BookingsPage'
import SessionDetailPage from '@/pages/SessionDetailPage'
import ReceiptPage from '@/pages/ReceiptPage'
import CustomersPage from '@/pages/CustomersPage'
import MenuPage from '@/pages/MenuPage'
import TablesPage from '@/pages/TablesPage'
import ReportsPage from '@/pages/ReportsPage'
import PaymentsPage from '@/pages/PaymentsPage'
import UsersPage from '@/pages/UsersPage'
import TableDisplayPage from '@/pages/TableDisplayPage'
import ExpensesPage from '@/pages/ExpensesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/display" element={<TableDisplayPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/bookings/:id" element={<SessionDetailPage />} />
            <Route path="/bookings/:id/receipt" element={<ReceiptPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/payments" element={<AdminRoute><PaymentsPage /></AdminRoute>} />
            <Route path="/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
            <Route path="/expenses" element={<AdminRoute><ExpensesPage /></AdminRoute>} />
            <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
