import QRCode from "qrcode"
import { createServerSupabaseClient } from "./supabase-server"
import { calculateQRCodesPerProduct } from "./products"
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
  codesPerSKU: number
): Promise<QRGenerationResult> {
  const supabase = await createServerSupabaseClient()
  const errors: string[] = []
  const qrCodes: Array<{ id: string; code: string; url: string; image?: string }> = []
  let totalGenerated = 0

  try {
    // Generate QR codes in batches
    for (let i = 0; i < codesPerSKU; i += BATCH_SIZE) {
      const batchCodes: QRCodeData[] = []
      const batchQRCodes: Array<{ id: string; code: string; url: string; image?: string }> = []
      const currentBatchSize = Math.min(BATCH_SIZE, codesPerSKU - i)

      // Generate batch of QR codes
      for (let j = 0; j < currentBatchSize; j++) {
        // generate a secure token and a hash to store
        // Use consistent 16 bytes (32 hex chars) for all tokens
        const token = crypto.randomBytes(16).toString("hex")
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
        // include the raw token in the QR url so the client can present it on feedback submit
        // Use 'campaign' parameter to match feedback page expectations
        const qrUrl = `${baseUrl}/feedback?campaign=${campaignId}&s=${skuId}&t=${token}&qr=true`
        
        try {
          const qrCode = await QRCode.toDataURL(qrUrl, {
            errorCorrectionLevel: "H",
            type: "image/png",
            width: 300,
            margin: 2,
            color: {
              dark: "#1a1a1a",
              light: "#ffffff",
            },
          })

          batchCodes.push({
            sku_id: skuId,
            code: qrCode,
            url: qrUrl,
            is_used: false,
            token_hash: tokenHash,
            campaign_id: campaignId,
            batch_number: batchNumber,
          } as any)

          // Add to the batch array (ID will be added after database insert)
          // Store both the token and image - code field stores token for identification, image has the QR code data
          batchQRCodes.push({ id: "", code: qrCode, url: qrUrl, image: qrCode })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          errors.push(`Failed to generate QR code ${j + 1}: ${message}`)
        }
      }

      // Insert batch into database and get IDs back
      if (batchCodes.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from("qr_codes")
          .insert(batchCodes)
          .select("id, url, token_hash")
        
        if (insertError) {
          errors.push(`Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`)
          console.error("[v0] Batch insert error:", insertError)
        } else if (insertedData) {
          totalGenerated += insertedData.length
          
          // Create a map of URLs to inserted records for efficient lookup
          const urlToInserted = new Map<string, any>()
          insertedData.forEach((inserted: any) => {
            urlToInserted.set(inserted.url, inserted)
          })
          
          // Map inserted IDs to batch QR codes by matching URL
          // Use the batchCodes array order to match with insertedData
          for (let idx = 0; idx < batchCodes.length && idx < insertedData.length; idx++) {
            const batchQR = batchQRCodes[idx]
            const inserted = insertedData[idx]
            
            // Verify URL matches as a safety check
            if (batchQR && inserted && batchQR.url === inserted.url) {
              batchQR.id = inserted.id
            } else {
              // Fallback: try to find by URL
              const found = urlToInserted.get(batchQR.url)
              if (found) {
                batchQR.id = found.id
              } else {
                console.warn(`[v0] Could not match QR code for URL: ${batchQR.url}`)
                errors.push(`Failed to match QR code ID for URL: ${batchQR.url.substring(0, 50)}...`)
              }
            }
          }
          
          // Only add QR codes that have IDs
          const validQRCodes = batchQRCodes.filter(qr => qr.id)
          if (validQRCodes.length > 0) {
            qrCodes.push(...validQRCodes)
          } else {
            errors.push(`Failed to get IDs for batch ${Math.floor(i / BATCH_SIZE) + 1}: All QR codes were inserted but no IDs were retrieved`)
          }
        } else {
          errors.push(`Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}: No data returned from database`)
        }
      }
    }

    return {
      skuId,
      totalGenerated,
      errors,
      batchNumber,
      qrCodes
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`Batch generation failed: ${message}`)
    return {
      skuId,
      totalGenerated,
      errors,
      batchNumber,
      qrCodes
    }
  }
}

export async function generateQRCodesForCampaign(campaignId: string, baseUrl: string): Promise<QRGenerationResult[]> {
  const supabase = await createServerSupabaseClient()
  const results: QRGenerationResult[] = []
  // Get campaign
  const { data: campaign, error: campaignError } = await supabase.from("campaigns").select("*").eq("id", campaignId).single()
  if (campaignError || !campaign) {
    throw new Error("Failed to fetch campaign details")
  }

  // Fetch products linked to this campaign via campaign_products
  const { data: cpRows, error: cpError } = await supabase.from("campaign_products").select("product_id").eq("campaign_id", campaignId)
  if (cpError) {
    throw new Error("Failed to fetch campaign products")
  }

  const productIds = (cpRows || []).map((r: any) => r.product_id)
  if (productIds.length === 0) {
    throw new Error("No products linked to campaign")
  }

  // Fetch products and their skus
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select(`id, name, product_skus ( id, weight, price, reward_amount )`)
    .in("id", productIds)

  if (prodError || !products) {
    console.error("[v0] Error fetching products for campaign:", prodError)
    throw new Error(`Failed to fetch products for campaign: ${prodError?.message || "Unknown error"}`)
  }

  // Calculate how many QR codes each SKU should get (distribute TOTAL_QR_CODES evenly)
  const totalSKUs = products.reduce((acc: number, p: any) => acc + (p.product_skus?.length || 0), 0)
  const codesPerSKU = Math.max(1, Math.floor(TOTAL_QR_CODES / Math.max(1, totalSKUs)))

  // Generate QR codes for each SKU
  let batchNumber = 1
  for (const product of products) {
    for (const sku of product.product_skus || []) {
      const result = await generateQRCodesForSKU(sku.id, campaignId, baseUrl, batchNumber, codesPerSKU)
      results.push(result)
      batchNumber++
    }
  }

  return results
}

export async function verifyQRCode(qrId: string, location?: { latitude: number; longitude: number }): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  // Support token verification (raw token) or qr id lookup
  // If qrId looks like a token (not a UUID), treat it as raw token
  const isRawToken = typeof qrId === "string" && !/^[0-9a-fA-F-]{36,}$/.test(qrId)

  if (isRawToken) {
    const tokenHash = crypto.createHash("sha256").update(qrId).digest("hex")
    // find QR by token_hash
    const { data: qrRows, error } = await supabase.from("qr_codes").select("id, is_used").eq("token_hash", tokenHash).limit(1).single()
    if (error || !qrRows) return false
    if (qrRows.is_used) return false

    const updateData: any = { is_used: true, used_at: new Date().toISOString() }
    if (location) updateData.location = location

    const { error: updateError } = await supabase.from("qr_codes").update(updateData).eq("id", qrRows.id).eq("is_used", false)
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
  const { data, error } = await supabase.from("qr_codes").select("id, is_used, location, sku_id").eq("campaign_id", campaignId)
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
  const { data: cpRows, error: cpError } = await supabase.from("campaign_products").select("product_id").eq("campaign_id", campaignId)
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