"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Campaign } from "@/types/database"

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch("/api/campaigns")
        const data = await response.json()
        setCampaigns(data)
      } catch (error) {
        console.error("Error fetching campaigns:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  if (loading) return <div>Loading campaigns...</div>

  return (
    <Card className="border border-border bg-card p-6">
      <h2 className="mb-4 text-2xl font-bold">Active Campaigns</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold">Campaign</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Reward</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Target</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-b border-border hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">{campaign.description}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{campaign.reward_description}</td>
                <td className="px-4 py-3 text-sm">{campaign.target_responses}</td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-green-100 dark:bg-green-900/20 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                    Active
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" className="text-xs bg-transparent">
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
