import type { Campaign } from './database'

// Types for the campaign API responses
export interface ProductSKU {
  id: string
  reward_amount: number
  reward_description: string
}

export interface Product {
  id: string
  name: string
  product_skus: ProductSKU[]
}

export interface CampaignProduct {
  product_id: string
  products: Product
}

export interface DatabaseCampaign {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  target_responses: number
  active: boolean
  meta: Record<string, any>
  campaign_products: CampaignProduct[]
  created_at?: string
  updated_at?: string
  responses?: number
  runCount?: number
}
