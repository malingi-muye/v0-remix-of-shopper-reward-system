"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Feedback {
  id: string
  campaign_id: string
  sku_id: string
  customer_phone: string
  customer_name: string | null
  rating: number
  comment: string | null
  sentiment: string
  custom_answers: any
  verified: boolean
  created_at: string
  location: any
  product_skus?: {
    weight: string
    price: number
    reward_amount: number
    reward_description: string
  }
}

export default function FeedbackPage() {
  const router = useRouter()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<string>("")
  const [campaigns, setCampaigns] = useState<any[]>([])

  useEffect(() => {
    fetchCampaigns()
    fetchFeedback()
  }, [selectedCampaign])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/campaigns")
      const data = await response.json()
      setCampaigns(data)
      if (data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data[0].id)
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error)
    }
  }

  const fetchFeedback = async () => {
    try {
      const url = selectedCampaign ? `/api/feedback?campaignId=${selectedCampaign}` : "/api/feedback"
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to fetch feedback")
      const data = await response.json()
      setFeedback(data)
    } catch (error) {
      console.error("Error fetching feedback:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
      case "neutral":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
      case "negative":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
      default:
        return "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400"
    }
  }

  const getRatingStars = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Feedback Submissions</h1>
            <Link href="/admin">
              <Button className="border border-sidebar-accent bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/10">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="border border-border bg-card p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">Filter by Campaign</h2>
              {campaigns.length > 0 ? (
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full md:w-auto rounded-md border border-input bg-background px-3 py-2 text-foreground"
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">No campaigns available</p>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {feedback.length} feedback submission{feedback.length !== 1 ? "s" : ""}
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-muted-foreground">Loading feedback...</div>
          </div>
        ) : feedback.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold">No feedback submissions yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Feedback will appear here once customers submit responses</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {feedback.map((item) => (
              <Card key={item.id} className="border border-border bg-card p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-bold mb-2">Customer Information</h3>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-semibold">Name:</span> {item.customer_name || "Not provided"}
                        </p>
                        <p>
                          <span className="font-semibold">Phone:</span> {item.customer_phone}
                        </p>
                        <p>
                          <span className="font-semibold">Submitted:</span> {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-bold mb-2">Rating & Feedback</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Rating:</span>
                          <span className="text-yellow-500">{getRatingStars(item.rating)}</span>
                          <span className="text-sm text-muted-foreground">({item.rating}/5)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Sentiment:</span>
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getSentimentColor(
                              item.sentiment
                            )}`}
                          >
                            {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                          </span>
                        </div>
                        {item.comment && (
                          <div>
                            <span className="font-semibold">Comment:</span>
                            <p className="mt-1 text-sm text-muted-foreground">{item.comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {item.product_skus && (
                      <div className="mb-4">
                        <h3 className="text-lg font-bold mb-2">Product Details</h3>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-semibold">SKU Weight:</span> {item.product_skus.weight}
                          </p>
                          <p>
                            <span className="font-semibold">Reward Amount:</span> KES {item.product_skus.reward_amount}
                          </p>
                          <p>
                            <span className="font-semibold">Reward Description:</span> {item.product_skus.reward_description}
                          </p>
                        </div>
                      </div>
                    )}

                    {item.location && (
                      <div className="mb-4">
                        <h3 className="text-lg font-bold mb-2">Location</h3>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-semibold">Region:</span> {item.location.region || "Nairobi"}
                          </p>
                          <p>
                            <span className="font-semibold">Coordinates:</span> {item.location.latitude?.toFixed(4)},{" "}
                            {item.location.longitude?.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-bold mb-2">Status</h3>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            item.verified
                              ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {item.verified ? "Verified" : "Pending Verification"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
