import { NextResponse } from "next/server"
import { generateQRCodesForCampaign, getQRCodeStats, verifyQRCode, generatePreviewQRCodes } from "@/lib/qr-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, campaignId, baseUrl, url, qrId, location, token, t } = body

    // Quick preview mode: frontend (admin) may POST { campaignId, url } without action.
    // Support action: 'preview' as explicit variant too.
    if (action === "preview" || (campaignId && url && !action)) {
      if (!campaignId || !url) {
        return NextResponse.json({ error: "Missing required fields for preview" }, { status: 400 })
      }

      // baseUrl should be the origin (e.g. window.location.origin). If not provided, derive from url.
      const origin =
        baseUrl ||
        (() => {
          try {
            return new URL(url).origin
          } catch {
            return undefined
          }
        })()

      if (!origin) {
        return NextResponse.json({ error: "baseUrl could not be determined" }, { status: 400 })
      }

      const previewResults = await generatePreviewQRCodes(campaignId, origin)
      // Return the first QR as compatibility, and also the full list
      return NextResponse.json({ qrCode: previewResults[0]?.qrCode, results: previewResults }, { status: 201 })
    }

    switch (action) {
      case "generate":
        if (!campaignId || !baseUrl) {
          return NextResponse.json({ error: "Missing required fields: campaignId and baseUrl" }, { status: 400 })
        }

        console.log("[v0] QR generation request for campaign:", campaignId)
        const results = await generateQRCodesForCampaign(campaignId, baseUrl)

        const hasErrors = results.some((r) => r.errors && r.errors.length > 0)

        if (hasErrors) {
          // Check if this is the error result wrapper
          if (results.length === 1 && results[0].skuId === "error") {
            const errorMsg = results[0].errors[0] || "Failed to generate QR codes"
            console.error("[v0] QR generation failed:", errorMsg)
            return NextResponse.json({ error: errorMsg }, { status: 500 })
          }
        }

        console.log(
          "[v0] QR generation successful:",
          results.map((r) => ({ sku: r.skuId, count: r.totalGenerated, errors: r.errors?.length || 0 })),
        )
        return NextResponse.json(results, { status: 201 })

      case "verify":
        // Support verification by raw token (t) or by qrId
        const rawToken = token || t
        if (!qrId && !rawToken) {
          return NextResponse.json({ error: "QR token or ID is required" }, { status: 400 })
        }

        const subject = rawToken || qrId
        const isValid = await verifyQRCode(subject, location)
        return NextResponse.json({ isValid }, { status: 200 })

      case "stats":
        if (!campaignId) {
          return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
        }

        const stats = await getQRCodeStats(campaignId)
        return NextResponse.json(stats, { status: 200 })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] QR code operation error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaignId")

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 })
    }

    const stats = await getQRCodeStats(campaignId)
    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] QR code stats error:", error)
    return NextResponse.json({ error: "Failed to fetch QR code stats" }, { status: 500 })
  }
}
