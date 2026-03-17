// FILE: src/components/posts/DeletePostModal.jsx
"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react"

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

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onClose?.()
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, loading, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="delete-post-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
          onClick={() => {
            if (!loading) onClose?.()
          }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-red-500/20 bg-neutral-950/95 shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
          >
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.16),transparent_38%)]" />
            <div className="absolute -top-20 -right-16 h-44 w-44 rounded-full bg-red-500/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-red-400/10 blur-3xl" />

            <div className="relative p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    Διαγραφή ανάρτησης
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Αυτή η ενέργεια δεν αναιρείται.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-zinc-300">
                  Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτή την ανάρτηση;
                </p>

                {postTitle ? (
                  <div className="mt-3 rounded-xl border border-red-500/15 bg-red-500/5 px-3 py-2">
                    <p className="line-clamp-2 text-sm font-medium text-red-200">
                      {postTitle}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ακύρωση
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-600/15 px-5 text-sm font-semibold text-red-100 transition hover:bg-red-600/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Διαγραφή...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Διαγραφή
                    </>
                  )}
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