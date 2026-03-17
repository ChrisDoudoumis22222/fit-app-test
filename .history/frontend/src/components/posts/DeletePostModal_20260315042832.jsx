"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, Loader2, X } from "lucide-react"

export default function DeletePostModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  postTitle = "",
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onClose?.()
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, loading, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="delete-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh] sm:pt-[14vh] bg-black/78 backdrop-blur-[16px]"
          onClick={() => {
            if (!loading) onClose?.()
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.36))]" />

          <motion.div
            initial={{ opacity: 0, y: 42, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.96 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[380px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0b0d12]/95 shadow-[0_24px_90px_rgba(0,0,0,0.72)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_45%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_28%,transparent_72%,rgba(255,255,255,0.02))]" />
            <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-red-500/12 blur-3xl" />

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-6 pb-6 pt-7 sm:px-7 sm:pb-7">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5 flex h-[112px] w-[112px] items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-red-500/25 bg-red-500/5" />
                  <div className="absolute inset-[18px] rounded-full border border-red-400/30 bg-red-500/10" />
                  <div className="absolute inset-[38px] rounded-full border border-red-300/35 bg-red-500/15 shadow-[0_0_20px_rgba(239,68,68,0.18)]" />

                  <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-red-300/30 bg-red-500/10">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-red-300" />
                    ) : (
                      <Trash2 className="h-5 w-5 text-red-300" />
                    )}
                  </div>
                </div>

                <div className="mb-5 inline-flex items-center rounded-full border border-red-400/20 bg-red-500/10 px-4 py-1.5">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-red-200">
                    Delete
                  </span>
                </div>

                <h3 className="text-[22px] font-extrabold tracking-tight text-white sm:text-[24px]">
                  Διαγραφή ανάρτησης;
                </h3>

                <p className="mt-4 max-w-[290px] text-[15px] leading-7 text-zinc-300">
                  Αυτή η ανάρτηση θα αφαιρεθεί οριστικά και δεν θα μπορείς να την
                  επαναφέρεις.
                </p>

                {postTitle ? (
                  <div className="mt-4 w-full rounded-2xl border border-red-500/15 bg-white/[0.03] px-4 py-3">
                    <p className="line-clamp-2 text-sm font-medium text-zinc-200">
                      {postTitle}
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-[18px] bg-white text-[16px] font-semibold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Διαγραφή..." : "Διαγραφή"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="mt-3 inline-flex items-center justify-center text-sm font-medium text-zinc-400 transition hover:text-white disabled:opacity-40"
                >
                  Ακύρωση
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