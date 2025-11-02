import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { findTransactionBySafaricomId, updatePaymentTransaction } from "@/lib/safaricom"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const supabase = await createServerSupabaseClient()

    // Log the timeout data for debugging
    console.log("[v0] Safaricom B2C Timeout callback:", JSON.stringify(data, null, 2))

    // Safaricom timeout callback structure
    const conversationID = data.ConversationID || data.OriginatorConversationID || data.requestId
    
    if (!conversationID) {
      console.error("[v0] Missing ConversationID in timeout callback:", data)
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Acknowledged but ConversationID missing" })
    }

    // Find transaction by Safaricom transaction ID
    const { id: transactionId, error: findError } = await findTransactionBySafaricomId(
      supabase,
      conversationID
    )

    if (findError || !transactionId) {
      console.error("[v0] Transaction not found for timeout ConversationID:", conversationID, findError)
      // Still acknowledge receipt
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Acknowledged but transaction not found" })
    }

    // Update payment_transactions table with timeout status
    const { success: updateSuccess, error: updateError } = await updatePaymentTransaction(
      supabase,
      transactionId,
      {
        status: "failed",
        error_message: "Payment request timed out - no response from Safaricom",
      }
    )

    if (!updateSuccess || updateError) {
      console.error("[v0] Failed to update payment transaction on timeout:", updateError)
    }

    // Find associated reward via transaction
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .select("reward_id")
      .eq("id", transactionId)
      .single()

    if (!txError && transaction?.reward_id) {
      // Update reward status to failed due to timeout
      const { error: rewardError } = await supabase
        .from("rewards")
        .update({
          status: "failed",
        })
        .eq("id", transaction.reward_id)

      if (rewardError) {
        console.error("[v0] Failed to update reward status on timeout:", rewardError)
      } else {
        console.log(`[v0] Updated reward ${transaction.reward_id} status to failed (timeout)`)
      }
    }

    // Acknowledge receipt of timeout callback (required by Safaricom)
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Timeout handled" })
  } catch (error) {
    console.error("[v0] Error processing Safaricom timeout callback:", error)
    // Still acknowledge receipt to avoid retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Acknowledged with errors" })
  }
}
