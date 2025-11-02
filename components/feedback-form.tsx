"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, CheckCircle, AlertCircle } from "lucide-react"
import type { Campaign } from "@/types/database"
import { PRODUCTS } from "@/lib/db"

interface FeedbackFormProps {
  campaign: Campaign
}

export default function FeedbackForm({ campaign }: FeedbackFormProps) {
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rewardInfo, setRewardInfo] = useState<any>(null)
  const [submittedReward, setSubmittedReward] = useState<{ amount: number; description: string } | null>(null)
  const [location, setLocation] = useState<{ latitude: number; longitude: number; region: string } | null>(null)

  // Extract token and sku_id from URL parameters
  const qrToken = searchParams.get("t")
  const skuId = searchParams.get("s")

  const [formData, setFormData] = useState<Record<string, any>>({
    name: "",
    phone_number: "",
    product_id: "",
    sku: "",
    rating: 0,
    tasteRating: 0,
    likelyRating: 0,
    liked: [] as string[],
    comment: "",
  })

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // For now, default to Nairobi region (can be enhanced with reverse geocoding)
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            region: "Nairobi",
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          // Fallback to Nairobi coordinates if location access is denied
          setLocation({
            latitude: -1.2921,
            longitude: 36.8219,
            region: "Nairobi",
          })
        }
      )
    } else {
      // Fallback if geolocation is not supported
      setLocation({
        latitude: -1.2921,
        longitude: 36.8219,
        region: "Nairobi",
      })
    }
  }, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (field === "sku" && formData.product_id) {
      const product = PRODUCTS.find((p) => p.id === formData.product_id)
      const reward = product?.rewardStructure.find((r) => r.sku === value)
      setRewardInfo(reward)
    }
  }

  const getSentiment = (rating: number) => {
    if (rating >= 4) return "positive"
    if (rating === 3) return "neutral"
    return "negative"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate required QR code parameters
    if (!qrToken || !skuId) {
      setError("Missing QR code parameters. Please scan a valid QR code.")
      setLoading(false)
      return
    }

    if (!location) {
      setError("Location is required. Please enable location services.")
      setLoading(false)
      return
    }

    try {
      const product = PRODUCTS.find((p) => p.id === formData.product_id)
      const productName = product?.name || ""

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          sku_id: skuId, // Use sku_id from URL parameter
          token: qrToken, // Use token from URL parameter
          customer_phone: formData.phone_number,
          customer_name: formData.name,
          rating: formData.tasteRating, // Use taste rating for reward qualification
          comment: formData.comment,
          location: location, // Include location data
          custom_answers: {
            product_id: formData.product_id,
            sku: formData.sku,
            likelyRating: formData.likelyRating,
            liked: formData.liked,
            productName,
            sentiment: getSentiment(formData.tasteRating),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to submit feedback")
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }

      // Store reward information from API response if available
      if (result.reward_amount && result.reward_description) {
        setSubmittedReward({
          amount: result.reward_amount,
          description: result.reward_description,
        })
      }

      setSuccess(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit feedback. Please try again."
      setError(errorMessage)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          <div>
            <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">Thank You!</h2>
            <p className="mt-2 text-green-700 dark:text-green-300">Your feedback has been received and verified.</p>
            {submittedReward && (
              <div className="mt-4 rounded-lg bg-white/50 dark:bg-black/30 p-4">
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Reward Approved: {submittedReward.description}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Amount: KES {submittedReward.amount}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Your reward will be sent to {formData.phone_number} within 24 hours.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border border-border bg-card p-8">
      {error && (
        <div className="mb-6 flex gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold">What is your name?</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">What is your phone number?</label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange("phone_number", e.target.value)}
                placeholder="+254 712 345 678"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.phone_number}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Next
            </Button>
          </>
        )}

        {/* Step 2: Product Selection */}
        {step === 2 && (
          <>
            <div>
              <label className="mb-2 block text-sm font-semibold">Which product did you buy?</label>
              <select
                value={formData.product_id}
                onChange={(e) => {
                  handleInputChange("product_id", e.target.value)
                  handleInputChange("sku", "")
                }}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a product</option>
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.product_id && (
              <div>
                <label className="mb-2 block text-sm font-semibold">Which size did you buy?</label>
                <select
                  value={formData.sku}
                  onChange={(e) => handleInputChange("sku", e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a size</option>
                  {PRODUCTS.find((p) => p.id === formData.product_id)?.skus.map((sku) => (
                    <option key={sku} value={sku}>
                      {sku} -{" "}
                      {
                        PRODUCTS.find((p) => p.id === formData.product_id)?.rewardStructure.find((r) => r.sku === sku)
                          ?.rewardDescription
                      }
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" onClick={() => setStep(1)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                disabled={!formData.product_id || !formData.sku}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Ratings */}
        {step === 3 && (
          <>
            <div>
              <label className="mb-4 block text-sm font-semibold">
                How would you rate the taste and texture of the product?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleInputChange("tasteRating", star)}
                    className="focus:outline-none"
                  >
                    <Star
                      size={40}
                      className={`transition-all ${
                        star <= formData.tasteRating ? "fill-accent text-accent" : "text-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-4 block text-sm font-semibold">
                How likely are you to buy this product again after today's experience?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleInputChange("likelyRating", star)}
                    className="focus:outline-none"
                  >
                    <Star
                      size={40}
                      className={`transition-all ${
                        star <= formData.likelyRating ? "fill-accent text-accent" : "text-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" onClick={() => setStep(2)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(4)}
                disabled={!formData.tasteRating || !formData.likelyRating}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Preferences & Submit */}
        {step === 4 && (
          <>
            <div>
              <label className="mb-3 block text-sm font-semibold">What did you like most about the product?</label>
              <div className="space-y-2">
                {["Taste", "Convenience", "Packaging", "Nutrition"].map((option) => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.liked.includes(option)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange("liked", [...formData.liked, option])
                        } else {
                          handleInputChange(
                            "liked",
                            formData.liked.filter((l) => l !== option),
                          )
                        }
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="mb-2 block text-sm font-semibold">
                Additional Comments (Optional)
              </label>
              <textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => handleInputChange("comment", e.target.value)}
                placeholder="Share any additional feedback..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" onClick={() => setStep(3)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button
                type="submit"
                disabled={formData.liked.length === 0 || loading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Card>
  )
}
