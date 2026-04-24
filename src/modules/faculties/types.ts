// Types for the Faculties module

export interface Faculties {
  id: number
  code: string
  nameAR: string
  nameEN: string
  programs: number
  files: number
  status: 'Active' | 'Inactive'
  createdAt: string
}
