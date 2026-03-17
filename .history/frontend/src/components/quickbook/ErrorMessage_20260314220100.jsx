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
        className="absolute inset-0 bg-black/60 backdrop-blur-[10px]"
        onClick={onClose}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div
          className="
            relative w-full max-w-[460px]
            overflow-hidden rounded-[24px]
            border border-white/10
            bg-[#0b0b0b]/97
            shadow-[0_16px_50px_rgba(0,0,0,0.5)]
            backdrop-blur-xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* top close icon */}
          <button
            type="button"
            onClick={onClose}
            className="
              absolute right-3 top-3 z-10
              inline-flex h-12 w-12 items-center justify-center
              rounded-full border border-white/20
              bg-white/[0.03]
              text-white/80 transition
              hover:bg-white/[0.06] hover:text-white
            "
            aria-label="Close error message"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="px-4 py-5 sm:px-5 sm:py-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className="
                  mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-xl border border-white/10
                  bg-white/[0.02]
                "
              >
                <AlertCircle className="h-5 w-5 text-white/90" />
              </div>

              <div className="min-w-0 flex-1 pr-12">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-white sm:text-lg">
                  Κάτι πήγε στραβά
                </h3>

                <p className="mt-2 text-sm leading-6 text-white sm:text-[15px]">
                  {message}
                </p>
              </div>
            </div>

            {/* almost full bleed button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="
                  flex min-h-[52px] w-full items-center justify-center
                  rounded-2xl border border-white/20
                  bg-white/[0.04] px-5
                  text-sm font-semibold text-white
                  transition hover:bg-white/[0.08]
                "
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}