import { getDatabase, DEFAULT_QUESTIONS } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const db = getDatabase()
  return NextResponse.json(db.campaigns[0]?.questions || DEFAULT_QUESTIONS)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    if (!body.question || typeof body.question !== "string") {
      return NextResponse.json({ error: "Question text is required" }, { status: 400 })
    }

    if (!["text", "select", "rating", "multiselect"].includes(body.type)) {
      return NextResponse.json({ error: "Invalid question type" }, { status: 400 })
    }

    const question = {
      id: `q-${Date.now()}`,
      type: body.type,
      question: body.question,
      required: body.required !== false,
      options: body.options || undefined,
    }

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    console.error("[v0] Question creation error:", error)
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get("id")

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Question deletion error:", error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}
