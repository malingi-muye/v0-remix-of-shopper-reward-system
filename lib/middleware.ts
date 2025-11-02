export function requireAuth() {
  if (typeof window === "undefined") return false

  const session = sessionStorage.getItem("shopper-reward-session")
  return session !== null
}

export function getAuthUser() {
  if (typeof window === "undefined") return null

  try {
    const session = sessionStorage.getItem("shopper-reward-session")
    return session ? JSON.parse(session) : null
  } catch (error) {
    console.error("[v0] Auth user error:", error)
    return null
  }
}
