"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Plus, Trash2 } from "lucide-react"
import type { FeedbackQuestion } from "@/types/database"

interface QuestionEditorProps {
  questions: FeedbackQuestion[]
  onSave: (questions: FeedbackQuestion[]) => void
  onCancel: () => void
}

export default function QuestionEditor({ questions: initialQuestions, onSave, onCancel }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>(initialQuestions)
  const [saving, setSaving] = useState(false)

  const handleUpdateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions]
    updated[index] = {
      ...updated[index],
      [field]: value,
    }
    setQuestions(updated)
  }

  const handleAddOption = (index: number) => {
    const updated = [...questions]
    if (!updated[index].options) {
      updated[index].options = []
    }
    updated[index].options?.push("")
    setQuestions(updated)
  }

  const handleUpdateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions]
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value
    }
    setQuestions(updated)
  }

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    if (updated[questionIndex].options) {
      updated[questionIndex].options = updated[questionIndex].options?.filter((_, i) => i !== optionIndex)
    }
    setQuestions(updated)
  }

  const handleAddQuestion = () => {
    const newQuestion: FeedbackQuestion = {
      id: `q-${Date.now()}`,
      type: "text",
      question: "",
      required: false,
    }
    setQuestions([...questions, newQuestion])
  }

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert("You must have at least one question")
      return
    }
    const updated = questions.filter((_, i) => i !== index)
    setQuestions(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(questions)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Feedback Questions</h3>
        <Button onClick={handleAddQuestion} variant="outline" size="sm" className="bg-transparent">
          <Plus className="h-4 w-4 mr-1" /> Add Question
        </Button>
      </div>

      {questions.map((question, index) => (
        <Card key={question.id} className="border border-border bg-card p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-semibold">Question Text</label>
                <input
                  type="text"
                  value={question.question}
                  onChange={(e) => handleUpdateQuestion(index, "question", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter question text"
                />
              </div>
              <Button
                onClick={() => handleDeleteQuestion(index)}
                variant="outline"
                size="sm"
                className="bg-transparent text-red-600 dark:text-red-400 mt-6"
                disabled={questions.length <= 1}
                title={questions.length <= 1 ? "You must have at least one question" : "Delete question"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">Type</label>
                <select
                  value={question.type}
                  onChange={(e) => handleUpdateQuestion(index, "type", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
                >
                  <option value="text">Text</option>
                  <option value="select">Select</option>
                  <option value="rating">Rating</option>
                  <option value="multiselect">Multi-select</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => handleUpdateQuestion(index, "required", e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm font-semibold">Required</span>
                </label>
              </div>
            </div>

            {(question.type === "select" || question.type === "multiselect") && (
              <div>
                <label className="mb-2 block text-sm font-semibold">Options</label>
                <div className="space-y-2">
                  {question.options?.map((option, optIndex) => (
                    <div key={optIndex} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleUpdateOption(index, optIndex, e.target.value)}
                        placeholder="Option text"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button onClick={() => handleRemoveOption(index, optIndex)} variant="outline" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button onClick={() => handleAddOption(index)} variant="outline" size="sm" className="w-full">
                    Add Option
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      <div className="flex gap-2 pt-4">
        <Button onClick={onCancel} variant="outline" className="flex-1 bg-transparent">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? "Saving..." : "Save Questions"}
        </Button>
      </div>
    </div>
  )
}
