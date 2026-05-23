import { useState, useEffect } from 'react'
import { parseDate, calcTableCharge, calcFixedCharge, formatHMS } from '@/lib/utils'

function compute(startedAt: string, hourlyRate: number, billingType: string, durationMinutes: number) {
  if (!startedAt) return { charge: 0, timerDisplay: '00:00:00', isExpired: false }

  const elapsedSeconds = (Date.now() - parseDate(startedAt).getTime()) / 1000

  if (billingType === 'fixed') {
    const totalSeconds = durationMinutes * 60
    const remaining = totalSeconds - elapsedSeconds
    return {
      charge: calcFixedCharge(durationMinutes, hourlyRate),
      timerDisplay: formatHMS(Math.max(0, remaining)),
      isExpired: remaining <= 0,
    }
  }

  return {
    charge: calcTableCharge(startedAt, hourlyRate),
    timerDisplay: formatHMS(elapsedSeconds),
    isExpired: false,
  }
}

export function useSessionTimer(
  startedAt: string,
  hourlyRate: number,
  active: boolean,
  billingType: string = 'open',
  durationMinutes: number = 0,
) {
  const [state, setState] = useState(() => compute(startedAt, hourlyRate, billingType, durationMinutes))

  useEffect(() => {
    if (!active || !startedAt) return
    setState(compute(startedAt, hourlyRate, billingType, durationMinutes))
    const id = setInterval(() => setState(compute(startedAt, hourlyRate, billingType, durationMinutes)), 1000)
    return () => clearInterval(id)
  }, [startedAt, hourlyRate, active, billingType, durationMinutes])

  return state
}
