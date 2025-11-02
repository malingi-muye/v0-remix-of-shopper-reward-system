import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json({ error: "Logout failed" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Logout error:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
