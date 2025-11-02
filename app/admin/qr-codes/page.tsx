"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Campaign } from "@/types/database"
import JSZip from "jszip"

interface GeneratedQR {
  campaignId: string
  campaignName: string
  url: string
  qrCodeId: string
  generatedAt: Date
}

interface QRCodeListProps {
  generatedQRs: GeneratedQR[]
  qrCodeImages: Map<string, string>
  onFetchImage: (qrCodeId: string) => Promise<string | null>
  onDownload: (qrCodeId: string, campaignName: string) => Promise<void>
  onDelete: (index: number) => void
}

const ITEMS_PER_PAGE = 20 // Show only 20 at a time

function QRCodeList({ generatedQRs, qrCodeImages, onFetchImage, onDownload, onDelete }: QRCodeListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())

  const totalPages = Math.ceil(generatedQRs.length / ITEMS_PER_PAGE)
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const endIdx = startIdx + ITEMS_PER_PAGE
  const visibleQRs = generatedQRs.slice(startIdx, endIdx)

  useEffect(() => {
    // Only pre-load images for visible QR codes
    visibleQRs.forEach((item) => {
      if (!qrCodeImages.has(item.qrCodeId) && !loadingImages.has(item.qrCodeId)) {
        setLoadingImages((prev) => new Set(prev).add(item.qrCodeId))
        onFetchImage(item.qrCodeId).then(() => {
          setLoadingImages((prev) => {
            const next = new Set(prev)
            next.delete(item.qrCodeId)
            return next
          })
        })
      }
    })
  }, [currentPage, generatedQRs, qrCodeImages, onFetchImage, loadingImages])

  return (
    <div>
      {/* Compact list instead of large grid */}
      <div className="space-y-2">
        {visibleQRs.map((item, index) => {
          const imageUrl = qrCodeImages.get(item.qrCodeId)
          const isLoading = loadingImages.has(item.qrCodeId)

          return (
            <div
              key={item.qrCodeId || index}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-3"
            >
              {/* Thumbnail QR (small) */}
              <div className="flex-shrink-0 w-16 h-16 rounded bg-white flex items-center justify-center">
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                ) : imageUrl ? (
                  <img src={imageUrl || "/placeholder.svg"} alt="QR Code" className="w-16 h-16" />
                ) : (
                  <Button onClick={() => onFetchImage(item.qrCodeId)} variant="outline" size="sm" className="text-xs">
                    Load
                  </Button>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{item.campaignName}</h4>
                <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.generatedAt).toLocaleDateString()}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => onDownload(item.qrCodeId, item.campaignName)}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!imageUrl && isLoading}
                >
                  Download
                </Button>
                <Button onClick={() => onDelete(index)} variant="outline" size="sm">
                  Delete
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default function QRCodesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [generatedQRs, setGeneratedQRs] = useState<GeneratedQR[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [qrCodeImages, setQrCodeImages] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch("/api/campaigns")
        const data = await response.json()
        setCampaigns(data)
        if (data.length > 0) {
          setSelectedCampaign(data[0].id)
        }
      } catch (error) {
        console.error("Error fetching campaigns:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()

    // Load stored QR codes from localStorage
    const stored = localStorage.getItem("generatedQRs")
    if (stored) {
      setGeneratedQRs(JSON.parse(stored))
    }
  }, [])

  const handleGenerateQR = async () => {
    if (!selectedCampaign) {
      alert("Please select a campaign")
      return
    }

    setGenerating(true)
    try {
      const campaign = campaigns.find((c) => c.id === selectedCampaign)
      if (!campaign) {
        alert("Campaign not found")
        return
      }

      const baseUrl = window.location.origin

      const response = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", campaignId: selectedCampaign, baseUrl }),
      })

      if (!response.ok) {
        let errorMessage = "Unknown error occurred"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        alert(
          `Failed to generate QR codes:\n${errorMessage}\n\nPlease check:\n1. Campaign has products linked\n2. Products have SKUs\n3. All SKUs have reward amounts configured`,
        )
        console.error("[v0] QR generation error details:", { status: response.status, errorMessage })
        return
      }

      const data = await response.json()
      console.log("QR generation response:", data)

      // Server returns array of QRGenerationResult objects when action=generate
      if (Array.isArray(data)) {
        const newItems: GeneratedQR[] = []
        let totalGenerated = 0
        let totalErrors = 0

        for (const res of data) {
          // Log each result for debugging
          console.log("QR Generation Result:", {
            skuId: res.skuId,
            totalGenerated: res.totalGenerated,
            errors: res.errors?.length || 0,
            qrCodesCount: res.qrCodes?.length || 0,
          })

          totalGenerated += res.totalGenerated || 0
          totalErrors += res.errors?.length || 0

          // Check if res has qrCodes array
          if (res.qrCodes && Array.isArray(res.qrCodes)) {
            for (const qr of res.qrCodes) {
              // Only store metadata (ID and URL), not the base64 image
              if (qr.id && qr.url) {
                newItems.push({
                  campaignId: selectedCampaign,
                  campaignName: campaign.name,
                  url: qr.url,
                  qrCodeId: qr.id,
                  generatedAt: new Date(),
                })
              } else {
                console.warn("QR code missing ID or URL:", qr)
              }
            }
          } else {
            console.warn("Result missing qrCodes array:", res)
          }
        }

        if (newItems.length > 0) {
          const updated = [...newItems, ...generatedQRs]
          setGeneratedQRs(updated)
          try {
            localStorage.setItem("generatedQRs", JSON.stringify(updated))
          } catch (error) {
            console.error("Failed to save to localStorage:", error)
            // Continue without localStorage - data is still in state
          }

          let message = `Successfully generated ${newItems.length} QR code${newItems.length !== 1 ? "s" : ""}`
          if (totalErrors > 0) {
            message += ` (${totalErrors} error${totalErrors !== 1 ? "s" : ""} occurred)`
          }
          if (totalGenerated > newItems.length) {
            message += `\nNote: ${totalGenerated - newItems.length} QR code${totalGenerated - newItems.length !== 1 ? "s" : ""} were generated but could not be retrieved.`
          }
          alert(message)
        } else {
          // Check if there were errors in the response
          const hasErrors = data.some((res: any) => res.errors && res.errors.length > 0)
          if (hasErrors) {
            const allErrors = data.flatMap((res: any) => res.errors || [])
            alert(
              `QR generation completed with errors:\n${allErrors.slice(0, 5).join("\n")}${allErrors.length > 5 ? `\n... and ${allErrors.length - 5} more` : ""}\n\nCheck the browser console for full details.`,
            )
          } else if (totalGenerated > 0) {
            alert(
              `QR codes were generated (${totalGenerated} total) but could not be retrieved. This might be a database issue. Check the console for details.`,
            )
          } else {
            alert(
              "No QR codes were generated. Please ensure:\n1. The campaign has products linked\n2. Products have SKUs\n3. Check the console for errors",
            )
          }
          console.warn("No QR codes in response:", {
            data,
            totalGenerated,
            totalErrors,
            resultsCount: data.length,
            resultsWithQRCodes: data.filter((r: any) => r.qrCodes?.length > 0).length,
          })
        }
      } else if (data.error) {
        alert(`Error: ${data.error}`)
        console.error("QR generation error:", data.error)
      } else {
        alert("Unexpected response format. Please check the console.")
        console.error("Unexpected response format:", data)
      }
    } catch (error) {
      console.error("Error generating QR code:", error)
      alert(`Error generating QR codes: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadQR = async (qrCodeId: string, campaignName: string) => {
    try {
      // Fetch QR code image from API
      const response = await fetch(`/api/qr/${qrCodeId}`)
      if (!response.ok) throw new Error("Failed to fetch QR code")
      const data = await response.json()

      const link = document.createElement("a")
      link.href = data.code
      link.download = `qr-${campaignName}-${Date.now()}.png`
      link.click()
    } catch (error) {
      console.error("Error downloading QR code:", error)
      alert("Failed to download QR code")
    }
  }

  const handleDeleteQR = (index: number) => {
    const item = generatedQRs[index]
    const updated = generatedQRs.filter((_, i) => i !== index)
    setGeneratedQRs(updated)
    // Remove image from cache
    if (item?.qrCodeId) {
      const newImages = new Map(qrCodeImages)
      newImages.delete(item.qrCodeId)
      setQrCodeImages(newImages)
    }
    try {
      localStorage.setItem("generatedQRs", JSON.stringify(updated))
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
    }
  }

  // Fetch QR code image on demand
  const fetchQRCodeImage = async (qrCodeId: string) => {
    // Check if already cached
    if (qrCodeImages.has(qrCodeId)) {
      return qrCodeImages.get(qrCodeId)
    }

    try {
      const response = await fetch(`/api/qr/${qrCodeId}`)
      if (!response.ok) throw new Error("Failed to fetch QR code")
      const data = await response.json()

      // Cache the image
      const newImages = new Map(qrCodeImages)
      newImages.set(qrCodeId, data.code)
      setQrCodeImages(newImages)

      return data.code
    } catch (error) {
      console.error("Error fetching QR code image:", error)
      return null
    }
  }

  // Download all QR codes as ZIP
  const handleDownloadAllAsZip = async () => {
    if (generatedQRs.length === 0) {
      alert("No QR codes to download")
      return
    }

    try {
      const zip = new JSZip()
      let loadedCount = 0
      const total = generatedQRs.length

      // Fetch all QR codes
      for (const item of generatedQRs) {
        try {
          let imageData = qrCodeImages.get(item.qrCodeId)

          // If not cached, fetch it
          if (!imageData) {
            imageData = await fetchQRCodeImage(item.qrCodeId)
          }

          if (imageData) {
            // Convert data URL to binary
            let base64Data = imageData
            if (imageData.startsWith("data:")) {
              base64Data = imageData.split(",")[1]
            }

            try {
              const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

              // Create filename from URL or use index
              const urlParts = item.url.split("?")
              const params = new URLSearchParams(urlParts[1] || "")
              const token = params.get("t") || ""
              const sanitizedName = item.campaignName.replace(/[^a-z0-9]/gi, "_").substring(0, 30)
              const filename = `qr-${sanitizedName}-${token.substring(0, 8)}.png`

              zip.file(filename, binaryData)
              loadedCount++
            } catch (error) {
              console.error(`Failed to convert QR code ${item.qrCodeId} to binary:`, error)
            }
          }
        } catch (error) {
          console.error(`Failed to fetch QR code ${item.qrCodeId}:`, error)
        }
      }

      if (loadedCount === 0) {
        alert("Failed to load any QR codes")
        return
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" })

      // Download
      const link = document.createElement("a")
      link.href = URL.createObjectURL(zipBlob)
      link.download = `qr-codes-${selectedCampaign}-${Date.now()}.zip`
      link.click()

      // Clean up
      URL.revokeObjectURL(link.href)

      if (loadedCount < total) {
        alert(`Downloaded ${loadedCount} of ${total} QR codes. Some failed to load.`)
      }
    } catch (error) {
      console.error("Error creating ZIP:", error)
      alert("Failed to create ZIP file")
    }
  }

  const handleExportCSV = async () => {
    if (generatedQRs.length === 0) {
      alert("No QR codes to export")
      return
    }

    try {
      const headers = ["QR ID", "Campaign", "URL", "Generated At"]
      const rows = generatedQRs.map((item) => [
        item.qrCodeId,
        item.campaignName,
        item.url,
        new Date(item.generatedAt).toISOString(),
      ])

      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

      const blob = new Blob([csv], { type: "text/csv" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `qr-codes-${selectedCampaign}-${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      alert("Failed to export CSV")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">QR Code Generator</h1>
            <Link href="/admin">
              <Button className="border border-sidebar-accent bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/10">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Generation Panel */}
        <Card className="border border-border bg-card p-6 mb-8">
          <h2 className="mb-4 text-xl font-bold">Generate QR Code</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">Select Campaign</label>
              {loading ? (
                <p className="text-muted-foreground">Loading campaigns...</p>
              ) : !campaigns || !Array.isArray(campaigns) || campaigns.length === 0 ? (
                <p className="text-muted-foreground">No campaigns available. Create a campaign first.</p>
              ) : (
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                >
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Button
              onClick={handleGenerateQR}
              disabled={!selectedCampaign || generating}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate QR Code"}
            </Button>
          </div>
        </Card>

        {/* Generated QR Codes */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Generated QR Codes ({generatedQRs.length})</h2>
            {generatedQRs.length > 0 && (
              <div className="flex gap-2">
                <Button onClick={handleExportCSV} variant="outline" className="bg-transparent" size="sm">
                  Export as CSV
                </Button>
                <Button onClick={handleDownloadAllAsZip} variant="outline" className="bg-transparent" size="sm">
                  Download All as ZIP
                </Button>
              </div>
            )}
          </div>
          {generatedQRs.length === 0 ? (
            <Card className="border border-border bg-card p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6h6m0 0h6"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold">No QR codes generated yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Generate your first QR code above</p>
            </Card>
          ) : (
            <QRCodeList
              generatedQRs={generatedQRs}
              qrCodeImages={qrCodeImages}
              onFetchImage={fetchQRCodeImage}
              onDownload={handleDownloadQR}
              onDelete={handleDeleteQR}
            />
          )}
        </div>
      </div>
    </div>
  )
}
