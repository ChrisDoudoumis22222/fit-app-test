"use client"
import React from "react"
import { AlertCircle, X } from "lucide-react"

export default function ErrorMessage({ message, onClose }) {
  if (!message) return null

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-red-500/15 bg-red-500/10 px-3 py-3 text-sm text-red-100">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>

      <button
        type="button"
        className="text-white/60 transition hover:text-white/90"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}