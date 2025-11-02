interface StorageData {
  campaigns: any[]
  feedback: any[]
  rewards: any[]
  customers: any[]
  managers: any[]
  products: any[]
}

const STORAGE_KEY = "shopper-reward-system-db"
const CACHE_KEY = "shopper-reward-analytics-cache"

export function loadFromStorage(): Partial<StorageData> {
  if (typeof window === "undefined") return {}

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error("[v0] Storage load error:", error)
    return {}
  }
}

export function saveToStorage(data: StorageData): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error("[v0] Storage save error:", error)
  }
}

export function getAnalyticsCache(): any {
  if (typeof window === "undefined") return null

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp

    // Cache valid for 30 seconds
    if (age < 30000) {
      return data
    }

    localStorage.removeItem(CACHE_KEY)
    return null
  } catch (error) {
    console.error("[v0] Cache load error:", error)
    return null
  }
}

export function setAnalyticsCache(data: any): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    )
  } catch (error) {
    console.error("[v0] Cache save error:", error)
  }
}

export function clearAnalyticsCache(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(CACHE_KEY)
}
