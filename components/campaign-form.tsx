"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { Campaign, Product } from "@/types/database"
import { X } from "lucide-react"

interface CampaignFormProps {
  onSuccess: (campaign: Campaign) => void
}

export default function CampaignForm({ onSuccess }: CampaignFormProps) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [rewards, setRewards] = useState([
    { id: `rew-${Date.now()}`, name: "Data Bundle", amount: 20, description: "20 KES Data Bundle (100MB)" },
  ])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    target_responses: 100,
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  })

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products", {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        })
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`HTTP error! status: ${response.status}, body:`, errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Received non-JSON response from server")
        }
        const data = await response.json()
        if (Array.isArray(data)) {
          setProducts(data)
        } else {
          console.error("Products data is not an array:", data)
          setProducts([])
        }
      } catch (error) {
        console.error("Error fetching products:", error)
        setProducts([])
      }
    }
    fetchProducts()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("target") ? Number.parseInt(value) : value,
    }))
  }

  const handleAddReward = () => {
    setRewards([...rewards, { id: `rew-${Date.now()}`, name: "", amount: 0, description: "" }])
  }

  const handleRemoveReward = (index: number) => {
    setRewards(rewards.filter((_, i) => i !== index))
  }

  const handleRewardChange = (index: number, field: string, value: any) => {
    const updated = [...rewards]
    updated[index] = { ...updated[index], [field]: field === "amount" ? Number(value) : value }
    setRewards(updated)
  }

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          products: selectedProducts,
          rewards: rewards.filter((r) => r.name && r.amount > 0),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess(data)
        setFormData({
          name: "",
          description: "",
          target_responses: 100,
          start_date: new Date().toISOString().split("T")[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        })
        setSelectedProducts([])
        setRewards([
          { id: `rew-${Date.now()}`, name: "Data Bundle", amount: 20, description: "20 KES Data Bundle (100MB)" },
        ])
      } else {
        alert(data.error || "Failed to create campaign")
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      alert("An error occurred while creating the campaign")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">Campaign Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Holiday Special"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Target Responses</label>
          <input
            type="number"
            name="target_responses"
            value={formData.target_responses}
            onChange={handleChange}
            min="1"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your campaign..."
          rows={3}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Select Products</label>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading products...</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {products.map((product) => (
              <label key={product.id} className="flex items-center space-x-2 rounded-md border border-border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id)}
                  onChange={() => handleProductToggle(product.id)}
                  className="rounded border border-input"
                />
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-muted-foreground">{product.description}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="block text-sm font-semibold">Campaign Rewards</label>
          <Button type="button" onClick={handleAddReward} variant="outline" size="sm" className="bg-transparent">
            Add Reward
          </Button>
        </div>

        <div className="space-y-3">
          {rewards.map((reward, index) => (
            <div key={index} className="flex gap-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex-1 grid gap-2 md:grid-cols-3">
                <input
                  type="text"
                  value={reward.name}
                  onChange={(e) => handleRewardChange(index, "name", e.target.value)}
                  placeholder="Reward name"
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  value={reward.amount}
                  onChange={(e) => handleRewardChange(index, "amount", e.target.value)}
                  placeholder="Amount (KES)"
                  min="0"
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="text"
                  value={reward.description}
                  onChange={(e) => handleRewardChange(index, "description", e.target.value)}
                  placeholder="Description"
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button
                type="button"
                onClick={() => handleRemoveReward(index)}
                variant="outline"
                size="sm"
                className="bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">Start Date</label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">End Date</label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || selectedProducts.length === 0 || rewards.filter((r) => r.name && r.amount > 0).length === 0}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Campaign"}
      </Button>
    </form>
  )
}
