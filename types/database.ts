export interface Campaign {
  id: string
  name: string
  description: string
  rewards: Reward[] // Changed from single reward_amount to array
  start_date: Date
  end_date: Date
  target_responses: number
  created_at: Date
  questions?: FeedbackQuestion[]
  products?: string[] // Product IDs
  active: boolean
  runCount: number
  responses: number // Track actual responses
}

export interface Feedback {
  id: string
  campaign_id: string
  customer_id: string
  phone_number: string
  name: string
  product_id: string
  sku: string
  rating: number
  comment: string
  sentiment: "positive" | "neutral" | "negative"
  customAnswers: Record<string, any>
  timestamp: Date
  verified: boolean
}

export interface CampaignReward {
  id: string
  name: string
  amount: number
  description: string
}

export interface Reward {
  id: string
  feedback_id: string
  customer_id: string
  phone_number: string
  amount: number
  reward_name: string // Added reward name
  status: "pending" | "sent" | "failed" | "verified"
  sent_at?: Date
  verifiedAt?: Date
}

export interface Customer {
  id: string
  phone_number: string
  name: string
  total_feedback: number
  total_rewards: number
  total_rewards_sent: number
  feedback_ids: string[]
  reward_ids: string[]
}

export interface Manager {
  id: string
  email: string
  name: string
  role: "admin" | "manager"
}

export interface SafaricomPayment {
  id: string
  reward_id: string
  phone_number: string
  amount: number
  status: "pending" | "initiated" | "completed" | "failed"
  transaction_id?: string
  error_message?: string
  attempts: number
  created_at: Date
  last_attempt_at?: Date
}

export interface Database {
  campaigns: Campaign[]
  feedback: Feedback[]
  rewards: Reward[]
  customers: Customer[]
  managers: Manager[]
  products: Product[]
}

export interface FeedbackQuestion {
  id: string
  type: "text" | "select" | "rating" | "multiselect"
  question: string
  required: boolean
  options?: string[]
}

export interface SKU {
  id: string
  weight: "340g" | "500g"
  price: number
  rewardAmount: number
  rewardDescription: string
  qrCodes: QRCode[]
}

export interface QRCode {
  id: string
  code: string
  url: string
  isUsed: boolean
  usedAt?: Date
  usedBy?: string
  location?: {
    latitude: number
    longitude: number
    region: string
  }
}

export interface Product {
  id: string
  name: string
  description: string
  category: string
  skus: SKU[]
  active: boolean
  created_at: Date
  updated_at: Date
}
