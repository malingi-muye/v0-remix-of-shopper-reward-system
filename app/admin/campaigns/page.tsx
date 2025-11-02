"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Campaign } from "@/types/database"
import CampaignForm from "@/components/campaign-form"
import QuestionEditor from "@/components/question-editor"
import { Trash2, RotateCw, Eye } from "lucide-react"

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestionsId, setEditingQuestionsId] = useState<string | null>(null)
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showDetails, setShowDetails] = useState(false)

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

  const handleAddCampaign = (newCampaign: Campaign) => {
    setCampaigns([...campaigns, newCampaign])
    setShowForm(false)
  }

  const handleSaveQuestions = async (campaignId: string, questions: any[]) => {
    try {
      const response = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          questions,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        // Transform the updated campaign to include questions in the expected format
        const transformedCampaign = {
          ...updated,
          questions: updated.meta?.questions || questions,
        }
        setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? transformedCampaign : c)))
        setEditingQuestionsId(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save questions")
      }
    } catch (error) {
      console.error("Error saving questions:", error)
      alert("An error occurred while saving questions")
    }
  }

  const handleRunCampaignAgain = async (campaignId: string) => {
    if (!confirm("Reset the campaign response count? This will reset the response counter to 0 and increment the run count. This does not delete feedback or rewards.")) {
      return
    }

    try {
      const response = await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      })

      if (response.ok) {
        const updated = await response.json()
        setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? updated : c)))
      } else {
        const error = await response.json()
        alert(error.error || "Failed to reset campaign")
      }
    } catch (error) {
      console.error("Error running campaign again:", error)
      alert("An error occurred while resetting the campaign")
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/campaigns?id=${campaignId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId))
        // If the deleted campaign was selected, clear selection
        if (selectedCampaign?.id === campaignId) {
          setSelectedCampaign(null)
          setShowDetails(false)
        }
        if (editingQuestionsId === campaignId) {
          setEditingQuestionsId(null)
        }
        if (expandedCampaignId === campaignId) {
          setExpandedCampaignId(null)
        }
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete campaign")
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
      alert("An error occurred while deleting the campaign")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Campaign Management</h1>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            >
              {showForm ? "Cancel" : "New Campaign"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {showForm && (
          <Card className="border border-border bg-card p-6 mb-6">
            <CampaignForm onSuccess={handleAddCampaign} />
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div>Loading campaigns...</div>
          </div>
        ) : campaigns.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold">No campaigns yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Create your first campaign to get started</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id}>
                <Card
                  className="border border-border bg-card p-6 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedCampaignId(expandedCampaignId === campaign.id ? null : campaign.id)}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-1 text-lg font-bold">{campaign.name}</h3>
                      <p className="mb-3 text-sm text-muted-foreground">{campaign.description}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Rewards:</span>
                          <span className="font-semibold">
                            {campaign.rewards?.length || 0} reward{(!campaign.rewards?.length || campaign.rewards.length !== 1) ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Target:</span>
                          <span className="font-semibold">{campaign.target_responses} responses</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Responses:</span>
                          <span className="font-semibold">
                            {campaign.responses}/{campaign.target_responses}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Run Count:</span>
                          <span className="font-semibold">{campaign.runCount}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-4">
                        <p className="mb-1 text-xs text-muted-foreground">Campaign Duration</p>
                        <p className="text-sm font-medium">
                          {new Date(campaign.start_date).toLocaleDateString()} -{" "}
                          {new Date(campaign.end_date).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="mb-1 text-xs text-muted-foreground">Status</p>
                        <span className="inline-block rounded-full bg-green-100 dark:bg-green-900/20 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                          {campaign.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCampaign(campaign)
                            setShowDetails(true)
                          }}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Eye className="h-4 w-4 mr-1" /> Details
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedCampaignId(campaign.id)
                            setEditingQuestionsId(campaign.id)
                          }}
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                        >
                          Edit Questions
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRunCampaignAgain(campaign.id)
                          }}
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                        >
                          <RotateCw className="h-4 w-4 mr-1" /> Run Again
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCampaign(campaign.id)
                          }}
                          size="sm"
                          variant="outline"
                          className="bg-transparent text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {expandedCampaignId === campaign.id && editingQuestionsId === campaign.id && (
                  <Card className="border border-border bg-card p-6 mt-2">
                    <h3 className="mb-4 text-lg font-semibold">Edit Feedback Questions</h3>
                    <QuestionEditor
                      questions={campaign.questions || []}
                      onSave={(questions) => handleSaveQuestions(campaign.id, questions)}
                      onCancel={() => setEditingQuestionsId(null)}
                    />
                  </Card>
                )}

                {showDetails && selectedCampaign?.id === campaign.id && (
                  <Card className="border border-border bg-card p-6 mt-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Campaign Details</h3>
                      <Button
                        onClick={() => setShowDetails(false)}
                        variant="outline"
                        size="sm"
                        className="bg-transparent"
                      >
                        Close
                      </Button>
                    </div>
                    <div className="space-y-3 text-sm">
                      {campaign.rewards.map((reward, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded bg-muted/30">
                          <span>{reward.reward_name}</span>
                          <span className="font-semibold">
                            KES {reward.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
