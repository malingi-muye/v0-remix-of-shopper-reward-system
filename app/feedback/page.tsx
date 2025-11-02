"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { initializeDatabase } from "@/lib/db"
import FeedbackForm from "@/components/feedback-form"

function FeedbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaign")
  const qrAccess = searchParams.get("qr") === "true"

  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeDatabase()

    if (!campaignId || !qrAccess) {
      setError("This form is only accessible via QR code scan. Please scan a valid QR code.")
      setLoading(false)
      return
    }

    // Fetch campaign details
    const fetchCampaign = async () => {
      try {
        const response = await fetch("/api/campaigns")
        const campaigns = await response.json()
        const found = campaigns.find((c: any) => c.id === campaignId)

        if (!found) {
          setError("Campaign not found or is no longer active.")
        } else if (!found.active) {
          setError("This campaign is no longer active.")
        } else {
          setCampaign(found)
        }
      } catch (err) {
        setError("Failed to load campaign. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchCampaign()
  }, [campaignId, qrAccess])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent mx-auto" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <Card className="border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-8">
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h2 className="font-semibold text-red-900 dark:text-red-100">Access Denied</h2>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
                <Button onClick={() => router.push("/")} className="mt-4">
                  Go Back Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold">Customer Feedback</h1>
          <p className="text-muted-foreground">{campaign?.description}</p>
        </div>

        {campaign && (
          <Suspense fallback={<div>Loading form...</div>}>
            <FeedbackForm campaign={campaign} />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-background to-muted" />}>
      <FeedbackPageContent />
    </Suspense>
  )
}
