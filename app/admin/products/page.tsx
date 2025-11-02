"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase-client"

interface Product {
  id: string
  name: string
  product_skus: Array<{
    id: string
    weight: string
    price: number
    reward_amount: number
    reward_description: string
  }>
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [manager, setManager] = useState<any>(null)
  const [showProductForm, setShowProductForm] = useState(false)
  const [success, setSuccess] = useState("")

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    category: "",
    skus: [
      { name: "340g", price: 120, rewardAmount: 20 },
      { name: "500g", price: 180, rewardAmount: 30 },
    ],
  })

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

      const { data: managerData } = await supabase.from("managers").select("*").eq("email", session.user.email).single()

      if (managerData) {
        setManager(managerData)
        fetchProducts()
      }
    }

    checkAuth()
  }, [router])

  const fetchProducts = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("products").select(`
        id,
        name,
        product_skus (
          id,
          weight,
          price,
          reward_amount,
          reward_description
        )
      `)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("[v0] Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async () => {
    if (!productForm.name.trim()) {
      alert("Product name is required")
      return
    }
    if (!productForm.description.trim()) {
      alert("Product description is required")
      return
    }
    if (!productForm.category.trim()) {
      alert("Product category is required")
      return
    }

    try {
      const supabase = createClient()

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert([
          {
            name: productForm.name,
            description: productForm.description,
            category: productForm.category,
          },
        ])
        .select()
        .single()

      if (productError || !product) {
        console.error("[v0] Product insert error:", productError)
        throw productError || new Error("Failed to create product")
      }

      const skuData = productForm.skus.map((sku) => ({
        product_id: product.id,
        weight: sku.name,
        price: sku.price,
        reward_amount: sku.rewardAmount,
        reward_description: `${sku.rewardAmount} KES Data Bundle`,
      }))

      const { error: skuError } = await supabase.from("product_skus").insert(skuData)

      if (skuError) {
        console.error("[v0] SKU insert error:", skuError)
        throw skuError
      }

      setSuccess("Product and SKUs added successfully")
      setTimeout(() => setSuccess(""), 3000)

      // Refresh products
      fetchProducts()
      setProductForm({
        name: "",
        description: "",
        category: "",
        skus: [
          { name: "340g", price: 120, rewardAmount: 20 },
          { name: "500g", price: 180, rewardAmount: 30 },
        ],
      })
      setShowProductForm(false)
    } catch (error: any) {
      console.error("[v0] Add product error:", error)
      const errorMessage = error?.message || error?.details || JSON.stringify(error) || "Unknown error"
      console.error("[v0] Error details:", errorMessage)
      alert(`Failed to add product: ${errorMessage}`)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (error) throw error

      setSuccess("Product deleted successfully")
      setTimeout(() => setSuccess(""), 3000)
      fetchProducts()
    } catch (error) {
      console.error("[v0] Delete product error:", error)
      alert("Failed to delete product")
    }
  }

  if (!manager) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Products & SKUs</h1>
            <Button onClick={() => router.push("/admin")} variant="outline" className="bg-transparent">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {success && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
            <AlertDescription className="text-green-800 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Manage Products</h2>
            <Button
              onClick={() => setShowProductForm(!showProductForm)}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              {showProductForm ? "Cancel" : "Add Product"}
            </Button>
          </div>

          {showProductForm && (
            <Card className="border border-border bg-card p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product Name</label>
                  <Input
                    placeholder="e.g., Premium Githeri"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Input
                    placeholder="e.g., A delicious ready-to-eat meal"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Input
                    placeholder="e.g., Ready-to-Eat, Beverages, Snacks"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">SKUs (Each size gets its own QR codes)</label>
                  <div className="space-y-3">
                    {productForm.skus.map((sku, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Size (e.g., 340g)"
                          value={sku.name}
                          onChange={(e) => {
                            const newSkus = [...productForm.skus]
                            newSkus[idx].name = e.target.value
                            setProductForm({ ...productForm, skus: newSkus })
                          }}
                        />
                        <Input
                          placeholder="Price"
                          type="number"
                          value={sku.price}
                          onChange={(e) => {
                            const newSkus = [...productForm.skus]
                            newSkus[idx].price = Number(e.target.value)
                            setProductForm({ ...productForm, skus: newSkus })
                          }}
                        />
                        <Input
                          placeholder="Reward Amount"
                          type="number"
                          value={sku.rewardAmount}
                          onChange={(e) => {
                            const newSkus = [...productForm.skus]
                            newSkus[idx].rewardAmount = Number(e.target.value)
                            setProductForm({ ...productForm, skus: newSkus })
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleAddProduct}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Add Product with SKUs
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-4">
            {loading ? (
              <Card className="border border-border bg-card p-6 text-center text-muted-foreground">
                Loading products...
              </Card>
            ) : products.length === 0 ? (
              <Card className="border border-border bg-card p-6 text-center text-muted-foreground">
                No products yet. Add one to get started.
              </Card>
            ) : (
              products.map((product) => (
                <Card key={product.id} className="border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <div className="mt-3 space-y-2">
                        {product.product_skus.map((sku) => (
                          <div key={sku.id} className="text-sm text-muted-foreground ml-2">
                            • {sku.weight} - {sku.reward_amount} KES reward
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteProduct(product.id)}
                      size="sm"
                      variant="outline"
                      className="bg-transparent text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
