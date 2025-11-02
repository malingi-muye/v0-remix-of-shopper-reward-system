import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const supabase = createRouteHandlerClient({ cookies })

    // Log the status callback data for debugging
    console.log("Safaricom Transaction Status Result:", data)

    // Update transaction status based on the query result
    const { error } = await supabase
      .from("transactions")
      .update({
        status: data.Result.ResultCode === "0" ? "completed" : "failed",
        response_data: data,
        updated_at: new Date().toISOString(),
      })
      .eq("transaction_id", data.Result.TransactionID)

    if (error) {
      console.error("Error updating transaction status:", error)
      return NextResponse.json(
        { success: false, message: "Failed to update transaction status" },
        { status: 500 }
      )
    }

    // Acknowledge receipt of status callback
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Status update successful" })
  } catch (error) {
    console.error("Error processing Safaricom status callback:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
