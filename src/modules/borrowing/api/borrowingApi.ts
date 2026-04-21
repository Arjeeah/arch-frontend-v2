import { http } from '@/app/plugins/axios'
import type { Borrowing } from '../types'

export const borrowingApi = {
  list: () => http.get<Borrowing[]>('/v1/borrowings').then((r) => r.data),
  show: (id: number) => http.get<Borrowing>(`/v1/borrowings/${id}`).then((r) => r.data),
  create: (data: Partial<Borrowing>) =>
    http.post<Borrowing>('/v1/borrowings', data).then((r) => r.data),
  update: (id: number, data: Partial<Borrowing>) =>
    http.put<Borrowing>(`/v1/borrowings/${id}`, data).then((r) => r.data),
  delete: (id: number) => http.delete(`/v1/borrowings/${id}`),
  stats: () => http.get('/v1/borrowings/stats').then((r) => r.data),
}
