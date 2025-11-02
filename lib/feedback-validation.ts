import { createServerSupabaseClient } from "@/lib/supabase-server"

interface Location {
  latitude: number
  longitude: number
  region: string
}

export async function validatePhoneNumber(phone: string): Promise<boolean> {
  // Validate Kenyan phone number format
  return /^(\+254|0)(7|1)\d{8}$/.test(phone.replace(/\s/g, ""))
}

export async function checkDuplicateSubmission(
  supabase: any,
  campaignId: string,
  customerPhone: string,
  qrId: string
): Promise<boolean> {
  // If qrId is a token (not UUID-like) then lookup by token_hash
  let qrCode: any = null
  if (typeof qrId === "string" && !/^[0-9a-fA-F-]{36,}$/.test(qrId)) {
    const tokenHash = require("crypto").createHash("sha256").update(qrId).digest("hex")
    const { data, error } = await supabase.from("qr_codes").select("is_used").eq("token_hash", tokenHash).single()
    if (error) {
      qrCode = null
    } else qrCode = data
  } else {
    const { data } = await supabase.from("qr_codes").select("is_used").eq("id", qrId).single()
    qrCode = data
  }

  if (qrCode?.is_used) return true

  // Check if customer has already submitted feedback for this campaign
  const { data: existingFeedback } = await supabase
    .from("feedback")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("customer_phone", customerPhone)

  return existingFeedback && existingFeedback.length > 0
}

export async function isLocationValid(location: Location): Promise<boolean> {
  // Check if location is within Nairobi boundaries (approximate)
  const NAIROBI_BOUNDS = {
    north: -1.1864,
    south: -1.4564,
    east: 37.0833,
    west: 36.6667,
  }

  return (
    location.latitude >= NAIROBI_BOUNDS.south &&
    location.latitude <= NAIROBI_BOUNDS.north &&
    location.longitude >= NAIROBI_BOUNDS.west &&
    location.longitude <= NAIROBI_BOUNDS.east &&
    location.region.toLowerCase().includes("nairobi")
  )
}

export async function processReward(
  supabase: any,
  feedbackId: string,
  customerPhone: string,
  skuId: string
): Promise<boolean> {
  // Get SKU details to determine reward amount
  const { data: sku } = await supabase
    .from("product_skus")
    .select("weight, reward_amount, reward_description")
    .eq("id", skuId)
    .single()

  if (!sku) {
    return false
  }

  // Determine reward amount based on SKU weight
  const rewardAmount = sku.weight === "500g" ? 30 : 20
  const rewardDescription = sku.weight === "500g" ? "30 KES Data Bundle (150MB)" : "20 KES Data Bundle (100MB)"

  // Create reward record
  const { error: rewardError } = await supabase.from("rewards").insert([
    {
      feedback_id: feedbackId,
      customer_phone: customerPhone,
      amount: rewardAmount,
      reward_name: rewardDescription,
      status: "pending",
    },
  ])

  return !rewardError
}

export async function updateQRCodeUsage(
  supabase: any,
  qrId: string,
  location: Location,
  customerPhone: string
): Promise<boolean> {
  // Support token or id
  if (typeof qrId === "string" && !/^[0-9a-fA-F-]{36,}$/.test(qrId)) {
    const tokenHash = require("crypto").createHash("sha256").update(qrId).digest("hex")
    const { error } = await supabase
      .from("qr_codes")
      .update({ is_used: true, used_at: new Date().toISOString(), used_by: customerPhone, location })
      .eq("token_hash", tokenHash)
      .eq("is_used", false)

    return !error
  }

  const { error } = await supabase
    .from("qr_codes")
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      used_by: customerPhone,
      location,
    })
    .eq("id", qrId)

  return !error
}