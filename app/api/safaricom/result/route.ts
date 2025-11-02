import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { findTransactionBySafaricomId, updatePaymentTransaction } from "@/lib/safaricom"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const supabase = await createServerSupabaseClient()

    // Log the callback data for debugging
    console.log("[v0] Safaricom B2C Result callback:", JSON.stringify(data, null, 2))

    // Safaricom B2C callback structure
    // Result object contains: ResultCode, ResultDesc, ResultParameters, ReferenceData, OriginatorConversationID, ConversationID
    const result = data.Result || data
    
    if (!result) {
      console.error("[v0] Invalid callback data structure:", data)
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback data" }, { status: 400 })
    }

    const resultCode = result.ResultCode || result.ResponseCode || "0"
    const conversationID = result.ConversationID || result.OriginatorConversationID
    const originatorConversationID = result.OriginatorConversationID || conversationID
    
    if (!conversationID) {
      console.error("[v0] Missing ConversationID in callback:", data)
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Missing ConversationID" }, { status: 400 })
    }

    const isSuccess = resultCode === "0"
    const transactionStatus = isSuccess ? "completed" : "failed"
    
    // Extract result parameters if available (contains transaction details)
    let resultParameters = {}
    if (result.ResultParameters && result.ResultParameters.ResultParameter) {
      const params = Array.isArray(result.ResultParameters.ResultParameter)
        ? result.ResultParameters.ResultParameter
        : [result.ResultParameters.ResultParameter]
      
      params.forEach((param: any) => {
        const [key, value] = param.Value.split(" - ")
        resultParameters[key] = value
      })
    }

    // Find transaction by Safaricom transaction ID (ConversationID)
    const { id: transactionId, error: findError } = await findTransactionBySafaricomId(
      supabase,
      conversationID
    )

    if (findError || !transactionId) {
      console.error("[v0] Transaction not found for ConversationID:", conversationID, findError)
      // Still acknowledge receipt even if transaction not found
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Acknowledged but transaction not found" })
    }

    // Update payment_transactions table
    const { success: updateSuccess, error: updateError } = await updatePaymentTransaction(
      supabase,
      transactionId,
      {
        status: transactionStatus,
        transaction_id: conversationID,
        error_message: isSuccess ? undefined : result.ResultDesc || "Payment failed",
      }
    )

    if (!updateSuccess || updateError) {
      console.error("[v0] Failed to update payment transaction:", updateError)
    }

    // Find associated reward via transaction
    const { data: transaction, error: txError } = await supabase
      .from("payment_transactions")
      .select("reward_id")
      .eq("id", transactionId)
      .single()

    if (!txError && transaction?.reward_id) {
      // Update reward status based on payment result
      const rewardStatus = isSuccess ? "sent" : "failed"
      
      const updateData: any = {
        status: rewardStatus,
      }
      
      if (isSuccess) {
        updateData.sent_at = new Date().toISOString()
      }

      const { error: rewardError } = await supabase
        .from("rewards")
        .update(updateData)
        .eq("id", transaction.reward_id)

      if (rewardError) {
        console.error("[v0] Failed to update reward status:", rewardError)
      } else {
        console.log(`[v0] Updated reward ${transaction.reward_id} status to ${rewardStatus}`)
      }
    }

    // Acknowledge receipt of callback (required by Safaricom)
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" })
  } catch (error) {
    console.error("[v0] Error processing Safaricom result callback:", error)
    // Still acknowledge receipt to avoid retries from Safaricom
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Acknowledged with errors" })
  }
}
