//import { http } from '@/app/plugins/axios'
import { mockFaculties } from '../data/mockFaculties'
import type { Faculties } from '../types'

/*
export const facultiesApi = {
  list: () =>
   http.get<Faculties[]>('/v1/facultiess').then(r => r.data),
  show: (id: number) =>
   http.get<Faculties>(`/v1/facultiess/${id}`).then(r => r.data),
  create: (data: Partial<Faculties>) =>
    http.post<Faculties>('/v1/facultiess', data).then(r => r.data),
  update: (id: number, data: Partial<Faculties>) =>
   http.put<Faculties>(`/v1/facultiess/${id}`, data).then(r => r.data),
  delete: (id: number) =>
   http.delete(`/v1/facultiess/${id}`),
}
  */

// Mock api calls
const delay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 300))

export const facultiesApi = {
  list: async (): Promise<Faculties[]> => {
    await delay()
    return [...mockFaculties]
  },

  create: async (data: Partial<Faculties>): Promise<Faculties> => {
    await delay()
    //ensure ID generation handles empty array case
    const currentMaxId = mockFaculties.length > 0 ? Math.max(...mockFaculties.map((f) => f.id)) : 0
    const newFaculty = {
      id: currentMaxId + 1,
      ...data,
    } as Faculties
    mockFaculties.push(newFaculty)
    return newFaculty
  },

  update: async (id: number, data: Partial<Faculties>): Promise<Faculties> => {
    await delay()
    const index = mockFaculties.findIndex((f) => f.id === id)
    if (index === -1) throw new Error('Faculty not found')
    mockFaculties[index] = {
      ...mockFaculties[index],
      ...data,
    } as Faculties
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
