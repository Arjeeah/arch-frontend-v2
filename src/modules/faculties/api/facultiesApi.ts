//import { http } from '@/app/plugins/axios'
import { mockFaculties } from '../data/mockFaculties'
import type { Faculty } from '../types'

/*
export const facultiesApi = {
  list: () =>
   http.get<Faculty[]>('/v1/faculties').then(r => r.data),
  show: (id: number) =>
   http.get<Faculty>(`/v1/faculties/${id}`).then(r => r.data),
  create: (data: Partial<Faculty>) =>
    http.post<Faculty>('/v1/faculties', data).then(r => r.data),
  update: (id: number, data: Partial<Faculty>) =>
   http.put<Faculty>(`/v1/faculties/${id}`, data).then(r => r.data),
  delete: (id: number) =>
   http.delete(`/v1/faculties/${id}`),
}
  */

// Mock api calls
const delay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 300))

export const facultiesApi = {
  list: async (): Promise<Faculty[]> => {
    await delay()
    return [...mockFaculties]
  },

  create: async (data: Partial<Faculty>): Promise<Faculty> => {
    await delay()
    //ensure ID generation handles empty array case
    const currentMaxId = mockFaculties.length > 0 ? Math.max(...mockFaculties.map((f) => f.id)) : 0
    const newFaculty = {
      id: currentMaxId + 1,
      ...data,
    } as Faculty
    mockFaculties.push(newFaculty)
    return newFaculty
  },

  update: async (id: number, data: Partial<Faculty>): Promise<Faculty> => {
    await delay()
    const index = mockFaculties.findIndex((f) => f.id === id)
    if (index === -1) throw new Error('Faculty not found')
    mockFaculties[index] = {
      ...mockFaculties[index],
      ...data,
    } as Faculty
    return mockFaculties[index]
  },

  delete: async (id: number): Promise<void> => {
    await delay()
    const index = mockFaculties.findIndex((f) => f.id === id)
    if (index !== -1) {
      mockFaculties.splice(index, 1)
    }
  },
}
