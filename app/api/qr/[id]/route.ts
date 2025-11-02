import { createServerSupabaseClient } from "@/lib/supabase-server"
import { generateQRImage } from "@/lib/qr-service"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "QR code ID is required" }, { status: 400 })
    }

    const { data: qrCode, error } = await supabase.from("qr_codes").select("id, url").eq("id", id).single()

    if (error || !qrCode) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 })
    }

    const code = await generateQRImage(qrCode.url)

    return NextResponse.json({ id: qrCode.id, code, url: qrCode.url })
  } catch (error) {
    console.error("[v0] Error fetching QR code:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
