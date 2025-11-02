"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useEffect } from "react"
import { initializeDatabase } from "@/lib/db"

export default function HomePage() {
  useEffect(() => {
    // Initialize database on first load
    initializeDatabase()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-20 text-center">
          <h1 className="mb-4 text-balance text-5xl font-bold text-foreground">Shopper Reward System</h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Collect real-time feedback and reward your customers instantly with persistent data storage and SMS rewards
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Customer Feedback Card */}
          <Card className="flex flex-col items-center gap-4 border border-border bg-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 11l3 3L22 4m-10 10a7 7 0 1114 0 7 7 0 01-14 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Feedback</h2>
            <p className="text-sm text-muted-foreground">Collect customer feedback with QR codes</p>
            <Link href="/feedback" className="mt-auto w-full">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Open Form</Button>
            </Link>
          </Card>

          {/* Admin Dashboard Card */}
          <Card className="flex flex-col items-center gap-4 border border-border bg-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-accent/10">
              <svg className="h-8 w-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Analytics & campaigns</p>
            <Link href="/admin" className="mt-auto w-full">
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Open Dashboard</Button>
            </Link>
          </Card>

          {/* Reward Management Card */}
          <Card className="flex flex-col items-center gap-4 border border-border bg-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Rewards</h2>
            <p className="text-sm text-muted-foreground">Send SMS rewards</p>
            <Link href="/admin/rewards" className="mt-auto w-full">
              <Button className="w-full border border-green-200 dark:border-green-900 bg-transparent text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10">
                Manage
              </Button>
            </Link>
          </Card>

          <Card className="flex flex-col items-center gap-4 border border-border bg-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <svg
                className="h-8 w-8 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Setup</h2>
            <p className="text-sm text-muted-foreground">Products & questions</p>
            <Link href="/admin/products" className="mt-auto w-full">
              <Button className="w-full border border-blue-200 dark:border-blue-900 bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10">
                Configure
              </Button>
            </Link>
          </Card>
        </div>

        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-8">Features</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Persistent Storage</h3>
                <p className="text-sm text-muted-foreground">All data saved in browser localStorage</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Manager Authentication</h3>
                <p className="text-sm text-muted-foreground">Secure login for admin access</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Safaricom Integration</h3>
                <p className="text-sm text-muted-foreground">Send SMS rewards to customers</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Dynamic Management</h3>
                <p className="text-sm text-muted-foreground">Add/edit products and questions</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Input Validation</h3>
                <p className="text-sm text-muted-foreground">All API endpoints validated</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Analytics Caching</h3>
                <p className="text-sm text-muted-foreground">30-second cache reduces polling</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
