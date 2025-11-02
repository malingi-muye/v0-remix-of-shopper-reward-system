interface SafaricomCredentials {
  consumerKey: string
  consumerSecret: string
  initiatorName: string
  securityCredential: string
  shortCode: string
  passKey: string
}

export interface SafaricomPaymentRequest {
  phone_number: string
  amount: number
  reward_id: string
  customer_name: string
}

export interface SafaricomPaymentResponse {
  success: boolean
  transaction_id?: string
  originator_conversation_id?: string
  message: string
  status: "initiated" | "completed" | "failed"
  error_code?: string
  error_description?: string
}

export type B2CCommandID = "BusinessPayment" | "SalaryPayment" | "PromotionPayment"

export interface SafaricomPaymentError extends Error {
  code?: string
  responseCode?: string
  httpStatus?: number
}

export interface SafaricomB2CResponse {
  ConversationID: string
  OriginatorConversationID: string
  ResponseCode: string
  ResponseDescription: string
}

export class SafaricomAPI {
  private credentials: SafaricomCredentials
  private token: string | null = null
  private tokenExpiry: Date | null = null
  private baseUrl: string

  constructor(credentials: SafaricomCredentials, isProduction = false) {
    this.credentials = credentials
    this.baseUrl = isProduction
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke"
  }

  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token as string
    }

    const auth = Buffer.from(
      `${this.credentials.consumerKey}:${this.credentials.consumerSecret}`
    ).toString("base64")

    const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to get Safaricom access token")
    }

    const data = await response.json()
    this.token = data.access_token
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000)

  return this.token as string
  }

  public async initiateDataBundlePayment(
    request: SafaricomPaymentRequest,
    commandID: B2CCommandID = "BusinessPayment"
  ): Promise<SafaricomPaymentResponse> {
    try {
      // Validate phone number format
      const phoneValidation = this.validatePhoneNumber(request.phone_number)
      if (!phoneValidation.isValid) {
        return {
          success: false,
          message: phoneValidation.error || "Invalid phone number format for Kenya",
          status: "failed",
          error_code: "INVALID_PHONE",
        }
      }

      // Validate amount (minimum 1 KES, maximum based on Safaricom limits)
      if (request.amount < 1 || request.amount > 70000) {
        return {
          success: false,
          message: `Invalid amount. Must be between 1 and 70,000 KES. Received: ${request.amount} KES`,
          status: "failed",
          error_code: "INVALID_AMOUNT",
        }
      }

      // Validate CommandID
      const validCommandIDs: B2CCommandID[] = ["BusinessPayment", "SalaryPayment", "PromotionPayment"]
      if (!validCommandIDs.includes(commandID)) {
        return {
          success: false,
          message: `Invalid CommandID. Must be one of: ${validCommandIDs.join(", ")}`,
          status: "failed",
          error_code: "INVALID_COMMAND_ID",
        }
      }

      // Validate required fields
      if (!request.reward_id || !request.customer_name) {
        return {
          success: false,
          message: "Missing required fields: reward_id and customer_name are required",
          status: "failed",
          error_code: "MISSING_FIELDS",
        }
      }

      const token = await this.getToken()
      const formattedPhone = this.formatPhoneNumber(request.phone_number)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL

      if (!baseUrl) {
        console.error("[v0] NEXT_PUBLIC_API_URL or NEXT_PUBLIC_APP_URL not set")
        return {
          success: false,
          message: "API URL not configured. Please set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_APP_URL",
          status: "failed",
          error_code: "MISSING_CONFIG",
        }
      }

      const requestBody = {
        InitiatorName: this.credentials.initiatorName,
        SecurityCredential: this.credentials.securityCredential,
        CommandID: commandID,
        Amount: request.amount,
        PartyA: this.credentials.shortCode,
        PartyB: formattedPhone,
        Remarks: `Data bundle reward for ${request.customer_name}`.substring(0, 100), // Max 100 chars
        QueueTimeOutURL: `${baseUrl}/api/safaricom/timeout`,
        ResultURL: `${baseUrl}/api/safaricom/result`,
        Occasion: request.reward_id.substring(0, 100), // Max 100 chars
      }

      console.log(`[v0] Initiating B2C payment: ${formattedPhone}, Amount: ${request.amount} KES`)

      const response = await fetch(`${this.baseUrl}/mpesa/b2c/v1/paymentrequest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const responseText = await response.text()
      let data: SafaricomB2CResponse

      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[v0] Failed to parse Safaricom response:", responseText)
        return {
          success: false,
          message: `Invalid response from Safaricom API: ${response.status} ${response.statusText}`,
          status: "failed",
          error_code: "PARSE_ERROR",
          httpStatus: response.status,
        }
      }

      if (!response.ok) {
        console.error("[v0] Safaricom API error:", data)
        return {
          success: false,
          message: data.ResponseDescription || `API request failed with status ${response.status}`,
          status: "failed",
          error_code: data.ResponseCode,
          error_description: data.ResponseDescription,
          httpStatus: response.status,
        }
      }

      const isSuccess = data.ResponseCode === "0"

      console.log(
        `[v0] B2C payment ${isSuccess ? "initiated" : "failed"}:`,
        data.ConversationID,
        data.ResponseDescription
      )

      return {
        success: isSuccess,
        transaction_id: data.ConversationID,
        originator_conversation_id: data.OriginatorConversationID,
        message: data.ResponseDescription,
        status: isSuccess ? "initiated" : "failed",
        error_code: isSuccess ? undefined : data.ResponseCode,
        error_description: isSuccess ? undefined : data.ResponseDescription,
      }
    } catch (error) {
      console.error("[v0] Safaricom payment error:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      return {
        success: false,
        message: `An error occurred while processing the payment: ${errorMessage}`,
        status: "failed",
        error_code: "EXCEPTION",
        error_description: errorMessage,
      }
    }
  }

  private validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
    // Remove spaces
    const cleaned = phone.replace(/\s+/g, "")
    
    // Check format: +254, 0, or 254 prefix followed by 7 or 1 and 8 digits
    const kenyaPattern = /^(\+254|0|254)?(7|1)\d{8}$/
    
    if (!kenyaPattern.test(cleaned)) {
      return {
        isValid: false,
        error: `Invalid phone number format. Expected Kenyan format: +2547XXXXXXXX or 07XXXXXXXX. Got: ${phone}`,
      }
    }

    // Verify it's a Safaricom number (starts with 07 or 01)
    const normalized = cleaned.replace(/^(\+254|254|0)/, "")
    if (!normalized.match(/^(7|1)\d{8}$/)) {
      return {
        isValid: false,
        error: "Phone number must be a Safaricom number (starting with 07 or 01)",
      }
    }

    return { isValid: true }
  }

  public async verifyPaymentStatus(transactionId: string): Promise<boolean> {
    try {
      const token = await this.getToken()

      const response = await fetch(`${this.baseUrl}/mpesa/transactionstatus/v1/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Initiator: this.credentials.initiatorName,
          SecurityCredential: this.credentials.securityCredential,
          CommandID: "TransactionStatusQuery",
          TransactionID: transactionId,
          PartyA: this.credentials.shortCode,
          IdentifierType: "4",
          ResultURL: `${process.env.NEXT_PUBLIC_API_URL}/api/safaricom/status/result`,
          QueueTimeOutURL: `${process.env.NEXT_PUBLIC_API_URL}/api/safaricom/status/timeout`,
          Remarks: "Transaction status query",
          Occasion: "",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to verify payment status")
      }

      const data = await response.json()
      return data.ResponseCode === "0"
    } catch (error) {
      console.error("[v0] Payment verification error:", error)
      return false
    }
  }

  private generateTimestamp(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hour = String(date.getHours()).padStart(2, "0")
    const minute = String(date.getMinutes()).padStart(2, "0")
    const second = String(date.getSeconds()).padStart(2, "0")
    return `${year}${month}${day}${hour}${minute}${second}`
  }

  private generatePassword(timestamp: string): string {
    const str = this.credentials.shortCode + this.credentials.passKey + timestamp
    return Buffer.from(str).toString("base64")
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any spaces or special characters
    const cleaned = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "")
    
    // If starts with +254, remove the +
    if (cleaned.startsWith("+254")) {
      return cleaned.slice(1)
    }
    
    // If starts with 254, return as is
    if (cleaned.startsWith("254")) {
      return cleaned
    }
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith("0")) {
      return "254" + cleaned.slice(1)
    }
    
    // If it's just 9 digits, assume it's missing the country code
    if (cleaned.length === 9 && cleaned.match(/^[17]\d{8}$/)) {
      return "254" + cleaned
    }
    
    return cleaned
  }
}

