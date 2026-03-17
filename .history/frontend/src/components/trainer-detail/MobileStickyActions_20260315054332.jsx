"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, ChevronUp } from "lucide-react"

export default function MobileStickyActions({
  onBookClick,
  showScrollButton = true,
  scrollThreshold = 320,
}) {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > scrollThreshold)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [scrollThreshold])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <>
      <AnimatePresence>
        {showScrollButton && showScrollTop ? (
          <motion.button
            type="button"
            onClick={scrollToTop}
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="sm:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] right-4 z-[210] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white shadow-[0_12px_30px_rgba(0,0,0,0.34)] backdrop-blur-xl"
            aria-label="Πάνω"
            title="Πάνω"
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-[205] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md rounded-[24px] border border-white/10 bg-black/70 p-2 shadow-[0_-10px_35px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
          <motion.button
            type="button"
            onClick={onBookClick}
            whileTap={{ scale: 0.985 }}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border border-zinc-600/50 bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100 shadow-lg transition hover:from-zinc-600 hover:to-zinc-700"
          >
            <Calendar className="h-4 w-4" />
            Κάνε κράτηση
          </motion.button>
        </div>
      </div>
    </>
  )
}