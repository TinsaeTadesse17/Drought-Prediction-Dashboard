import type { Region } from "@/lib/regions"

export type Role = "admin" | "regional_officer" | "woreda_officer"

export type PlaceOfInterest = {
  region: Region
  woreda?: string
}

export type User = {
  id: string
  name: string
  email: string
  role: Role
  allowedRegions: Region[]
  placeOfInterest: PlaceOfInterest
}

export const DUMMY_USERS: User[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    allowedRegions: ["afar", "somali"],
    placeOfInterest: { region: "afar" },
  },
  {
    id: "2",
    name: "Afar Officer",
    email: "afar.officer@example.com",
    role: "regional_officer",
    allowedRegions: ["afar"],
    placeOfInterest: { region: "afar", woreda: "Elidar" },
  },
  {
    id: "3",
    name: "Somali Officer",
    email: "somali.officer@example.com",
    role: "woreda_officer",
    allowedRegions: ["somali"],
    placeOfInterest: { region: "somali", woreda: "Gode" },
  },
  // {
  //   id: "4",
  //   name: "Civilian User",
  //   email: "civilian@example.com",
  //   role: "civilian" as any, // removed role; keeping entry commented out
  //   allowedRegions: ["afar", "somali"],
  //   placeOfInterest: { region: "afar", woreda: "Elidar" },
  // },
]

const STORAGE_KEY = "auth:user"
const USERS_KEY = "auth:users"

function loadUsers(): User[] {
  if (typeof window === "undefined") return DUMMY_USERS
  const raw = window.localStorage.getItem(USERS_KEY)
  if (!raw) {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(DUMMY_USERS))
    return DUMMY_USERS
  }
  try {
    const arr = JSON.parse(raw) as User[]
    if (!Array.isArray(arr) || arr.length === 0) return DUMMY_USERS
    return arr
  } catch {
    return DUMMY_USERS
  }
}

function saveUsers(users: User[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function listUsers(): User[] {
  return loadUsers()
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function loginByEmail(email: string): User | null {
  const users = loadUsers()
  const user = users.find((u) => u.email === email) || null
  if (user && typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }
  return user
}

export type RegisterInput = {
  name: string
  email: string
  role: Role
  region: Region
  woreda?: string
}

export function registerUser(input: RegisterInput): { user?: User; error?: string } {
  if (typeof window === "undefined") return { error: "Not in browser" }
  const users = loadUsers()
  if (users.some((u) => u.email === input.email)) {
    return { error: "Email already registered" }
  }
  if ((input.role === "woreda_officer") && !input.woreda) {
    return { error: "Woreda is required for this role" }
  }
  let allowedRegions: Region[]
  switch (input.role) {
    case "admin":
      allowedRegions = ["afar", "somali"]
      break
    case "regional_officer":
      allowedRegions = [input.region]
      break
    case "woreda_officer":
      allowedRegions = [input.region]
      break
    default:
      allowedRegions = [input.region]
  }
  const user: User = {
    id: (Date.now() + Math.random()).toString(36),
    name: input.name,
    email: input.email,
    role: input.role,
    allowedRegions,
    placeOfInterest: { region: input.region, woreda: input.woreda },
  }
  users.push(user)
  saveUsers(users)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  return { user }
}

export function logout(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
