import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const campaignId = searchParams.get("campaignId")
    const isUsedFilter = searchParams.get("isUsed")

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    let query = supabase
      .from("qr_codes")
      .select("id, url, is_used, sku_id, created_at, used_at, location")
      .eq("campaign_id", campaignId)

    if (isUsedFilter !== null) {
      const isUsed = isUsedFilter === "true"
      query = query.eq("is_used", isUsed)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching QR codes for CSV export:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const headers = ["QR ID", "URL", "SKU ID", "Status", "Used At", "Region", "Created At"]
    const rows = (data || []).map((qr: any) => [
      qr.id,
      qr.url,
      qr.sku_id || "",
      qr.is_used ? "Used" : "Unused",
      qr.used_at || "",
      qr.location?.region || "",
      new Date(qr.created_at).toISOString(),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="qr-codes-${campaignId}-${Date.now()}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error exporting QR codes to CSV:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
