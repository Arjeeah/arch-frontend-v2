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
  programs: {
    list: '/v1/academic/programs',
    create: '/v1/academic/programs',
    show: (id: number | string) => `/v1/academic/programs/${id}`,
    update: (id: number | string) => `/v1/academic/programs/${id}`,
    delete: (id: number | string) => `/v1/academic/programs/${id}`,
  },
} as const
