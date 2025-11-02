"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import type { Reward } from "@/types/database"
import RewardsList from "@/components/rewards-list"
import { getSession } from "@/lib/auth"

type RewardStatus = "all" | "verified" | "sent" | "pending" | "failed"

export default function RewardsPage() {
  const router = useRouter()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRewards, setSelectedRewards] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<RewardStatus>("pending")
  const [sendingRewards, setSendingRewards] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      if (!session) {
        router.push("/login")
        return
      }
      setUser(session)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!user) return
    fetchRewards()
  }, [user])

  const fetchRewards = async () => {
    try {
      const response = await fetch("/api/rewards")
      if (!response.ok) throw new Error("Failed to fetch rewards")
      const data = await response.json()
      setRewards(data)
    } catch (error) {
      console.error("[v0] Error fetching rewards:", error)
      setMessage({ type: "error", text: "Failed to load rewards" })
    } finally {
      setLoading(false)
    }
  }

  const filteredRewards = rewards.filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))

  const handleSelectReward = (rewardId: string) => {
    setSelectedRewards((prev) => (prev.includes(rewardId) ? prev.filter((id) => id !== rewardId) : [...prev, rewardId]))
  }

  const handleSelectAll = () => {
    if (selectedRewards.length === filteredRewards.length) {
      setSelectedRewards([])
    } else {
      setSelectedRewards(filteredRewards.map((r) => r.id))
    }
  }

  const handleSendRewards = async () => {
    if (selectedRewards.length === 0) return

    setSendingRewards(true)
    setMessage(null)

    try {
      const response = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardIds: selectedRewards }),
      })

      if (!response.ok) {
        throw new Error("Failed to send rewards")
      }

      const result = await response.json()

      // Refresh rewards list
      await fetchRewards()
      setSelectedRewards([])

      const successCount = result.results.filter((r: any) => r.status === "success").length
      const failedCount = result.results.filter((r: any) => r.status === "failed").length

      if (successCount > 0) {
        setMessage({
          type: "success",
          text: `Successfully sent ${successCount} reward${successCount !== 1 ? "s" : ""}${
            failedCount > 0 ? `. ${failedCount} failed.` : "."
          }`,
        })
      } else {
        setMessage({
          type: "error",
          text: `Failed to send ${failedCount} reward${failedCount !== 1 ? "s" : ""}. Please check phone numbers and try again.`,
        })
      }

      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      console.error("[v0] Error sending rewards:", error)
      setMessage({ type: "error", text: "An error occurred while sending rewards" })
    } finally {
      setSendingRewards(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Reward Management</h1>
            <Button onClick={() => router.push("/admin")} variant="outline" className="bg-transparent">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {message && (
          <Alert
            className={`mb-6 ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900"
            }`}
          >
            {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription
              className={
                message.type === "success" ? "text-green-800 dark:text-green-400" : "text-red-800 dark:text-red-400"
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border border-border bg-card p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Rewards</h2>
              <p className="text-sm text-muted-foreground">
                {filteredRewards.length} reward{filteredRewards.length !== 1 ? "s" : ""}{" "}
                {statusFilter === "pending" ? "ready to send" : statusFilter === "all" ? "total" : "to display"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["pending", "sent", "failed", "all"] as const).map((status) => (
                <Button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status)
                    setSelectedRewards([])
                  }}
                  className={statusFilter === status ? "" : "bg-transparent border-border"}
                  variant={statusFilter === status ? "default" : "outline"}
                >
                  {status === "pending"
                    ? "Ready to Send"
                    : status === "verified"
                      ? "Verified"
                      : status === "all"
                        ? "All"
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="border border-border bg-card p-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">
                Selected: {selectedRewards.length} reward{selectedRewards.length !== 1 ? "s" : ""}
              </p>
              {selectedRewards.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Total: KES{" "}
                  {selectedRewards.reduce((sum, id) => {
                    const reward = rewards.find((r) => r.id === id)
                    return sum + (reward?.amount || 0)
                  }, 0)}
                </p>
              )}
            </div>
            <Button
              onClick={handleSendRewards}
              disabled={
                selectedRewards.length === 0 ||
                (statusFilter !== "pending" && statusFilter !== "all") ||
                sendingRewards ||
                filteredRewards.filter((r) => selectedRewards.includes(r.id) && r.status !== "pending").length > 0
              }
              className="bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            >
              {sendingRewards
                ? "Sending..."
                : `Send ${selectedRewards.length > 0 ? `(${selectedRewards.length})` : ""} Rewards`}
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-muted-foreground">Loading rewards...</div>
          </div>
        ) : (
          <RewardsList
            rewards={filteredRewards}
            selectedRewards={selectedRewards}
            onSelectReward={handleSelectReward}
            onSelectAll={handleSelectAll}
            loading={sendingRewards}
          />
        )}
      </div>
    </div>
  )
}
