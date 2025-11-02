import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid input format" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const { data: manager, error: managerError } = await supabase
      .from("managers")
      .select("*")
      .eq("email", email)
      .single()

    if (managerError || !manager) {
      return NextResponse.json({ error: "Manager profile not found" }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      session: data.session,
      manager: {
        id: manager.id,
        email: manager.email,
        name: manager.name,
        role: manager.role,
      },
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
