import type { Database } from "@/types/database"
import { loadFromStorage, saveToStorage } from "./storage"

export const PRODUCTS = [
  {
    id: "prod-1",
    name: "Hearty Githeri",
    skus: ["340g", "500g"],
    rewardStructure: [
      {
        sku: "340g",
        price: 120,
        rewardAmount: 20,
        rewardDescription: "20 KES Data Bundle (100MB)",
      },
      {
        sku: "500g",
        price: 150,
        rewardAmount: 30,
        rewardDescription: "30 KES Data Bundle (150MB)",
      },
    ],
  },
  {
    id: "prod-2",
    name: "Classic Githeri",
    skus: ["340g", "500g"],
    rewardStructure: [
      {
        sku: "340g",
        price: 120,
        rewardAmount: 20,
        rewardDescription: "20 KES Data Bundle (100MB)",
      },
      {
        sku: "500g",
        price: 150,
        rewardAmount: 30,
        rewardDescription: "30 KES Data Bundle (150MB)",
      },
    ],
  },
  {
    id: "prod-3",
    name: "Beans Feast",
    skus: ["340g", "500g"],
    rewardStructure: [
      {
        sku: "340g",
        price: 120,
        rewardAmount: 20,
        rewardDescription: "20 KES Data Bundle (100MB)",
      },
      {
        sku: "500g",
        price: 150,
        rewardAmount: 30,
        rewardDescription: "30 KES Data Bundle (150MB)",
      },
    ],
  },
  {
    id: "prod-4",
    name: "Ndengu Delish",
    skus: ["340g", "500g"],
    rewardStructure: [
      {
        sku: "340g",
        price: 120,
        rewardAmount: 20,
        rewardDescription: "20 KES Data Bundle (100MB)",
      },
      {
        sku: "500g",
        price: 150,
        rewardAmount: 30,
        rewardDescription: "30 KES Data Bundle (150MB)",
      },
    ],
  },
  {
    id: "prod-5",
    name: "Home Style Baked Beans",
    skus: ["340g", "500g"],
    rewardStructure: [
      {
        sku: "340g",
        price: 120,
        rewardAmount: 20,
        rewardDescription: "20 KES Data Bundle (100MB)",
      },
      {
        sku: "500g",
        price: 150,
        rewardAmount: 30,
        rewardDescription: "30 KES Data Bundle (150MB)",
      },
    ],
  },
]

export const DEFAULT_QUESTIONS = [
  {
    id: "q-1",
    type: "text" as const,
    question: "What is your name?",
    required: true,
  },
  {
    id: "q-2",
    type: "text" as const,
    question: "What is your phone number?",
    required: true,
  },
  {
    id: "q-3",
    type: "select" as const,
    question: "Which product did you buy?",
    required: true,
    options: PRODUCTS.map((p) => p.name),
  },
  {
    id: "q-4",
    type: "rating" as const,
    question: "How would you rate the taste and texture of the product?",
    required: true,
  },
  {
    id: "q-5",
    type: "rating" as const,
    question: "How likely are you to buy this product again after today's experience?",
    required: true,
  },
  {
    id: "q-6",
    type: "multiselect" as const,
    question: "What did you like most about the product?",
    required: true,
    options: ["Taste", "Convenience", "Packaging", "Nutrition"],
  },
]

let db: Database = {
  campaigns: [],
  feedback: [],
  rewards: [],
  customers: [],
  managers: [],
  products: PRODUCTS,
}

let isInitialized = false

export function getDatabase() {
  if (!isInitialized) {
    const persisted = loadFromStorage()
    if (persisted.campaigns) {
      db.campaigns = persisted.campaigns
      db.feedback = persisted.feedback || []
      db.rewards = persisted.rewards || []
      db.customers = persisted.customers || []
      db.managers = persisted.managers || []
    }
    isInitialized = true
  }
  return db
}

export function persistDatabase() {
  saveToStorage({
    campaigns: db.campaigns,
    feedback: db.feedback,
    rewards: db.rewards,
    customers: db.customers,
    managers: db.managers,
    products: db.products,
  })
}

export function initializeDatabase() {
  const persisted = loadFromStorage()

  // Only initialize if no persisted data exists
  if (!persisted.campaigns || persisted.campaigns.length === 0) {
    db.campaigns = [
      {
        id: "camp-1",
        name: "Holiday Special",
        description: "Holiday shopping reward program",
        rewards: [
          { id: "rew-1", name: "Data Bundle", amount: 20, description: "20 KES Data Bundle (100MB)" },
          { id: "rew-2", name: "Airtime", amount: 30, description: "30 KES Airtime" },
        ],
        start_date: new Date("2024-11-01"),
        end_date: new Date("2024-12-31"),
        target_responses: 500,
        created_at: new Date(),
        active: true,
        runCount: 1,
        responses: 0,
        questions: DEFAULT_QUESTIONS,
        products: PRODUCTS.map((p) => p.id),
      },
      {
        id: "camp-2",
        name: "Black Friday Boost",
        description: "Black Friday customer engagement",
        rewards: [
          { id: "rew-3", name: "Premium Data", amount: 50, description: "50 KES Premium Data Bundle" },
          { id: "rew-4", name: "Double Airtime", amount: 100, description: "100 KES Airtime" },
        ],
        start_date: new Date("2024-11-20"),
        end_date: new Date("2024-11-30"),
        target_responses: 300,
        created_at: new Date(),
        active: true,
        runCount: 1,
        responses: 0,
        questions: DEFAULT_QUESTIONS,
        products: PRODUCTS.map((p) => p.id),
      },
    ]

    db.managers = [
      {
        id: "mgr-1",
        email: "manager@store.com",
        name: "Store Manager",
        role: "admin",
      },
    ]
    persistDatabase()
  } else {
    db = {
      campaigns: persisted.campaigns || [],
      feedback: persisted.feedback || [],
      rewards: persisted.rewards || [],
      customers: persisted.customers || [],
      managers: persisted.managers || [],
      products: PRODUCTS,
    }
  }

  isInitialized = true
}
