import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

const DEFAULT_PAGE_SIZE = 50

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const campaignId = searchParams.get("campaignId")
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Number.parseInt(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE.toString(), 10)
    const isUsedFilter = searchParams.get("isUsed")

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    if (page < 1 || pageSize < 1 || pageSize > 1000) {
      return NextResponse.json({ error: "Invalid page or pageSize parameters" }, { status: 400 })
    }

    let query = supabase
      .from("qr_codes")
      .select("id, url, is_used, campaign_id, sku_id, created_at, used_at", { count: "exact" })
      .eq("campaign_id", campaignId)

    // Apply optional filters
    if (isUsedFilter !== null) {
      const isUsed = isUsedFilter === "true"
      query = query.eq("is_used", isUsed)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query.range(from, to).order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching paginated QR codes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / pageSize)

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error("[v0] Error in paginated QR codes endpoint:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