/**
 * Get Safaricom credentials from environment variables
 */
function getSafaricomCredentials(): SafaricomCredentials | null {
  const consumerKey = process.env.SAFARICOM_CONSUMER_KEY
  const consumerSecret = process.env.SAFARICOM_CONSUMER_SECRET
  const initiatorName = process.env.SAFARICOM_INITIATOR_NAME
  const securityCredential = process.env.SAFARICOM_SECURITY_CREDENTIAL
  const shortCode = process.env.SAFARICOM_SHORT_CODE
  const passKey = process.env.SAFARICOM_PASS_KEY

  if (!consumerKey || !consumerSecret || !initiatorName || !securityCredential || !shortCode || !passKey) {
    return null
  }

  return {
    consumerKey,
    consumerSecret,
    initiatorName,
    securityCredential,
    shortCode,
    passKey,
  }
}

/**
 * Create a SafaricomAPI instance with credentials from environment variables
 */
export function createSafaricomAPI(): SafaricomAPI {
  const credentials = getSafaricomCredentials()
  
  if (!credentials) {
    throw new Error(
      "Safaricom credentials not configured. Please set the following environment variables: " +
      "SAFARICOM_CONSUMER_KEY, SAFARICOM_CONSUMER_SECRET, SAFARICOM_INITIATOR_NAME, " +
      "SAFARICOM_SECURITY_CREDENTIAL, SAFARICOM_SHORT_CODE, SAFARICOM_PASS_KEY"
    )
  }

  const isProduction = process.env.SAFARICOM_ENVIRONMENT === "production"
  return new SafaricomAPI(credentials, isProduction)
}

