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
        className="absolute inset-0 bg-black/60 backdrop-blur-[8px]"
        onClick={onClose}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          className="
            relative w-full max-w-[500px]
            overflow-hidden rounded-[26px]
            border border-red-400/10
            bg-[#0b0b0b]/97
            shadow-[0_18px_55px_rgba(0,0,0,0.42)]
            backdrop-blur-xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-300/10 to-transparent" />

          {/* close */}
          <button
            type="button"
            onClick={onClose}
            className="
              absolute right-4 top-4 z-10
              inline-flex h-10 w-10 items-center justify-center
              text-white/60 transition
              hover:text-white/90
            "
            aria-label="Close error message"
          >
            <X className="h-7 w-7" />
          </button>

          <div className="px-5 py-6 sm:px-6 sm:py-6">
            <div className="flex items-start gap-4">
              <div
                className="
                  mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-2xl border border-red-400/12
                  bg-red-500/6
                "
              >
                <AlertCircle className="h-5 w-5 text-red-300/90" />
              </div>

              <div className="min-w-0 flex-1 pr-10">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-white sm:text-[18px]">
                  Κάτι πήγε στραβά
                </h3>

                <p className="mt-2.5 text-[14px] leading-7 text-white/92 sm:text-[15px]">
                  {message}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <button
                type="button"
                onClick={onClose}
                className="
                  flex min-h-[52px] w-full items-center justify-center
                  rounded-2xl border border-red-400/14
                  bg-red-500/12 px-5
                  text-sm font-semibold text-white
                  transition hover:bg-red-500/16
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