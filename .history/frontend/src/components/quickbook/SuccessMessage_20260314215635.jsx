"use client"
import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Check, X } from "lucide-react"

export default function SuccessMessage({ message, onClose }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.()
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = message ? "hidden" : ""

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [message, onClose])

  if (!message || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* blurred backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* popup */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          className="
            relative w-full max-w-md
            rounded-3xl border border-emerald-400/20
            bg-[#0b0b0b]/95
            shadow-[0_20px_80px_rgba(0,0,0,0.55)]
            backdrop-blur-2xl
            px-4 py-4
            sm:px-6 sm:py-5
          "
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="
              absolute right-3 top-3
              rounded-full p-2
              text-white/60 transition
              hover:bg-white/10 hover:text-white
            "
            aria-label="Close success message"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div
              className="
                mb-3 flex h-14 w-14 items-center justify-center
                rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/20
                sm:h-12 sm:w-12
              "
            >
              <Check className="h-7 w-7 text-emerald-400 sm:h-6 sm:w-6" />
            </div>

            <h3 className="text-base font-semibold text-white sm:text-lg">
              Επιτυχής ενέργεια
            </h3>

            <p className="mt-2 text-sm leading-6 text-emerald-100/90 sm:text-sm">
              {message}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="
                mt-5 w-full rounded-2xl
                bg-emerald-500 px-4 py-3
                text-sm font-medium text-white
                transition hover:bg-emerald-400
                sm:w-auto sm:min-w-[140px]
              "
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}