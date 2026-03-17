"use client"
import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AlertCircle, X } from "lucide-react"

export default function ErrorMessage({ message, onClose }) {
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
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[10px]"
        onClick={onClose}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          className="
            relative w-full max-w-[420px]
            overflow-hidden rounded-2xl
            border border-white/10
            bg-[#0d0d0d]/96
            shadow-[0_12px_40px_rgba(0,0,0,0.45)]
            backdrop-blur-xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* subtle top line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            className="
              absolute right-3 top-3 z-10
              inline-flex h-9 w-9 items-center justify-center
              rounded-full border border-white/8
              bg-white/[0.03]
              text-white/45 transition
              hover:bg-white/[0.06] hover:text-white/80
            "
            aria-label="Close error message"
          >
            <X className="h-4.5 w-4.5" />
          </button>

          <div className="px-4 py-5 sm:px-5 sm:py-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className="
                  mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center
                  rounded-xl border border-red-400/10
                  bg-red-500/8
                "
              >
                <AlertCircle className="h-5 w-5 text-red-300/85" />
              </div>

              <div className="min-w-0 flex-1 pr-8">
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-white sm:text-base">
                  Κάτι πήγε στραβά
                </h3>

                <p className="mt-1.5 text-sm leading-6 text-white/68">
                  {message}
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={onClose}
                    className="
                      inline-flex min-h-[42px] items-center justify-center
                      rounded-xl border border-red-400/12
                      bg-red-500/10 px-4
                      text-sm font-medium text-red-100
                      transition hover:bg-red-500/14
                      sm:min-w-[120px]
                    "
                  >
                    Κλείσιμο
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}