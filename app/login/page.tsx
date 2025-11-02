"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase-client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !data.session) {
        setError(authError?.message || "Login failed")
        setLoading(false)
        return
      }

      const { data: manager, error: managerError } = await supabase
        .from("managers")
        .select("*")
        .eq("email", email)
        .single()

      if (managerError || !manager) {
        setError("Manager profile not found")
        setLoading(false)
        return
      }

      // Store session info in localStorage
      localStorage.setItem(
        "manager-session",
        JSON.stringify({
          user: { id: data.session.user.id, email: data.session.user.email },
          manager: { id: manager.id, email: manager.email, name: manager.name, role: manager.role },
        }),
      )

      router.push("/admin")
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("[v0] Login error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-md border border-border bg-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Manager Login</h1>
          <p className="text-muted-foreground">Sign in to access the admin dashboard</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800 dark:text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              placeholder="manager@store.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-sm text-blue-900 dark:text-blue-400">
            <strong>Demo Account:</strong> Use your Supabase credentials
          </p>
        </div>
      </Card>
    </div>
  )
}
