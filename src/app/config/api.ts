export const API_ENDPOINTS = {
  auth: {
    login: '/v1/login',
    logout: '/v1/logout',
    me: '/v1/me',
  },
  users: {
    list: '/v1/users',
    create: '/v1/users',
    show: (id: number | string) => `/v1/users/${id}`,
    update: (id: number | string) => `/v1/users/${id}`,
    delete: (id: number | string) => `/v1/users/${id}`,
  },
  faculties: {
    list: '/v1/academic/faculties',
    create: '/v1/academic/faculties',
    show: (id: number | string) => `/v1/academic/faculties/${id}`,
    update: (id: number | string) => `/v1/academic/faculties/${id}`,
    delete: (id: number | string) => `/v1/academic/faculties/${id}`,
    restore: (id: number | string) => `/v1/academic/faculties/${id}/restore`,
  },
  borrowings: {
    list: '/v1/borrowings',
    create: '/v1/borrowings',
    show: (id: number | string) => `/v1/borrowings/${id}`,
    update: (id: number | string) => `/v1/borrowings/${id}`,
    delete: (id: number | string) => `/v1/borrowings/${id}`,
    /** Takes `{ action: 'approve' | 'reject' }`. */
    approve: (id: number | string) => `/v1/borrowings/${id}/approve`,
    markBorrowed: (id: number | string) => `/v1/borrowings/${id}/mark-borrowed`,
    return: (id: number | string) => `/v1/borrowings/${id}/return`,
  },
  programs: {
    list: '/v1/academic/programs',
    create: '/v1/academic/programs',
    show: (id: number | string) => `/v1/academic/programs/${id}`,
    update: (id: number | string) => `/v1/academic/programs/${id}`,
    delete: (id: number | string) => `/v1/academic/programs/${id}`,
  },
} as const
