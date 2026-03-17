"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, X } from "lucide-react"

const cn = (...classes) => classes.filter(Boolean).join(" ")

export default function SuccessStatusModal({
  open,
  onClose,
  title = "Αποθηκεύτηκε!",
  message = "Οι αλλαγές αποθηκεύτηκαν με επιτυχία.",
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
          className="fixed inset-0 z-[140] flex items-end justify-center p-4 sm:items-center sm:p-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/78 backdrop-blur-md"
            onClick={() => onClose?.()}
          />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.985 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-[390px] overflow-hidden rounded-[30px] border shadow-2xl",
              "bg-zinc-900 border-zinc-700/80",
              "mb-0 sm:mb-0",
            )}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-emerald-500/90" />

            <div className="pointer-events-none absolute left-1/2 top-10 h-28 w-28 -translate-x-1/2 rounded-full bg-emerald-400 opacity-20 blur-2xl" />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-5 pb-5 pt-7 sm:px-6 sm:pb-6">
              <div className="flex justify-center">
                <div className="grid h-24 w-24 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 text-emerald-300">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <h3 className="mt-4 text-[28px] font-bold tracking-tight text-white">
                  {title}
                </h3>

                <p className="mx-auto mt-2 max-w-[300px] text-sm leading-6 text-zinc-300">
                  {message}
                </p>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 w-full rounded-2xl bg-white font-semibold text-black transition hover:bg-zinc-100"
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