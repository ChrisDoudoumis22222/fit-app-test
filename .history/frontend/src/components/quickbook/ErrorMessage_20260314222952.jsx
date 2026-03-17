"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AlertCircle, X } from "lucide-react"

export default function ErrorMessage({
  message,
  onClose,
  title = "Κάτι πήγε στραβά",
  subtitle = "Δεν ήταν δυνατή η ολοκλήρωση της ενέργειας.",
}) {
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
        className="absolute inset-0 bg-black/72 backdrop-blur-[10px]"
        onClick={onClose}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            relative w-full max-w-[420px]
            overflow-hidden rounded-[26px]
            bg-[#1a1c1f]
            shadow-[0_24px_70px_rgba(0,0,0,0.50)]
          "
        >
          {/* softer background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[180px] w-[180px] -translate-x-1/2 rounded-full bg-red-500/8 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-[140px] bg-gradient-to-b from-red-500/[0.04] to-transparent" />
          </div>

          {/* close button - no circle/container */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close error message"
            className="
              absolute right-4 top-4 z-20
              inline-flex h-8 w-8 items-center justify-center
              text-white/65 transition
              hover:text-white
            "
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 px-5 pb-6 pt-8 sm:px-7 sm:pb-7 sm:pt-9">
            <div className="flex flex-col items-center text-center">
              {/* icon */}
              <div className="relative flex h-[108px] w-[108px] items-center justify-center sm:h-[118px] sm:w-[118px]">
                <div className="absolute h-[108px] w-[108px] rounded-full bg-red-400/8" />
                <div className="absolute h-[82px] w-[82px] rounded-full bg-red-400/12" />
                <div className="absolute h-[60px] w-[60px] rounded-full bg-red-400/18" />
                <div className="absolute flex h-[50px] w-[50px] items-center justify-center rounded-full bg-red-500 shadow-[0_8px_24px_rgba(239,68,68,0.28)]">
                  <AlertCircle className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
              </div>

              {/* texts */}
              <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-white sm:text-[24px]">
                {title}
              </h3>

              <p className="mt-2 max-w-[300px] text-[13px] leading-5 text-white/62 sm:text-[14px]">
                {subtitle}
              </p>

              <p className="mt-5 max-w-[320px] text-[15px] leading-6 font-medium text-white sm:text-[16px]">
                {message}
              </p>
            </div>

            {/* status box */}
            <div className="mt-6 rounded-[20px] bg-[#3a3f45] px-4 py-4 text-left">
              <div className="text-[12px] font-medium text-white/60">
                Κατάσταση
              </div>
              <div className="mt-1 text-[14px] font-semibold text-white">
                Η ενέργεια δεν ολοκληρώθηκε
              </div>
            </div>

            {/* action */}
            <div className="mt-6 flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                className="
                  inline-flex min-h-[58px] min-w-[170px]
                  items-center justify-center
                  rounded-[18px] bg-white px-10
                  text-[15px] font-semibold text-black
                  shadow-[0_10px_30px_rgba(255,255,255,0.08)]
                  transition hover:bg-white/90
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