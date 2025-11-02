import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ session: null }, { status: 401 })
    }

    const { data: manager, error } = await supabase
      .from("managers")
      .select("*")
      .eq("email", session.user.email)
      .single()

    if (error || !manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 401 })
    }

    return NextResponse.json({
      user: { id: session.user.id, email: session.user.email },
      manager: { id: manager.id, email: manager.email, name: manager.name, role: manager.role },
    })
  } catch (error) {
    console.error("[v0] Session error:", error)
    return NextResponse.json({ error: "Session check failed" }, { status: 500 })
  }
}
