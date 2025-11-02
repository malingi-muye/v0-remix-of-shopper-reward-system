"use client"

import { Card } from "@/components/ui/card"
import type { Reward } from "@/types/database"

interface RewardsListProps {
  rewards: Reward[]
  selectedRewards: string[]
  onSelectReward: (rewardId: string) => void
  onSelectAll: () => void
  loading?: boolean
}

export default function RewardsList({
  rewards,
  selectedRewards,
  onSelectReward,
  onSelectAll,
  loading,
}: RewardsListProps) {
  if (rewards.length === 0) {
    return (
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
            d="M20 7l-8-4-8 4m0 0l8-4m0 0l8 4m0 6l-8 4-8-4m0 0l8-4m0 0l8 4"
          />
        </svg>
        <h3 className="mt-4 text-lg font-semibold">No rewards to display</h3>
        <p className="mt-2 text-sm text-muted-foreground">Check back soon or adjust your filters!</p>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
      case "sent":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
      case "failed":
        return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
      default:
        return "bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400"
    }
  }

  return (
    <Card className="border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRewards.length === rewards.length && rewards.length > 0}
                  onChange={onSelectAll}
                  disabled={loading}
                  className="h-4 w-4 rounded border-input"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Phone Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Reward Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Sent Date</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward) => (
              <tr key={reward.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRewards.includes(reward.id)}
                    onChange={() => onSelectReward(reward.id)}
                    disabled={loading || reward.status === "sent"}
                    className="h-4 w-4 rounded border-input"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-sm">{reward.phone_number}</td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded bg-accent/10 px-3 py-1 font-semibold text-accent">
                    KES {reward.amount}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{reward.reward_name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(reward.status)}`}
                  >
                    {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {reward.sent_at ? new Date(reward.sent_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border bg-muted/30 px-4 py-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Total Rewards</p>
            <p className="font-semibold">KES {rewards.reduce((sum, r) => sum + r.amount, 0)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Pending (Ready)</p>
            <p className="font-semibold">
              KES {rewards.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Already Sent</p>
            <p className="font-semibold">
              KES {rewards.filter((r) => r.status === "sent").reduce((sum, r) => sum + r.amount, 0)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
