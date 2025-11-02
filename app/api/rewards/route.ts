import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import {
  initiateSafaricomPayment,
  createPaymentTransaction,
  updatePaymentTransaction,
} from "@/lib/safaricom"

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    if (status && !["pending", "sent", "failed", "verified"].includes(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 })
    }

    let query = supabase.from("rewards").select("*").order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data: rewards, error } = await query

    if (error) {
      console.error("[v0] Rewards GET error:", error)
      return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 })
    }

    return NextResponse.json(rewards || [])
  } catch (error) {
    console.error("[v0] Rewards GET error:", error)
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { rewardIds } = await request.json()

    if (!Array.isArray(rewardIds) || rewardIds.length === 0) {
      return NextResponse.json({ error: "Reward IDs array is required and must not be empty" }, { status: 400 })
    }

    if (!rewardIds.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "All reward IDs must be strings" }, { status: 400 })
    }

    const paymentResults = []

    for (const rewardId of rewardIds) {
      // Fetch reward from database
      const { data: reward, error: fetchError } = await supabase
        .from("rewards")
        .select("*")
        .eq("id", rewardId)
        .single()

      if (fetchError || !reward) {
        console.warn(`[v0] Reward not found: ${rewardId}`, fetchError)
        paymentResults.push({
          rewardId,
          status: "failed",
          message: "Reward not found",
        })
        continue
      }

      // Check if reward already sent
      if (reward.status === "sent") {
        paymentResults.push({
          rewardId,
          status: "skipped",
          message: "Reward already sent",
        })
        continue
      }

      // Create transaction record before initiating payment
      const { id: transactionId, error: transactionError } = await createPaymentTransaction(
        supabase,
        reward.id,
        reward.customer_phone,
        reward.amount
      )

      if (transactionError || !transactionId) {
        console.error(`[v0] Failed to create transaction for reward ${rewardId}:`, transactionError)
        paymentResults.push({
          rewardId,
          status: "failed",
          message: "Failed to create transaction record",
        })
        continue
      }

      try {
        // Initiate Safaricom payment
        const paymentResponse = await initiateSafaricomPayment({
          phone_number: reward.customer_phone,
          amount: Number(reward.amount),
          reward_id: reward.id,
          customer_name: reward.customer_phone, // Using phone as customer name if name not available
        })

        // Update transaction record with Safaricom response
        await updatePaymentTransaction(supabase, transactionId, {
          status: paymentResponse.success ? "initiated" : "failed",
          transaction_id: paymentResponse.transaction_id,
          error_message: paymentResponse.success ? undefined : paymentResponse.message,
          attempts: 1,
        })

        if (paymentResponse.success) {
          // Update reward status to sent
          const { error: updateError } = await supabase
            .from("rewards")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", reward.id)

          if (updateError) {
            console.error(`[v0] Failed to update reward status for ${rewardId}:`, updateError)
          }

          paymentResults.push({
            rewardId,
            status: "success",
            transactionId: paymentResponse.transaction_id,
            originatorConversationId: paymentResponse.originator_conversation_id,
            message: paymentResponse.message,
          })
        } else {
          // Update reward status to failed
          const { error: updateError } = await supabase
            .from("rewards")
            .update({
              status: "failed",
            })
            .eq("id", reward.id)

          if (updateError) {
            console.error(`[v0] Failed to update reward status for ${rewardId}:`, updateError)
          }

          paymentResults.push({
            rewardId,
            status: "failed",
            message: paymentResponse.message,
            errorCode: paymentResponse.error_code,
          })
        }
      } catch (paymentError) {
        console.error(`[v0] Payment failed for reward ${rewardId}:`, paymentError)
        
        // Update transaction and reward as failed
        await updatePaymentTransaction(supabase, transactionId, {
          status: "failed",
          error_message: paymentError instanceof Error ? paymentError.message : String(paymentError),
          attempts: 1,
        })

        const { error: updateError } = await supabase
          .from("rewards")
          .update({
            status: "failed",
          })
          .eq("id", reward.id)

        if (updateError) {
          console.error(`[v0] Failed to update reward status for ${rewardId}:`, updateError)
        }

        paymentResults.push({
          rewardId,
          status: "failed",
          message: "Payment processing error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: rewardIds.length,
      results: paymentResults,
    })
  } catch (error) {
    console.error("[v0] Rewards POST error:", error)
    return NextResponse.json({ error: "Failed to process rewards" }, { status: 500 })
  }
}
