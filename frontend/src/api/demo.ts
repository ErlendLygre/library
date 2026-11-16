// In-browser stand-in for the .NET API, used for the static GitHub Pages demo.
// Data lives in localStorage; the logged-in user in sessionStorage.
// Behaviour mirrors the real endpoints (status codes, permissions, validation).
import { ApiError } from './errors'
import type { Api } from './http'
import type { BookDetail, BookInput, BookSummary, IsbnLookup, Me, Review, User } from './types'

const DB_KEY = 'home-library-demo-v1'
const SESSION_KEY = 'home-library-demo-session'

interface DemoUser extends User {
  password: string
}

interface DemoBook extends Omit<BookDetail, 'canEdit' | 'averageRating' | 'reviews' | 'addedByName'> {}

interface DemoReview extends Omit<Review, 'userName'> {
  bookId: number
}

interface Db {
  users: DemoUser[]
  books: DemoBook[]
  reviews: DemoReview[]
  nextBookId: number
  nextReviewId: number
}

export const DEMO_ACCOUNTS = [
  { email: 'admin@demo.local', password: 'demo', role: 'Admin' },
  { email: 'kari@demo.local', password: 'demo', role: 'Member' },
] as const

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const cover = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`

function seed(): Db {
  const now = Date.now()
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString()
  const admin = 'u-admin'
  const kari = 'u-kari'

  const books: [string, string, string, number, string, number, string, string | null][] = [
    ['Dune', 'Frank Herbert', '9780441172719', 1965, 'Ace', 617, 'Living room, top shelf',
      'On the desert planet Arrakis, young Paul Atreides is drawn into a struggle for the most valuable substance in the universe.'],
    ['The Hobbit', 'J.R.R. Tolkien', '9780547928227', 1937, 'Houghton Mifflin Harcourt', 300, 'Kids\' room',
      'Bilbo Baggins is swept into a quest to reclaim the lost Dwarf Kingdom of Erebor from the dragon Smaug.'],
    ['Kristin Lavransdatter', 'Sigrid Undset', '9780143039167', 1920, 'Penguin Classics', 1168, 'Living room, top shelf',
      'The life of a woman in fourteenth-century Norway, from girlhood to old age.'],
    ['Pride and Prejudice', 'Jane Austen', '9780141439518', 1813, 'Penguin Classics', 480, 'Bedroom',
      null],
    ['The Left Hand of Darkness', 'Ursula K. Le Guin', '9780441478125', 1969, 'Ace', 304, 'Living room, top shelf',
      'An envoy is sent to the planet Gethen, whose inhabitants have no fixed sex.'],
    ['Norwegian Wood', 'Haruki Murakami', '9780375704024', 1987, 'Vintage', 296, 'Bedroom',
      'Toru Watanabe looks back on his student days in Tokyo in the late 1960s.'],
    ['Sapiens', 'Yuval Noah Harari', '9780062316097', 2011, 'Harper', 464, 'Office',
      'A brief history of humankind, from the Stone Age to the twenty-first century.'],
    ['The Road', 'Cormac McCarthy', '9780307387899', 2006, 'Vintage', 287, 'Office',
      'A father and his son walk alone through a burned America.'],
    ['Project Hail Mary', 'Andy Weir', '9780593135204', 2021, 'Ballantine Books', 496, 'Living room, bottom shelf',
      'A lone astronaut wakes up on a spaceship with no memory and the fate of humanity on his shoulders.'],
  ]

  const db: Db = {
    users: [
      { id: admin, email: 'admin@demo.local', displayName: 'Alex', isAdmin: true, password: 'demo', createdAt: daysAgo(120) },
      { id: kari, email: 'kari@demo.local', displayName: 'Kari', isAdmin: false, password: 'demo', createdAt: daysAgo(100) },
    ],
    books: books.map(([title, authors, isbn, year, publisher, pages, location, description], i) => ({
      id: i + 1,
      title,
      authors,
      isbn,
      publishedYear: year,
      publisher,
      description,
      coverUrl: cover(isbn),
      pageCount: pages,
      location,
      createdAt: daysAgo(90 - i * 9),
      updatedAt: daysAgo(90 - i * 9),
      addedByUserId: i % 3 === 1 ? kari : admin,
    })),
    reviews: [],
    nextBookId: books.length + 1,
    nextReviewId: 1,
  }

  const review = (bookId: number, userId: string, rating: number, text: string | null, readDaysAgo?: number) =>
    db.reviews.push({
      id: db.nextReviewId++,
      bookId,
      userId,
      rating,
      text,
      readDate: readDaysAgo === undefined ? null : daysAgo(readDaysAgo).slice(0, 10),
      createdAt: daysAgo((readDaysAgo ?? 30) - 1),
      updatedAt: daysAgo((readDaysAgo ?? 30) - 1),
    })

  review(1, admin, 5, 'Still the best world-building in science fiction. The ecology of Arrakis is a character of its own.', 200)
  review(1, kari, 4, 'Slow start, but once Paul reaches the desert I could not put it down.', 60)
  review(2, kari, 5, 'Read it aloud to the kids over two weeks. Riddles in the Dark was a big hit.', 45)
  review(3, admin, 5, 'Monumental. Undset makes medieval Norway feel completely alive.', 400)
  review(4, kari, 4, null, 300)
  review(5, admin, 4, 'Quiet and strange in the best way. The ice crossing is unforgettable.', 150)
  review(6, kari, 3, 'Beautifully written but very melancholy.', 20)
  review(7, admin, 4, 'Big ideas, fast read. Some claims feel stretched, but great for discussion.', 90)
  review(8, admin, 5, 'Bleak, spare and devastating. Read it in one sitting.', 75)
  review(8, kari, 4, null, 10)

  return db
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function load(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    /* fall through to a fresh seed */
  }
  const db = seed()
  save(db)
  return db
}

function save(db: Db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* storage unavailable: demo still works for this page view */
  }
}

let memorySession: string | null = null

function sessionUserId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return memorySession
  }
}

function setSession(userId: string | null) {
  memorySession = userId
  try {
    if (userId) sessionStorage.setItem(SESSION_KEY, userId)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function resetDemoData() {
  save(seed())
}

const delay = () => new Promise(r => setTimeout(r, 120 + Math.random() * 180))

function currentUser(db: Db): DemoUser {
  const user = db.users.find(u => u.id === sessionUserId())
  if (!user) throw new ApiError(401, 'Not signed in.')
  return user
}

function requireAdmin(db: Db): DemoUser {
  const user = currentUser(db)
  if (!user.isAdmin) throw new ApiError(403, 'Forbidden')
  return user
}

const toMe = (u: DemoUser): Me => ({ id: u.id, email: u.email, displayName: u.displayName, isAdmin: u.isAdmin })
const toUser = ({ password: _password, ...u }: DemoUser): User => u

function reviewsFor(db: Db, bookId: number): Review[] {
  return db.reviews
    .filter(r => r.bookId === bookId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(({ bookId: _bookId, ...r }) => ({
      ...r,
      userName: db.users.find(u => u.id === r.userId)?.displayName ?? '',
    }))
}

const average = (rs: { rating: number }[]) =>
  rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : null

function toDetail(db: Db, b: DemoBook, me: DemoUser): BookDetail {
  const reviews = reviewsFor(db, b.id)
  return {
    ...b,
    addedByName: db.users.find(u => u.id === b.addedByUserId)?.displayName ?? null,
    canEdit: me.isAdmin || b.addedByUserId === me.id,
    averageRating: average(reviews),
    reviews,
  }
}

const clean = (s: string | null) => (s && s.trim() ? s.trim() : null)

function validateBook(input: BookInput) {
  const errors: string[] = []
  if (!input.title?.trim()) errors.push('The Title field is required.')
  if (input.publishedYear !== null && (input.publishedYear < 0 || input.publishedYear > 3000))
    errors.push('Year must be between 0 and 3000.')
  if (input.pageCount !== null && input.pageCount < 1) errors.push('Pages must be at least 1.')
  if (errors.length) throw new ApiError(400, errors.join(' '))
}

function applyBook(b: DemoBook, input: BookInput) {
  b.title = input.title.trim()
  b.authors = input.authors?.trim() ?? ''
  b.isbn = clean(input.isbn?.replace(/[-\s]/g, '') ?? null)
  b.publishedYear = input.publishedYear
  b.publisher = clean(input.publisher)
  b.description = clean(input.description)
  b.coverUrl = clean(input.coverUrl)
  b.pageCount = input.pageCount
  b.location = clean(input.location)
}

function findBook(db: Db, id: number): DemoBook {
  const book = db.books.find(b => b.id === id)
  if (!book) throw new ApiError(404, 'Not Found')
  return book
}

// ---------------------------------------------------------------------------
// The API
// ---------------------------------------------------------------------------

export const demoApi: Api = {
  async login(email, password) {
    await delay()
    const db = load()
    const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || user.password !== password) throw new ApiError(401, 'Invalid email or password.')
    setSession(user.id)
    return toMe(user)
  },

  async logout() {
    setSession(null)
  },

  async me() {
    return toMe(currentUser(load()))
  },

  async changePassword(currentPassword, newPassword) {
    await delay()
    const db = load()
    const user = currentUser(db)
    if (user.password !== currentPassword) throw new ApiError(400, 'Incorrect password.')
    if (newPassword.length < 8) throw new ApiError(400, 'Passwords must be at least 8 characters.')
    user.password = newPassword
    save(db)
  },

  async listUsers() {
    await delay()
    const db = load()
    requireAdmin(db)
    return [...db.users].sort((a, b) => a.displayName.localeCompare(b.displayName)).map(toUser)
  },

  async createUser(input) {
    await delay()
    const db = load()
    requireAdmin(db)
    if (db.users.some(u => u.email.toLowerCase() === input.email.toLowerCase()))
      throw new ApiError(409, 'A user with that email already exists.')
    if (input.password.length < 8) throw new ApiError(400, 'Passwords must be at least 8 characters.')
    const user: DemoUser = {
      id: `u-${crypto.randomUUID()}`,
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      isAdmin: input.isAdmin,
      password: input.password,
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    save(db)
    return toUser(user)
  },

  async deleteUser(id) {
    await delay()
    const db = load()
    const me = requireAdmin(db)
    if (id === me.id) throw new ApiError(400, 'You cannot delete your own account.')
    if (!db.users.some(u => u.id === id)) throw new ApiError(404, 'Not Found')
    db.users = db.users.filter(u => u.id !== id)
    db.reviews = db.reviews.filter(r => r.userId !== id)
    for (const b of db.books) if (b.addedByUserId === id) b.addedByUserId = null
    save(db)
  },

  async listBooks({ search, sort, page = 1, pageSize = 24 }) {
    await delay()
    const db = load()
    currentUser(db)
    page = Math.max(1, page)
    pageSize = Math.min(100, Math.max(1, pageSize))

    let items: BookSummary[] = db.books.map(b => {
      const rs = db.reviews.filter(r => r.bookId === b.id)
      return {
        id: b.id, title: b.title, authors: b.authors, isbn: b.isbn, publishedYear: b.publishedYear,
        coverUrl: b.coverUrl, location: b.location, averageRating: average(rs), reviewCount: rs.length,
        createdAt: b.createdAt,
      }
    })

    const q = search?.trim().toLowerCase()
    if (q) {
      items = items.filter(b =>
        [b.title, b.authors, b.isbn, b.location].some(f => f?.toLowerCase().includes(q)))
    }

    const byTitle = (a: BookSummary, b: BookSummary) => a.title.localeCompare(b.title)
    const sorters: Record<string, (a: BookSummary, b: BookSummary) => number> = {
      author: (a, b) => a.authors.localeCompare(b.authors) || byTitle(a, b),
      year: (a, b) => (b.publishedYear ?? -Infinity) - (a.publishedYear ?? -Infinity) || byTitle(a, b),
      rating: (a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0) || byTitle(a, b),
      added: (a, b) => b.createdAt.localeCompare(a.createdAt),
    }
    items.sort(sorters[sort ?? ''] ?? byTitle)

    return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }
  },

  async getBook(id) {
    await delay()
    const db = load()
    const me = currentUser(db)
    return toDetail(db, findBook(db, id), me)
  },

  async createBook(input) {
    await delay()
    const db = load()
    const me = currentUser(db)
    validateBook(input)
    const now = new Date().toISOString()
    const book: DemoBook = {
      id: db.nextBookId++, title: '', authors: '', isbn: null, publishedYear: null, publisher: null,
      description: null, coverUrl: null, pageCount: null, location: null,
      createdAt: now, updatedAt: now, addedByUserId: me.id,
    }
    applyBook(book, input)
    db.books.push(book)
    save(db)
    return toDetail(db, book, me)
  },

  async updateBook(id, input) {
    await delay()
    const db = load()
    const me = currentUser(db)
    validateBook(input)
    const book = findBook(db, id)
    applyBook(book, input)
    book.updatedAt = new Date().toISOString()
    save(db)
    return toDetail(db, book, me)
  },

  async deleteBook(id) {
    await delay()
    const db = load()
    const me = currentUser(db)
    const book = findBook(db, id)
    if (!me.isAdmin && book.addedByUserId !== me.id) throw new ApiError(403, 'Forbidden')
    db.books = db.books.filter(b => b.id !== id)
    db.reviews = db.reviews.filter(r => r.bookId !== id)
    save(db)
  },

  async saveMyReview(bookId, input) {
    await delay()
    const db = load()
    const me = currentUser(db)
    findBook(db, bookId)
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
      throw new ApiError(400, 'Rating must be between 1 and 5.')

    const now = new Date().toISOString()
    let review = db.reviews.find(r => r.bookId === bookId && r.userId === me.id)
    if (!review) {
      review = { id: db.nextReviewId++, bookId, userId: me.id, rating: 0, text: null, readDate: null, createdAt: now, updatedAt: now }
      db.reviews.push(review)
    }
    review.rating = input.rating
    review.text = clean(input.text)
    review.readDate = input.readDate
    review.updatedAt = now
    save(db)
    const { bookId: _bookId, ...rest } = review
    return { ...rest, userName: me.displayName }
  },

  async deleteMyReview(bookId) {
    await delay()
    const db = load()
    const me = currentUser(db)
    const before = db.reviews.length
    db.reviews = db.reviews.filter(r => !(r.bookId === bookId && r.userId === me.id))
    if (db.reviews.length === before) throw new ApiError(404, 'Not Found')
    save(db)
  },

  async lookupIsbn(raw) {
    currentUser(load())
    const isbn = raw.replace(/[-\s]/g, '').toUpperCase()
    if (!/^(\d{9}[\dX]|\d{13})$/.test(isbn)) throw new ApiError(400, 'Invalid ISBN.')

    let res: Response
    try {
      res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
    } catch {
      throw new ApiError(502, 'ISBN lookup failed.')
    }
    if (!res.ok) throw new ApiError(502, 'ISBN lookup failed.')
    const data = (await res.json())[`ISBN:${isbn}`]
    if (!data) throw new ApiError(404, 'No book found for that ISBN.')
    return parseOpenLibrary(isbn, data)
  },
}

// Same mapping as LookupEndpoints.Parse in the .NET API.
interface OpenLibraryBook {
  title?: string
  subtitle?: string
  authors?: { name?: string }[]
  publishers?: { name?: string }[]
  publish_date?: string
  number_of_pages?: number
  cover?: { medium?: string; large?: string }
  excerpts?: { text?: string }[]
}

function parseOpenLibrary(isbn: string, d: OpenLibraryBook): IsbnLookup {
  const names = (xs?: { name?: string }[]) => xs?.map(x => x.name).filter(Boolean).join(', ') || null
  const year = d.publish_date?.match(/\b(\d{4})\b/)?.[1]
  const coverUrl = d.cover?.large ?? d.cover?.medium ?? null
  return {
    isbn,
    title: d.title ? (d.subtitle ? `${d.title}: ${d.subtitle}` : d.title) : null,
    authors: names(d.authors),
    publisher: names(d.publishers),
    publishedYear: year ? Number(year) : null,
    pageCount: d.number_of_pages ?? null,
    coverUrl: coverUrl?.replace('http://', 'https://') ?? null,
    description: d.excerpts?.[0]?.text ?? null,
  }
}
