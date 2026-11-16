export interface Me {
  id: string
  email: string
  displayName: string
  isAdmin: boolean
}

export interface User {
  id: string
  email: string
  displayName: string
  isAdmin: boolean
  createdAt: string
}

export interface BookSummary {
  id: number
  title: string
  authors: string
  isbn: string | null
  publishedYear: number | null
  coverUrl: string | null
  location: string | null
  averageRating: number | null
  reviewCount: number
  createdAt: string
}

export interface Review {
  id: number
  userId: string
  userName: string
  rating: number
  text: string | null
  readDate: string | null
  createdAt: string
  updatedAt: string
}

export interface BookDetail {
  id: number
  title: string
  authors: string
  isbn: string | null
  publishedYear: number | null
  publisher: string | null
  description: string | null
  coverUrl: string | null
  pageCount: number | null
  location: string | null
  createdAt: string
  updatedAt: string
  addedByUserId: string | null
  addedByName: string | null
  canEdit: boolean
  averageRating: number | null
  reviews: Review[]
}

export interface BookInput {
  title: string
  authors: string | null
  isbn: string | null
  publishedYear: number | null
  publisher: string | null
  description: string | null
  coverUrl: string | null
  pageCount: number | null
  location: string | null
}

export interface ReviewInput {
  rating: number
  text: string | null
  readDate: string | null
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface IsbnLookup {
  isbn: string
  title: string | null
  authors: string | null
  publisher: string | null
  publishedYear: number | null
  pageCount: number | null
  coverUrl: string | null
  description: string | null
}
