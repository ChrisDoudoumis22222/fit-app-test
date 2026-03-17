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
        className="absolute inset-0 bg-black/70 backdrop-blur-[10px]"
        onClick={onClose}
      />

      {/* modal wrapper */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            relative w-full max-w-[420px]
            overflow-hidden rounded-[26px]
            border border-white/8
            bg-[#1b1d1f]
            shadow-[0_30px_80px_rgba(0,0,0,0.55)]
          "
        >
          {/* subtle background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-[220px] w-[220px] -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-[180px] bg-gradient-to-b from-red-500/8 via-white/[0.02] to-transparent" />
          </div>

          {/* close button - no container */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close error message"
            className="
              absolute right-4 top-4 z-20
              inline-flex h-8 w-8 items-center justify-center
              text-white/70 transition
              hover:text-white
            "
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative z-10 px-5 pb-5 pt-8 sm:px-7 sm:pb-6 sm:pt-9">
            {/* icon area */}
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-[112px] w-[112px] items-center justify-center sm:h-[124px] sm:w-[124px]">
                <div className="absolute h-[112px] w-[112px] rounded-full bg-red-400/10" />
                <div className="absolute h-[88px] w-[88px] rounded-full bg-red-400/16" />
                <div className="absolute h-[68px] w-[68px] rounded-full bg-red-400/24" />
                <div className="absolute flex h-[52px] w-[52px] items-center justify-center rounded-full bg-red-500 shadow-[0_10px_30px_rgba(239,68,68,0.35)]">
                  <AlertCircle className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
              </div>

              <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-white sm:text-[24px]">
                {title}
              </h3>

              <p className="mt-2 max-w-[300px] text-[13px] leading-5 text-white/60 sm:text-[14px]">
                {subtitle}
              </p>

              <p className="mt-4 max-w-[320px] text-[14px] leading-6 font-medium text-white/90 sm:text-[15px]">
                {message}
              </p>
            </div>

            {/* bottom info card */}
            <div className="mt-6 rounded-2xl border border-white/6 bg-white/5 px-4 py-3 text-left">
              <div className="text-[12px] font-medium text-white/45">
                Κατάσταση
              </div>
              <div className="mt-1 text-[13px] font-semibold text-white/88">
                Η ενέργεια δεν ολοκληρώθηκε
              </div>
            </div>

            {/* action */}
            <div className="mt-5 flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                className="
                  inline-flex min-h-[48px] items-center justify-center
                  rounded-2xl bg-black px-8
                  text-sm font-semibold text-white
                  shadow-[0_10px_30px_rgba(0,0,0,0.35)]
                  transition hover:bg-[#050505]
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