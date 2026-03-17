"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X } from "lucide-react"

const cn = (...classes) => classes.filter(Boolean).join(" ")

export default function SuccessStatusModal({
  open,
  onClose,
  title = "Ο στόχος\nδιαγράφηκε",
  message = "Η ενέργεια ολοκληρώθηκε επιτυχώς.",
  primaryLabel = "Τέλεια",
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.()
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="success-status-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => onClose?.()}
          />

          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-[345px] overflow-hidden rounded-[32px] border shadow-[0_30px_80px_rgba(0,0,0,0.58)]",
              "border-emerald-400/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_34%),linear-gradient(180deg,rgba(10,14,18,0.98),rgba(7,9,14,0.98))]",
            )}
          >
            <div className="absolute inset-x-0 top-0 h-[5px] bg-emerald-400" />

            <div className="pointer-events-none absolute left-1/2 top-12 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 left-6 h-16 w-40 rounded-full bg-emerald-400/10 blur-2xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-[40%] bg-emerald-400/90" />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-5 pb-5 pt-8 sm:px-6 sm:pb-6">
              <div className="flex justify-center">
                <div className="relative grid h-28 w-28 place-items-center">
                  <div className="absolute inset-0 rounded-full border border-emerald-400/20 bg-emerald-500/10" />
                  <div className="absolute inset-[22px] rounded-full border border-emerald-400/25 bg-emerald-500/10" />
                  <div className="absolute inset-[42px] rounded-full border border-emerald-300/30 bg-emerald-500/10" />

                  <div className="relative grid h-11 w-11 place-items-center rounded-full border border-emerald-300/40 bg-emerald-400/12 text-emerald-300 shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                    <Check className="h-5 w-5 stroke-[3]" />
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center">
                <div className="inline-flex h-8 items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 text-[12px] font-bold tracking-[0.2em] text-emerald-300">
                  SUCCESS
                </div>

                <h3 className="mt-8 whitespace-pre-line text-center text-[26px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-[28px]">
                  {title}
                </h3>

                <p className="mx-auto mt-5 max-w-[290px] text-[15px] leading-7 text-zinc-300">
                  {message}
                </p>
              </div>

              <div className="mt-9">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 w-full rounded-[18px] bg-white px-4 text-[16px] font-semibold text-black transition hover:bg-zinc-100 active:scale-[0.99]"
                >
                  {primaryLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}