import { createClient } from "@/lib/supabase-client"

interface Session {
  user: {
    id: string
    email: string
  }
  manager: {
    id: string
    email: string
    name: string
    role: "admin" | "manager"
  }
}

export async function getSupabaseSession(): Promise<Session | null> {
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return null

    // Fetch manager details from managers table
    const { data: manager, error } = await supabase
      .from("managers")
      .select("*")
      .eq("email", session.user.email)
      .single()

    if (error || !manager) return null

    return {
      user: {
        id: session.user.id,
        email: session.user.email!,
      },
      manager: {
        id: manager.id,
        email: manager.email,
        name: manager.name,
        role: manager.role,
      },
    }
  } catch (error) {
    console.error("[v0] Session fetch error:", error)
    return null
  }
}

export const getSession = getSupabaseSession

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSupabaseSession()
  return session !== null
}
