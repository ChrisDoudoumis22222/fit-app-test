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
      <div
        className="absolute inset-0 bg-black/78 backdrop-blur-[12px]"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            relative w-full max-w-[420px]
            overflow-hidden rounded-[26px]
            bg-[#0f1113]
            shadow-[0_24px_80px_rgba(0,0,0,0.62)]
          "
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[170px] w-[170px] -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-[130px] bg-gradient-to-b from-red-500/[0.06] to-transparent" />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close error message"
            className="
              absolute right-4 top-4 z-20
              inline-flex h-8 w-8 items-center justify-center
              text-white/60 transition
              hover:text-white
            "
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 px-5 pb-6 pt-8 sm:px-7 sm:pb-7 sm:pt-9">
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-[108px] w-[108px] items-center justify-center sm:h-[118px] sm:w-[118px]">
                <div className="absolute h-[108px] w-[108px] rounded-full bg-red-400/8" />
                <div className="absolute h-[82px] w-[82px] rounded-full bg-red-400/14" />
                <div className="absolute h-[60px] w-[60px] rounded-full bg-red-400/22" />
                <div className="absolute flex h-[50px] w-[50px] items-center justify-center rounded-full bg-red-500 shadow-[0_8px_24px_rgba(239,68,68,0.28)]">
                  <AlertCircle className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
              </div>

              <h3 className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-red-400 sm:text-[24px]">
                {title}
              </h3>

              <p className="mt-2 max-w-[300px] text-[13px] leading-5 text-red-200/90 sm:text-[14px]">
                {subtitle}
              </p>

              <p className="mt-5 max-w-[320px] text-[15px] leading-6 font-medium text-red-300 sm:text-[16px]">
                {message}
              </p>
            </div>

            <div className="mt-6 rounded-[20px] border border-red-500/15 bg-[#261417] px-4 py-4 text-left">
              <div className="text-[12px] font-medium text-red-200/65">
                Κατάσταση
              </div>
              <div className="mt-1 text-[14px] font-semibold text-red-300">
                Η ενέργεια δεν ολοκληρώθηκε
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="
                  inline-flex min-h-[50px] w-full
                  items-center justify-center
                  rounded-[18px] bg-white px-6
                  text-[15px] font-semibold text-black
                  shadow-[0_10px_30px_rgba(255,255,255,0.06)]
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