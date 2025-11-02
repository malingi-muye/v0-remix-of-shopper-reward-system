import { getDatabase } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const db = getDatabase()

    const totalFeedback = db.feedback.length
    const totalRewards = db.rewards
      .filter((r) => r.status === "verified" || r.status === "sent")
      .reduce((sum, r) => sum + r.amount, 0)
    const sentRewards = db.rewards.filter((r) => r.status === "sent").length
    const pendingRewards = db.rewards.filter((r) => r.status === "verified").length

    const sentimentCount = {
      positive: db.feedback.filter((f) => f.sentiment === "positive").length,
      neutral: db.feedback.filter((f) => f.sentiment === "neutral").length,
      negative: db.feedback.filter((f) => f.sentiment === "negative").length,
    }

    const averageRating =
      db.feedback.length > 0
        ? (
            db.feedback.reduce((sum, f) => sum + (f.rating || f.customAnswers?.tasteRating || 0), 0) /
            db.feedback.length
          ).toFixed(1)
        : 0

    return NextResponse.json({
      totalFeedback,
      totalRewards,
      sentRewards,
      pendingRewards,
      sentimentCount,
      averageRating,
    })
  } catch (error) {
    console.error("[v0] Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
