import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import {
  validatePhoneNumber,
  checkDuplicateSubmission,
  isLocationValid,
  processReward,
  updateQRCodeUsage,
} from "@/lib/feedback-validation"

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaignId")

    let query = supabase.from("feedback").select(`
      *,
      product_skus (
        weight,
        price,
        reward_amount,
        reward_description
      )
    `)

    if (campaignId) {
      query = query.eq("campaign_id", campaignId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Feedback GET error:", error)
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    // Validate required fields
    if (!body.campaign_id || !body.sku_id || !body.customer_phone || !(body.qr_id || body.token || body.t) || !body.location) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate phone number
    if (!await validatePhoneNumber(body.customer_phone)) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
    }

    // Validate location
    if (!await isLocationValid(body.location)) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 })
    }

    // Validate rating
    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    // Call the verify_and_reward_feedback stored procedure
    const { data, error } = await supabase
      .rpc('verify_and_reward_feedback', {
        p_campaign_id: body.campaign_id,
        p_sku_id: body.sku_id,
        p_customer_phone: body.customer_phone,
        p_qr_token: body.qr_id || body.token || body.t,
        p_location: body.location,
        p_rating: body.rating,
        p_customer_name: body.customer_name || null,
        p_comment: body.comment || null,
        p_custom_answers: body.custom_answers || {}
      })

    if (error) {
      console.error("[v0] Feedback atomic transaction error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("[v0] Feedback creation error:", error)
    return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 })
  }
}
