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

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching QR codes for JSON export:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const exportData = {
      campaignId,
      exportedAt: new Date().toISOString(),
      totalCount: (data || []).length,
      usedCount: (data || []).filter((q: any) => q.is_used).length,
      unusedCount: (data || []).filter((q: any) => !q.is_used).length,
      qrCodes: data || [],
    }

    return NextResponse.json(exportData)
  } catch (error) {
    console.error("[v0] Error exporting QR codes to JSON:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
