import { apiRequest } from '../api/client'
import type { DashboardResumo } from '../types/domain'

export function buscarDashboard(token: string) {
  return apiRequest<DashboardResumo>('/api/dashboard/', { token })
}