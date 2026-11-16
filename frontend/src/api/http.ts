import { ApiError } from './errors'
import type {
  BookDetail, BookInput, BookSummary, IsbnLookup, Me, Paged, Review, ReviewInput, User,
} from './types'

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res))
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data.errors) {
      return Object.values(data.errors as Record<string, string[]>).flat().join(' ')
    }
    return data.detail ?? data.message ?? data.title ?? res.statusText
  } catch {
    return res.statusText || `Request failed (${res.status})`
  }
}

export const httpApi = {
  login: (email: string, password: string) => request<Me>('POST', '/api/auth/login', { email, password }),
  logout: () => request<void>('POST', '/api/auth/logout'),
  me: () => request<Me>('GET', '/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('POST', '/api/auth/change-password', { currentPassword, newPassword }),

  listUsers: () => request<User[]>('GET', '/api/users'),
  createUser: (u: { email: string; displayName: string; password: string; isAdmin: boolean }) =>
    request<User>('POST', '/api/users', u),
  deleteUser: (id: string) => request<void>('DELETE', `/api/users/${encodeURIComponent(id)}`),

  listBooks: (params: { search?: string; sort?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
    return request<Paged<BookSummary>>('GET', `/api/books?${q}`)
  },
  getBook: (id: number) => request<BookDetail>('GET', `/api/books/${id}`),
  createBook: (b: BookInput) => request<BookDetail>('POST', '/api/books', b),
  updateBook: (id: number, b: BookInput) => request<BookDetail>('PUT', `/api/books/${id}`, b),
  deleteBook: (id: number) => request<void>('DELETE', `/api/books/${id}`),

  saveMyReview: (bookId: number, r: ReviewInput) => request<Review>('PUT', `/api/books/${bookId}/reviews/me`, r),
  deleteMyReview: (bookId: number) => request<void>('DELETE', `/api/books/${bookId}/reviews/me`),

  lookupIsbn: (isbn: string) => request<IsbnLookup>('GET', `/api/lookup/isbn/${encodeURIComponent(isbn)}`),
}

export type Api = typeof httpApi
