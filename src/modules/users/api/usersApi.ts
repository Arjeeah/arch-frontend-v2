import type { User } from '../types'
// import { http } from '@/app/plugins/axios' // Uncomment this when connecting to real backend

let mockUsers: User[] = [
  {
    id: 1,
    name: 'Ahmed Ali',
    email: 'a@limu.edu.ly',
    role: 'Archivist',
    status: 'Active',
    created_at: 'Dec 1, 2025',
  },
  {
    id: 2,
    name: 'Nour Mohammed',
    email: 'nour@limu.edu.ly',
    role: 'Super Admin',
    status: 'Active',
    created_at: 'Nov 15, 2025',
  },
  {
    id: 3,
    name: 'Sara Ahmed Ali',
    email: 'sara@limu.edu.ly',
    role: 'Faculty Staff',
    status: 'Inactive',
    created_at: 'Dec 19, 2025',
  },
  {
    id: 4,
    name: 'Mohammed Hassan',
    email: 'mo@limu.edu.ly',
    role: 'Super Admin',
    status: 'Active',
    created_at: 'Oct 5, 2025',
  },
  {
    id: 5,
    name: 'Aya Alaa',
    email: 'aya@limu.edu.ly',
    role: 'Super Admin',
    status: 'Active',
    created_at: 'Sep 1, 2025',
  },
  {
    id: 6,
    name: 'Ehab Khalid',
    email: '21@limu.edu.ly',
    role: 'Archivist',
    status: 'Active',
    created_at: 'Dec 10, 2025',
  },
  {
    id: 7,
    name: 'Fatima Omar',
    email: 'fatima@limu.edu.ly',
    role: 'Faculty Staff',
    status: 'Active',
    created_at: 'Nov 20, 2025',
  },
  {
    id: 8,
    name: 'Khalid Mansour',
    email: 'khalid@limu.edu.ly',
    role: 'Archivist',
    status: 'Inactive',
    created_at: 'Aug 15, 2025',
  },
  {
    id: 9,
    name: 'Layla Ibrahim',
    email: 'layla@limu.edu.ly',
    role: 'Super Admin',
    status: 'Active',
    created_at: 'Oct 20, 2025',
  },
  {
    id: 10,
    name: 'Omar Faris',
    email: 'omar@limu.edu.ly',
    role: 'Faculty Staff',
    status: 'Active',
    created_at: 'Dec 5, 2025',
  },
  {
    id: 11,
    name: 'Rania Saleh',
    email: 'rania@limu.edu.ly',
    role: 'Archivist',
    status: 'Active',
    created_at: 'Nov 1, 2025',
  },
  {
    id: 12,
    name: 'Tarek Yousef',
    email: 'tarek@limu.edu.ly',
    role: 'Super Admin',
    status: 'Inactive',
    created_at: 'Sep 10, 2025',
  },
  {
    id: 13,
    name: 'Salma Nasser',
    email: 'salma@limu.edu.ly',
    role: 'Faculty Staff',
    status: 'Active',
    created_at: 'Dec 15, 2025',
  },
  {
    id: 14,
    name: 'Youssef Kamal',
    email: 'youssef@limu.edu.ly',
    role: 'Archivist',
    status: 'Active',
    created_at: 'Oct 30, 2025',
  },
  {
    id: 15,
    name: 'Hana Malik',
    email: 'hana@limu.edu.ly',
    role: 'Super Admin',
    status: 'Active',
    created_at: 'Aug 1, 2025',
  },
]

function delay<T>(data: T, ms = 500): Promise<{ data: T }> {
  return new Promise((resolve) => setTimeout(() => resolve({ data }), ms))
}

export const usersApi = {
  getUsers() {
    // return http.get<User[]>('/v1/users')
    return delay([...mockUsers])
  },
  createUser(data: Partial<User> & { password?: string }) {
    // return http.post<User>('/v1/users', data)
    const newUser: User = {
      id: Math.max(0, ...mockUsers.map((u) => u.id)) + 1,
      name: data.name || '',
      email: data.email || '',
      role: (data.role as User['role']) || 'Faculty Staff',
      status: data.status || 'Active',
      created_at: new Date().toISOString().substring(0, 10),
    }
    mockUsers.unshift(newUser)
    return delay(newUser)
  },
  updateUser(id: number, data: Partial<User> & { password?: string }) {
    // return http.put<User>(`/v1/users/${id}`, data)
    const idx = mockUsers.findIndex((u) => u.id === id)
    if (idx !== -1) {
      mockUsers[idx] = { ...mockUsers[idx], ...data } as User
      return delay(mockUsers[idx])
    }
    return Promise.reject(new Error('User not found'))
  },
  deleteUser(id: number) {
    // return http.delete(`/v1/users/${id}`)
    mockUsers = mockUsers.filter((u) => u.id !== id)
    return delay(null)
  },
}
