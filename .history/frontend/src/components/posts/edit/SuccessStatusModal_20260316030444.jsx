"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2 } from "lucide-react"

const cn = (...classes) => classes.filter(Boolean).join(" ")

export default function SuccessStatusModal({
  open,
  title = "Αποθηκεύτηκε!",
  message = "Οι αλλαγές αποθηκεύτηκαν με επιτυχία.",
  primaryLabel = "Τέλεια",
  onClose,
}) {
  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] flex items-end justify-center p-3 sm:items-center sm:p-6"
      >
        <motion.button
          type="button"
          aria-label="close success modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-[8px]"
        />

        <motion.div
          initial={{ opacity: 0, y: 44, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.985 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[390px]"
        >
          <div className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(16,42,36,0.45),transparent_38%),linear-gradient(180deg,rgba(12,13,18,0.98),rgba(8,9,12,0.98))] px-5 pb-5 pt-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:px-6 sm:pb-6 sm:pt-7">
            <div className="pointer-events-none absolute left-1/2 top-5 h-36 w-36 -translate-x-1/2 rounded-full bg-emerald-400 blur-3xl opacity-20" />

            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-5 mt-1 flex h-[116px] w-[116px] items-center justify-center sm:h-[124px] sm:w-[124px]">
                <div className="absolute inset-0 rounded-full border border-emerald-400/20 bg-emerald-500/8" />
                <div className="absolute inset-[18px] rounded-full border border-emerald-400/25 bg-emerald-500/8" />
                <div className="absolute inset-[36px] rounded-full border border-emerald-300/30 bg-emerald-500/10 backdrop-blur-sm" />
                <div className="relative grid h-10 w-10 place-items-center rounded-full border border-emerald-300/40 bg-emerald-400/10 text-emerald-300 shadow-[0_8px_22px_rgba(0,0,0,0.28)] sm:h-11 sm:w-11">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              <div
                className={cn(
                  "mb-5 inline-flex h-8 items-center rounded-full border px-4 text-[12px] font-bold tracking-[0.18em]",
                  "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
                )}
              >
                SUCCESS
              </div>

              <h3 className="text-[19px] font-extrabold tracking-tight text-white sm:text-[22px]">
                {title}
              </h3>

              <p className="mt-3 max-w-[300px] text-[15px] leading-7 text-zinc-300 sm:max-w-[315px]">
                {message}
              </p>

              <button
                type="button"
                onClick={onClose}
                className="mt-7 h-12 w-full rounded-[18px] bg-white px-4 text-[15px] font-semibold text-black transition hover:bg-zinc-100 active:scale-[0.99]"
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}