/**
 * Check if Safaricom credentials are configured
 */
export function isSafaricomConfigured(): boolean {
  return getSafaricomCredentials() !== null
}

/**
 * Create a transaction record in the database
 * This should be called before initiating a payment
 */
export async function createPaymentTransaction(
  supabase: any,
  rewardId: string,
  phoneNumber: string,
  amount: number
): Promise<{ id: string; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("payment_transactions")
      .insert({
        reward_id: rewardId,
        phone_number: phoneNumber,
        amount: amount,
        status: "pending",
        attempts: 0,
      })
      .select("id")
      .single()

    if (error) {
      console.error("[v0] Failed to create payment transaction:", error)
      return { id: "", error }
    }

    return { id: data.id }
  } catch (error) {
    console.error("[v0] Exception creating payment transaction:", error)
    return { id: "", error }
  }
}

/**
 * Update a payment transaction record
 */
export async function updatePaymentTransaction(
  supabase: any,
  transactionId: string,
  updates: {
    status?: string
    transaction_id?: string
    originator_conversation_id?: string
    error_message?: string
    attempts?: number
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    const updateData: any = {
      ...updates,
      last_attempt_at: new Date().toISOString(),
    }

    // If incrementing attempts, we need to do it atomically
    if (updates.attempts !== undefined && updates.attempts > 0) {
      const { error: fetchError, data: current } = await supabase
        .from("payment_transactions")
        .select("attempts")
        .eq("id", transactionId)
        .single()

      if (!fetchError && current) {
        updateData.attempts = (current.attempts || 0) + 1
      }
    }

    const { error } = await supabase
      .from("payment_transactions")
      .update(updateData)
      .eq("id", transactionId)

    if (error) {
      console.error("[v0] Failed to update payment transaction:", error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Exception updating payment transaction:", error)
    return { success: false, error }
  }
}

/**
 * Find transaction by Safaricom transaction ID (ConversationID)
 */
export async function findTransactionBySafaricomId(
  supabase: any,
  safaricomTransactionId: string
): Promise<{ id: string | null; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("id")
      .eq("transaction_id", safaricomTransactionId)
      .single()

    if (error) {
      // Not found is not necessarily an error
      if (error.code === "PGRST116") {
        return { id: null }
      }
      return { id: null, error }
    }

    return { id: data?.id || null }
  } catch (error) {
    console.error("[v0] Exception finding transaction:", error)
    return { id: null, error }
  }
}

/**
 * Initiate a Safaricom B2C payment
 * This is a convenience function that creates a SafaricomAPI instance and initiates payment
 */
export async function initiateSafaricomPayment(
  request: SafaricomPaymentRequest
): Promise<SafaricomPaymentResponse> {
  const api = createSafaricomAPI()
  return api.initiateDataBundlePayment(request)
}
