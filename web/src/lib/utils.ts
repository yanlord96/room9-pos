import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRp(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function parseDate(s: string): Date {
  // SQLite returns "YYYY-MM-DD HH:MM:SS" without timezone — treat as UTC
  return new Date(s.replace(' ', 'T') + (s.includes('Z') || s.includes('+') ? '' : 'Z'))
}

export function calcTableCharge(startedAt: string, hourlyRate: number): number {
  if (!startedAt) return 0
  const elapsed = (Date.now() - parseDate(startedAt).getTime()) / 60_000
  const raw = (Math.max(0, elapsed) / 60) * hourlyRate
  return Math.ceil(raw / 1000) * 1000
}

export function formatDuration(startedAt: string, endedAt?: string): string {
  const end = endedAt ? parseDate(endedAt) : new Date()
  const diffMs = end.getTime() - parseDate(startedAt).getTime()
  const h = Math.floor(diffMs / 3_600_000)
  const m = Math.floor((diffMs % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

export function formatDateTime(iso: string): string {
  return parseDate(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso: string): string {
  return parseDate(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function calcFixedCharge(durationMinutes: number, hourlyRate: number): number {
  return Math.ceil((durationMinutes / 60) * hourlyRate / 1000) * 1000
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
