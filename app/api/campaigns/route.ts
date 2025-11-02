import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { validateCampaign } from "@/lib/validation"
import type { DatabaseCampaign, CampaignProduct, ProductSKU } from "@/types/api"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: campaigns, error } = await supabase.from("campaigns").select(`
      id, 
      name, 
      description, 
      start_date, 
      end_date, 
      target_responses, 
      active, 
      meta,
      campaign_products (
        product_id,
        products (
          id,
          name,
          product_skus (
            id,
            reward_amount,
            reward_description
          )
        )
      )
    `)

    if (error) {
      console.error("[v0] Campaigns GET error (supabase):", error)
      return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
    }

    // Transform the data to match the Campaign interface
    const transformedCampaigns = (campaigns || []).map(campaign => {
      const dbCampaign = campaign as unknown as DatabaseCampaign
      const meta = dbCampaign.meta || {}
      return {
        ...dbCampaign,
        created_at: new Date(dbCampaign.created_at || Date.now()),
        start_date: new Date(dbCampaign.start_date),
        end_date: new Date(dbCampaign.end_date),
        responses: dbCampaign.responses || 0,
        runCount: dbCampaign.runCount || 0,
        questions: meta.questions || [],
        rewards: dbCampaign.campaign_products?.flatMap((cp: CampaignProduct) => 
          cp.products.product_skus.map((sku: ProductSKU) => ({
            id: sku.id,
            feedback_id: null, // Will be set when feedback is submitted
            customer_id: null, // Will be set when feedback is submitted
            phone_number: null, // Will be set when feedback is submitted
            amount: sku.reward_amount,
            reward_name: sku.reward_description,
            status: 'pending' as const
          })) || []
        ) || [],
        products: dbCampaign.campaign_products?.map((cp: CampaignProduct) => cp.product_id) || []
      }
    })

    return NextResponse.json(transformedCampaigns)
  } catch (error) {
    console.error("[v0] Campaigns GET error:", error)
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateCampaign(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    const { data: inserted, error } = await supabase
      .from("campaigns")
      .insert([
        {
          name: body.name,
          description: body.description,
          start_date: body.start_date,
          end_date: body.end_date,
          target_responses: body.target_responses,
          active: body.active ?? true,
          meta: body.meta || null,
        },
      ])
      .select()
      .single()

    if (error || !inserted) {
      console.error("[v0] Campaigns POST error (supabase):", error)
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
    }

    // Link products to campaign if provided
    const productIds: string[] = Array.isArray(body.products) ? body.products : []
    if (productIds.length > 0) {
      const rows = productIds.map((pid) => ({ campaign_id: inserted.id, product_id: pid }))
      const { error: cpError } = await supabase.from("campaign_products").insert(rows)
      if (cpError) {
        console.error("[v0] Failed to insert campaign_products:", cpError)
      }
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (error) {
    console.error("[v0] Campaigns POST error:", error)
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { campaignId, questions, rewards, responses } = body
    if (!campaignId || typeof campaignId !== "string") {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Fetch existing campaign to preserve existing meta data
    const { data: existing, error: fetchErr } = await supabase
      .from("campaigns")
      .select("meta")
      .eq("id", campaignId)
      .single()

    if (fetchErr && fetchErr.code !== "PGRST116") {
      // PGRST116 is "not found" - we'll handle that below
      console.error("[v0] Failed to fetch existing campaign:", fetchErr)
      return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 })
    }

    const updatePayload: any = {}
    const existingMeta = existing?.meta || {}

    // Properly merge meta field instead of overwriting
    if (questions !== undefined || rewards !== undefined) {
      updatePayload.meta = {
        ...existingMeta,
        ...(questions !== undefined && { questions }),
        ...(rewards !== undefined && { rewards }),
      }
    }

    if (responses !== undefined) {
      updatePayload.responses = responses
    }

    const { data, error } = await supabase.from("campaigns").update(updatePayload).eq("id", campaignId).select().single()
    if (error) {
      console.error("[v0] Campaigns PUT error (supabase):", error)
      return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Campaigns PUT error:", error)
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { campaignId } = body
    if (!campaignId || typeof campaignId !== "string") {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: existing, error: fetchErr } = await supabase.from("campaigns").select().eq("id", campaignId).single()
    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("campaigns")
      .update({ runCount: (existing.runCount || 0) + 1, responses: 0 })
      .eq("id", campaignId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Campaigns PATCH error (supabase):", error)
      return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Campaigns PATCH error:", error)
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("id")

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // First, delete related campaign_products entries
    const { error: cpError } = await supabase.from("campaign_products").delete().eq("campaign_id", campaignId)
    if (cpError) {
      console.error("[v0] Failed to delete campaign_products:", cpError)
      // Continue with campaign deletion even if this fails
    }

    // Delete the campaign
    const { error } = await supabase.from("campaigns").delete().eq("id", campaignId)

    if (error) {
      console.error("[v0] Campaigns DELETE error (supabase):", error)
      return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Campaign deleted successfully" })
  } catch (error) {
    console.error("[v0] Campaigns DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
  }
}
