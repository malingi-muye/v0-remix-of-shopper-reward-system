import type { Product, SKU } from "@/types/database"

export const DEFAULT_SKUS: Omit<SKU, "id" | "qrCodes">[] = [
  {
    weight: "340g",
    price: 120,
    rewardAmount: 20,
    rewardDescription: "20 KES Data Bundle (100MB)",
  },
  {
    weight: "500g",
    price: 150,
    rewardAmount: 30,
    rewardDescription: "30 KES Data Bundle (150MB)",
  },
]

export const DEFAULT_PRODUCTS: Omit<Product, "id" | "created_at" | "updated_at">[] = [
  {
    name: "Hearty Githeri",
    description: "A hearty blend of traditional Kenyan githeri, ready to eat",
    category: "Ready to Eat",
    active: true,
    skus: [],
  },
  {
    name: "Classic Githeri",
    description: "Traditional Kenyan githeri with a classic blend of ingredients",
    category: "Ready to Eat",
    active: true,
    skus: [],
  },
  {
    name: "Beans Feast",
    description: "Premium quality beans prepared in a rich sauce",
    category: "Ready to Eat",
    active: true,
    skus: [],
  },
  {
    name: "Ndengu Delish",
    description: "Delicious green grams (ndengu) in a flavorful preparation",
    category: "Ready to Eat",
    active: true,
    skus: [],
  },
  {
    name: "Home Style Baked Beans",
    description: "Baked beans prepared with a homestyle recipe",
    category: "Ready to Eat",
    active: true,
    skus: [],
  },
]

export function generateSKUId(productName: string, weight: string): string {
  return `${productName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${weight.toLowerCase()}`
}

export function calculateQRCodesPerProduct(totalQRCodes: number): number {
  const numProducts = DEFAULT_PRODUCTS.length
  const numSKUs = DEFAULT_SKUS.length
  return Math.floor(totalQRCodes / (numProducts * numSKUs))
}