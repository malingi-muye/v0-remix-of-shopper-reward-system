"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import AnalyticsDashboard from "@/components/analytics-dashboard"
import CampaignList from "@/components/campaign-list"
import { createClient } from "@/lib/supabase-client"

interface Analytics {
  totalFeedback: number
  totalRewards: number
  sentRewards: number
  pendingRewards: number
  sentimentCount: { positive: number; neutral: number; negative: number }
  averageRating: number
}

export default function AdminPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [manager, setManager] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      // Fetch manager details
      const { data: managerData } = await supabase.from("managers").select("*").eq("email", session.user.email).single()

      if (managerData) {
        setUser(session.user)
        setManager(managerData)
      } else {
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!user) return

    const fetchAnalytics = async () => {
      try {
        const supabase = createClient()

        const { data: feedback } = await supabase.from("feedback").select("*")
        const { data: rewards } = await supabase.from("rewards").select("*")

        const analytics = {
          totalFeedback: feedback?.length || 0,
          totalRewards: rewards?.filter((r) => r.status === "pending").length || 0,
          sentRewards: rewards?.filter((r) => r.status === "sent").length || 0,
          pendingRewards: rewards?.filter((r) => r.status === "pending").length || 0,
          sentimentCount: {
            positive: feedback?.filter((f) => f.sentiment === "positive").length || 0,
            neutral: feedback?.filter((f) => f.sentiment === "neutral").length || 0,
            negative: feedback?.filter((f) => f.sentiment === "negative").length || 0,
          },
          averageRating:
            feedback && feedback.length > 0 ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0,
        }

        setAnalytics(analytics)
      } catch (error) {
        console.error("[v0] Analytics error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 60000)
    return () => clearInterval(interval)
  }, [user])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (!manager) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-sidebar-foreground/70 mt-1">Welcome, {manager.name}</p>
            </div>
            <div className="flex gap-3 items-center">
              <Link href="/admin/qr-codes">
                <Button className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  QR Generator
                </Button>
              </Link>
              <Link href="/admin/campaigns">
                <Button className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  Manage Campaigns
                </Button>
              </Link>
              <Link href="/admin/products">
                <Button className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  Products & Questions
                </Button>
              </Link>
              <Link href="/admin/rewards">
                <Button className="border border-sidebar-accent bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/10">
                  View Rewards
                </Button>
              </Link>
              <Link href="/admin/feedback">
                <Button className="border border-sidebar-accent bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/10">
                  View Feedback
                </Button>
              </Link>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-transparent text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-muted-foreground">Loading analytics...</div>
          </div>
        ) : analytics ? (
          <>
            <AnalyticsDashboard analytics={analytics} />
            <div className="mt-8">
              <CampaignList />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
