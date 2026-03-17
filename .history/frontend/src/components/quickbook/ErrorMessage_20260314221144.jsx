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
        className="absolute inset-0 bg-black/65 backdrop-blur-[10px]"
        onClick={onClose}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          className="
            relative w-full max-w-[520px]
            overflow-hidden rounded-[28px]
            border border-red-500/20
            bg-[#090909]/98
            shadow-[0_24px_80px_rgba(0,0,0,0.55)]
            backdrop-blur-xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* subtle top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/20 to-transparent" />

          {/* top close icon - no container */}
          <button
            type="button"
            onClick={onClose}
            className="
              absolute right-4 top-4 z-10
              inline-flex h-10 w-10 items-center justify-center
              text-white/75 transition
              hover:text-white
            "
            aria-label="Close error message"
          >
            <X className="h-8 w-8" />
          </button>

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex items-start gap-4 sm:gap-5">
              <div
                className="
                  mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center
                  rounded-2xl border border-red-400/20
                  bg-red-500/10
                "
              >
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>

              <div className="min-w-0 flex-1 pr-10">
                <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-white sm:text-[20px]">
                  Κάτι πήγε στραβά
                </h3>

                <p className="mt-3 text-[15px] leading-7 text-white sm:text-[16px]">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-7 sm:mt-8">
              <button
                type="button"
                onClick={onClose}
                className="
                  flex min-h-[54px] w-full items-center justify-center
                  rounded-2xl border border-red-400/30
                  bg-red-600 px-5
                  text-sm font-semibold text-white
                  shadow-[0_10px_30px_rgba(220,38,38,0.22)]
                  transition hover:bg-red-500
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