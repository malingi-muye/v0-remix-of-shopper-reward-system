import QRCode from "qrcode"
import { createServerSupabaseClient } from "./supabase-server"
import crypto from "crypto"

const BATCH_SIZE = 100 // Number of QR codes to generate in a single batch
const TOTAL_QR_CODES = 1680

export interface QRGenerationResult {
  skuId: string
  totalGenerated: number
  errors: string[]
  batchNumber: number
  qrCodes: Array<{
    id: string
    code: string
    url: string
    image?: string
  }>
}

interface QRCodeData {
  sku_id: string
  code: string
  url: string
  is_used: boolean
  used_at?: string
  used_by?: string
  location?: any
}

export async function generateQRCodesForSKU(
  skuId: string,
  campaignId: string,
  baseUrl: string,
  batchNumber: number,
  codesPerSKU: number,
): Promise<QRGenerationResult> {
  const supabase = await createServerSupabaseClient()
  const errors: string[] = []
  const qrCodes: Array<{ id: string; code: string; url: string }> = []
  let totalGenerated = 0

  try {
    // Generate QR codes in batches
    for (let i = 0; i < codesPerSKU; i += BATCH_SIZE) {
      const batchCodes: any[] = []
      const currentBatchSize = Math.min(BATCH_SIZE, codesPerSKU - i)

      // Generate tokens and URLs (but NOT images yet)
      for (let j = 0; j < currentBatchSize; j++) {
        const token = crypto.randomBytes(16).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
        const qrUrl = `${baseUrl}/feedback?campaign=${campaignId}&s=${skuId}&t=${token}&qr=true`

        batchCodes.push({
          sku_id: skuId,
          url: qrUrl,
          token_hash: tokenHash,
          campaign_id: campaignId,
          is_used: false,
          batch_number: batchNumber,
        })
      }

      // Insert batch into database (only metadata, no images)
      if (batchCodes.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from("qr_codes")
          .insert(batchCodes)
          .select("id, url")

        if (insertError) {
          errors.push(`Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`)
        } else if (insertedData) {
          totalGenerated += insertedData.length

          // Map inserted IDs to QR codes
          for (let idx = 0; idx < batchCodes.length && idx < insertedData.length; idx++) {
            qrCodes.push({
              id: insertedData[idx].id,
              code: "", // Image generated on-demand
              url: insertedData[idx].url,
            })
          }
        }
      }
    }

    return { skuId, totalGenerated, errors, batchNumber, qrCodes }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`Batch generation failed: ${message}`)
    return { skuId, totalGenerated, errors, batchNumber, qrCodes }
  }
}

export async function generateQRCodesForCampaign(campaignId: string, baseUrl: string): Promise<QRGenerationResult[]> {
  const supabase = await createServerSupabaseClient()
  const results: QRGenerationResult[] = []

  try {
    console.log("[v0] Starting QR generation for campaign:", campaignId)

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single()

    if (campaignError) {
      console.error("[v0] Campaign fetch error:", campaignError)
      throw new Error(`Campaign not found: ${campaignError.message}`)
    }

    if (!campaign) {
      throw new Error("Campaign not found")
    }

    console.log("[v0] Campaign found:", campaign.name)

    // Fetch products linked to this campaign via campaign_products
    const { data: cpRows, error: cpError } = await supabase
      .from("campaign_products")
      .select("product_id")
      .eq("campaign_id", campaignId)

    if (cpError) {
      console.error("[v0] Campaign products fetch error:", cpError)
      throw new Error(`Failed to fetch campaign products: ${cpError.message}`)
    }

    const productIds = (cpRows || []).map((r: any) => r.product_id)

    if (productIds.length === 0) {
      throw new Error("No products linked to campaign. Please add products to the campaign first.")
    }

    console.log("[v0] Found products:", productIds.length)

    // Fetch products and their skus - try both table names
    let products = null
    let prodError = null

    const { data: productsData1, error: error1 } = await supabase
      .from("products")
      .select(`id, name, product_skus ( id, weight, price, reward_amount )`)
      .in("id", productIds)

    if (error1) {
      console.warn("[v0] Failed with product_skus join, trying products_skus:", error1.message)

      const { data: productsData2, error: error2 } = await supabase
        .from("products")
        .select(`id, name, products_skus ( id, weight, price, reward_amount )`)
        .in("id", productIds)

      if (error2) {
        console.error("[v0] Both attempts failed:", error2.message)
        throw new Error(`Failed to fetch products: ${error2.message}`)
      }

      products = productsData2
      prodError = error2
    } else {
      products = productsData1
      prodError = error1
    }

    if (!products || products.length === 0) {
      throw new Error("No products found for campaign")
    }

    console.log("[v0] Fetched products:", products.length)
    console.log(
      "[v0] Products with SKUs:",
      products.map((p) => ({ id: p.id, skuCount: (p.product_skus || p.products_skus || []).length })),
    )

    // Calculate how many QR codes each SKU should get
    const totalSKUs = products.reduce((acc: number, p: any) => {
      const skus = p.product_skus || p.products_skus || []
      return acc + skus.length
    }, 0)

    if (totalSKUs === 0) {
      throw new Error("No SKUs found in products. Please add SKUs to products first.")
    }

    console.log("[v0] Total SKUs:", totalSKUs)

    const codesPerSKU = Math.max(1, Math.floor(TOTAL_QR_CODES / Math.max(1, totalSKUs)))

    console.log("[v0] Codes per SKU:", codesPerSKU)

    // Generate QR codes for each SKU
    let batchNumber = 1
    for (const product of products) {
      const skus = product.product_skus || product.products_skus || []
      for (const sku of skus) {
        console.log("[v0] Generating QR codes for SKU:", sku.id)
        const result = await generateQRCodesForSKU(sku.id, campaignId, baseUrl, batchNumber, codesPerSKU)
        results.push(result)
        console.log("[v0] Generated:", result.totalGenerated, "errors:", result.errors.length)
        batchNumber++
      }
    }

    console.log("[v0] QR generation complete. Total results:", results.length)
    return results
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[v0] Campaign QR generation error:", message, error)
    return [
      {
        skuId: "error",
        totalGenerated: 0,
        errors: [message],
        batchNumber: 0,
        qrCodes: [],
      },
    ]
  }
}

