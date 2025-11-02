"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Product, SKU } from "@/types/database"
import { DEFAULT_PRODUCTS, DEFAULT_SKUS, generateSKUId } from "@/lib/products"

interface ProductManagerProps {
  onSuccess?: (product: Product) => void
}

export default function ProductManager({ onSuccess }: ProductManagerProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products")
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleAddProduct = async () => {
    setSaving(true)
    try {
      // Create a new product with default SKUs
      const newProduct = {
        ...DEFAULT_PRODUCTS[0],
        id: `prod-${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date(),
        skus: DEFAULT_SKUS.map((sku) => ({
          ...sku,
          id: generateSKUId(DEFAULT_PRODUCTS[0].name, sku.weight),
          qrCodes: [],
        })),
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      })

      if (response.ok) {
        const savedProduct = await response.json()
        setProducts([...products, savedProduct])
        onSuccess?.(savedProduct)
      }
    } catch (error) {
      console.error("Error adding product:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProduct = async (product: Product) => {
    setSaving(true)
    try {
      const response = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, updated_at: new Date() }),
      })

      if (response.ok) {
        const updatedProduct = await response.json()
        setProducts(products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))
      }
    } catch (error) {
      console.error("Error updating product:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      handleUpdateProduct({
        ...product,
        active: !product.active,
      })
    }
  }

  const handleGenerateQRCode = async (productId: string, skuId: string) => {
    try {
      const baseUrl = window.location.origin
      const response = await fetch(`/api/qr?skuId=${skuId}&productId=${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl })
      })

      if (response.ok) {
        // Refresh the products list to show new QR codes
        const productResponse = await fetch("/api/products")
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error generating QR code:", error)
    }
  }

  if (loading) {
    return (
      <Card className="border border-border bg-card p-6">
        <div className="flex justify-center py-8">Loading products...</div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Products</h2>
        <Button onClick={handleAddProduct} disabled={saving} className="bg-primary text-primary-foreground">
          {saving ? "Adding..." : "Add Product"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {products.map((product) => (
          <Card key={product.id} className="border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-bold">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
              <Button
                onClick={() => handleToggleActive(product.id)}
                variant={product.active ? "outline" : "default"}
                size="sm"
              >
                {product.active ? "Deactivate" : "Activate"}
              </Button>
            </div>

            <div className="space-y-3">
              {product.skus.map((sku) => (
                <div key={sku.id} className="rounded-lg bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">{sku.weight}</span>
                    <span className="text-sm">KES {sku.price}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Reward: KES {sku.rewardAmount} - {sku.rewardDescription}
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      QR Codes: {sku.qrCodes.length} generated, {sku.qrCodes.filter((qr) => qr.isUsed).length} used
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleGenerateQRCode(product.id, sku.id)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        Generate QR Code
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}