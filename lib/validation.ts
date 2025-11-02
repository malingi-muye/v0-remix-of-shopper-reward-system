export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhoneNumber(phone: string): boolean {
  // Kenyan phone number validation
  return /^(\+254|0)(7|1)\d{8}$/.test(phone.replace(/\s/g, ""))
}

export function validateFeedback(data: any): { valid: boolean; error?: string } {
  if (!data.phone_number || typeof data.phone_number !== "string") {
    return { valid: false, error: "Phone number is required" }
  }

  if (!validatePhoneNumber(data.phone_number)) {
    return { valid: false, error: "Invalid phone number format" }
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    return { valid: false, error: "Name is required" }
  }

  if (data.name.length > 100) {
    return { valid: false, error: "Name is too long" }
  }

  if (!data.campaign_id || typeof data.campaign_id !== "string") {
    return { valid: false, error: "Campaign ID is required" }
  }

  if (!data.product_id || typeof data.product_id !== "string") {
    return { valid: false, error: "Product ID is required" }
  }

  if (!data.sku || typeof data.sku !== "string") {
    return { valid: false, error: "SKU is required" }
  }

  if (typeof data.rating !== "number" || data.rating < 1 || data.rating > 5) {
    return { valid: false, error: "Rating must be between 1 and 5" }
  }

  return { valid: true }
}

export function validateCampaign(data: any): { valid: boolean; error?: string } {
  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    return { valid: false, error: "Campaign name is required" }
  }

  if (data.name.length > 200) {
    return { valid: false, error: "Campaign name is too long" }
  }

  if (!data.description || typeof data.description !== "string") {
    return { valid: false, error: "Campaign description is required" }
  }

  if (!data.start_date || !data.end_date) {
    return { valid: false, error: "Start and end dates are required" }
  }

  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)

  if (startDate >= endDate) {
    return { valid: false, error: "End date must be after start date" }
  }

  if (typeof data.target_responses !== "number" || data.target_responses < 1) {
    return { valid: false, error: "Target responses must be at least 1" }
  }

  return { valid: true }
}