export async function generateQRImage(url: string): Promise<string> {
  try {
    const qrCode = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    })
    return qrCode
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to generate QR image: ${message}`)
  }
}

export async function verifyQRCode(qrId: string, location?: { latitude: number; longitude: number }): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  // Support token verification (raw token) or qr id lookup
  // If qrId looks like a token (not a UUID), treat it as raw token
  const isRawToken = typeof qrId === "string" && !/^[0-9a-fA-F-]{36,}$/.test(qrId)

  if (isRawToken) {
    const tokenHash = crypto.createHash("sha256").update(qrId).digest("hex")
    // find QR by token_hash
    const { data: qrRows, error } = await supabase
      .from("qr_codes")
      .select("id, is_used")
      .eq("token_hash", tokenHash)
      .limit(1)
      .single()
    if (error || !qrRows) return false
    if (qrRows.is_used) return false

    const updateData: any = { is_used: true, used_at: new Date().toISOString() }
    if (location) updateData.location = location

    const { error: updateError } = await supabase
      .from("qr_codes")
      .update(updateData)
      .eq("id", qrRows.id)
      .eq("is_used", false)
    return !updateError
  }

  // Otherwise assume it's an ID lookup
  const { data: qrCode, error } = await supabase.from("qr_codes").select("is_used").eq("id", qrId).single()
  if (error || !qrCode) return false
  if (qrCode.is_used) return false

  const updateData: any = { is_used: true, used_at: new Date().toISOString() }
  if (location) updateData.location = location

  const { error: updateError } = await supabase.from("qr_codes").update(updateData).eq("id", qrId).eq("is_used", false)
  return !updateError
}

export async function getQRCodeStats(campaignId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("qr_codes")
    .select("id, is_used, location, sku_id")
    .eq("campaign_id", campaignId)
  if (error) throw new Error("Failed to fetch QR code stats")

  const total = data.length
  const used = data.filter((q: any) => q.is_used).length
  const unused = total - used
  const byRegion = new Map<string, number>()
  const bySKU = new Map<string, number>()

  data.forEach((qr: any) => {
    if (qr.is_used && qr.location?.region) {
      const region = qr.location.region
      byRegion.set(region, (byRegion.get(region) || 0) + 1)
    }
    const skuKey = qr.sku_id || "unknown"
    bySKU.set(skuKey, (bySKU.get(skuKey) || 0) + 1)
  })

  return { total, used, unused, byRegion, bySKU }
}

// Generate one QR code per SKU for a campaign and return the DataURLs
export async function generatePreviewQRCodes(campaignId: string, baseUrl: string) {
  const supabase = await createServerSupabaseClient()
  const results: Array<{ skuId: string; qrCode: string; url: string; skuName?: string }> = []

  // Fetch products linked to campaign
  const { data: cpRows, error: cpError } = await supabase
    .from("campaign_products")
    .select("product_id")
    .eq("campaign_id", campaignId)
  if (cpError) throw new Error("Failed to fetch campaign products")
  const productIds = (cpRows || []).map((r: any) => r.product_id)

  const { data: products, error: prodError } = await supabase
    .from("products")
    .select(`id, name, product_skus ( id, weight )`)
    .in("id", productIds)

  if (prodError || !products) {
    console.error("[v0] Error fetching products for preview:", prodError)
    throw new Error(`Failed to fetch products for preview: ${prodError?.message || "Unknown error"}`)
  }

  for (const product of products || []) {
    for (const sku of product.product_skus || []) {
      // Use consistent 16 bytes (32 hex chars) token length for security
      const token = crypto.randomBytes(16).toString("hex")
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
      const qrUrl = `${baseUrl}/feedback?campaign=${campaignId}&s=${sku.id}&t=${token}&qr=true`

      try {
        const qrCode = await QRCode.toDataURL(qrUrl, {
          errorCorrectionLevel: "H",
          type: "image/png",
          width: 300,
          margin: 2,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        })

        // persist to DB with token_hash
        const { error: insertErr } = await supabase.from("qr_codes").insert({
          sku_id: sku.id,
          code: qrCode,
          url: qrUrl,
          token_hash: tokenHash,
          campaign_id: campaignId,
          is_used: false,
          batch_number: 0, // Preview codes use batch 0
        })

        if (insertErr) {
          console.error("Failed to persist preview QR code:", insertErr)
        }

        results.push({ skuId: sku.id, qrCode, url: qrUrl, skuName: sku.weight })
      } catch (error) {
        console.error("Failed to generate preview QR for sku", sku.id, error)
      }
    }
  }

  return results
}
