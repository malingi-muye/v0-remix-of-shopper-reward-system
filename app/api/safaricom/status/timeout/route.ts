import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const supabase = createRouteHandlerClient({ cookies })

    // Log the status timeout data for debugging
    console.log("Safaricom Transaction Status Timeout:", data)

    // Update transaction status to failed due to status check timeout
    const { error } = await supabase
      .from("transactions")
      .update({
        status: "failed",
        response_data: { ...data, status_timeout: true },
        updated_at: new Date().toISOString(),
      })
      .eq("transaction_id", data.TransactionID)

    if (error) {
      console.error("Error updating transaction status timeout:", error)
      return NextResponse.json(
        { success: false, message: "Failed to update transaction status" },
        { status: 500 }
      )
    }

    // Acknowledge receipt of status timeout callback
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Status timeout handled" })
  } catch (error) {
    console.error("Error processing Safaricom status timeout callback:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}