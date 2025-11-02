"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Analytics {
  totalFeedback: number
  totalRewards: number
  sentRewards: number
  pendingRewards: number
  sentimentCount: { positive: number; neutral: number; negative: number }
  averageRating: number
}

export default function AnalyticsDashboard({ analytics }: { analytics: Analytics }) {
  const sentimentData = [
    { name: "Positive", value: analytics.sentimentCount.positive, fill: "#4ade80" },
    { name: "Neutral", value: analytics.sentimentCount.neutral, fill: "#facc15" },
    { name: "Negative", value: analytics.sentimentCount.negative, fill: "#ef4444" },
  ]

  const rewardData = [
    { name: "Sent", value: analytics.sentRewards, fill: "#4ade80" },
    { name: "Pending", value: analytics.pendingRewards, fill: "#facc15" },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-border bg-card p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Feedback</p>
            <p className="text-4xl font-bold text-primary">{analytics.totalFeedback}</p>
          </div>
        </Card>

        <Card className="border border-border bg-card p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Average Rating</p>
            <p className="text-4xl font-bold text-accent">{analytics.averageRating}</p>
            <p className="text-xs text-muted-foreground">out of 5</p>
          </div>
        </Card>

        <Card className="border border-border bg-card p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Rewards Sent</p>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{analytics.sentRewards}</p>
            <p className="text-xs text-muted-foreground">KES {analytics.totalRewards}</p>
          </div>
        </Card>

        <Card className="border border-border bg-card p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Pending Rewards</p>
            <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.pendingRewards}</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">Sentiment Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">Reward Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rewardData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4ade80" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
