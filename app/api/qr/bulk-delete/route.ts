import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { qrCodeIds } = body

    if (!Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
      return NextResponse.json({ error: "QR code IDs array is required" }, { status: 400 })
    }

    const { data, error } = await supabase.from("qr_codes").delete().in("id", qrCodeIds)

    if (error) {
      console.error("[v0] Error deleting QR codes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully deleted ${qrCodeIds.length} QR codes`,
      deletedCount: qrCodeIds.length,
    })
  } catch (error) {
    console.error("[v0] Error in bulk delete:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
