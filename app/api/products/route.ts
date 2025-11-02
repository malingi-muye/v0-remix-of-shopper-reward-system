import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { DEFAULT_PRODUCTS, DEFAULT_SKUS } from "@/lib/products"

export async function GET() {
  try {
    console.log("[v0] Initializing Supabase client...")
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      console.error("[v0] Failed to initialize Supabase client")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }
    
    console.log("[v0] Fetching products...")
    
    // Fetch all products with their SKUs
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        *,
        product_skus (
          *
        )
      `)
      .order('created_at', { ascending: true })

    if (productsError) {
      console.error("[v0] Error fetching products:", productsError)
      return NextResponse.json({ error: productsError.message }, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    // If no products exist or they don't have SKUs, initialize with defaults
    if (!products || products.length === 0 || !products.some(p => p.product_skus?.length > 0)) {
      try {
        // First, check if tables exist and are accessible
        const { error: tableCheckError } = await supabase
          .from("products")
          .select("id")
          .limit(1)
        
        if (tableCheckError) {
          console.error("[v0] Table check error:", tableCheckError)
          throw new Error("Database tables not properly initialized")
        }

        console.log("[v0] Initializing default products...")
        
        for (const product of DEFAULT_PRODUCTS) {
          // Insert product
          const { data: newProduct, error: productError } = await supabase
            .from("products")
            .insert({
              name: product.name,
              description: product.description,
              category: product.category,
              active: product.active
            })
            .select()
            .single()

          if (productError) {
            console.error("[v0] Error creating product:", productError)
            continue // Skip to next product if this one fails
          }

          // Insert SKUs for this product
          const skus = DEFAULT_SKUS.map((sku) => ({
            product_id: newProduct.id,
            weight: sku.weight,
            price: sku.price,
            reward_amount: sku.rewardAmount,
            reward_description: sku.rewardDescription,
          }))

          const { error: skusError } = await supabase
            .from("product_skus")
            .insert(skus)

          if (skusError) {
            console.error("[v0] Error creating SKUs for product:", skusError)
          }
        }

        console.log("[v0] Default products initialization completed")

        // Fetch all products again with their SKUs
        const { data: initializedProducts, error: fetchError } = await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            category,
            active,
            created_at,
            updated_at,
            product_skus (
              id,
              weight,
              price,
              reward_amount,
              reward_description
            )
          `)
          .order('created_at', { ascending: true })

        if (fetchError) {
          console.error("[v0] Error fetching initialized products:", fetchError)
          throw new Error(`Failed to fetch initialized products: ${fetchError.message}`)
        }

        if (!initializedProducts || initializedProducts.length === 0) {
          console.error("[v0] No products found after initialization")
          throw new Error("Failed to initialize products: No products found after initialization")
        }

        return NextResponse.json(initializedProducts, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } catch (initError) {
        console.error("[v0] Error initializing products:", initError)
        return NextResponse.json({ error: "Failed to initialize products" }, { status: 500 })
      }
    }

    // Transform products to ensure all required fields exist
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description || `${product.name} description`,
      category: product.category || 'Ready to Eat',
      active: product.active ?? true,
      created_at: product.created_at,
      updated_at: product.updated_at,
      product_skus: product.product_skus || []
    }))

    return NextResponse.json(transformedProducts)
  } catch (error) {
    console.error("[v0] Products GET error:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const product = await request.json()

    if (!product.name || !product.description || !product.category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create the product
    const { data: newProduct, error: productError } = await supabase
      .from("products")
      .insert({
        name: product.name,
        description: product.description,
        category: product.category,
      })
      .select()
      .single()

    if (productError || !newProduct) {
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }

    // Create SKUs if provided
    if (Array.isArray(product.skus) && product.skus.length > 0) {
      const skus = product.skus.map((sku: { weight: string; price: number; rewardAmount: number; rewardDescription: string }) => ({
        product_id: newProduct.id,
        weight: sku.weight,
        price: sku.price,
        reward_amount: sku.rewardAmount,
        reward_description: sku.rewardDescription,
      }))

      const { error: skusError } = await supabase.from("product_skus").insert(skus)

      if (skusError) {
        return NextResponse.json({ error: "Failed to create SKUs" }, { status: 500 })
      }
    }

    // Fetch the complete product with SKUs
    const { data: completeProduct, error: fetchError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        category,
        active,
        created_at,
        updated_at,
        product_skus (
          id,
          weight,
          price,
          reward_amount,
          reward_description
        )
      `)
      .eq("id", newProduct.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json(completeProduct, { status: 201 })
  } catch (error) {
    console.error("[v0] Product creation error:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}