"use client"

import React, { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Calendar,
  ChevronUp,
  Heart,
  Loader2,
  Share2,
  Check,
} from "lucide-react"

export default function MobileStickyActions({
  onBookClick,
  onToggleLike,
  onShare,
  liked = false,
  likeBusy = false,
  showFavorite = true,
  showShare = true,
  showScrollButton = true,
  scrollThreshold = 320,
  shareTitle = "Peak Velocity",
  shareText = "Δες αυτό το προφίλ στο Peak Velocity",
  shareUrl,
}) {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareDone, setShareDone] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > scrollThreshold)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [scrollThreshold])

  useEffect(() => {
    if (!shareDone) return
    const timer = setTimeout(() => setShareDone(false), 1400)
    return () => clearTimeout(timer)
  }, [shareDone])

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const handleBook = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (typeof onBookClick === "function") onBookClick()
    },
    [onBookClick]
  )

  const handleLike = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (typeof onToggleLike === "function") onToggleLike()
    },
    [onToggleLike]
  )

  const handleShare = useCallback(
    async (e) => {
      e.preventDefault()
      e.stopPropagation()

      if (shareBusy) return

      try {
        setShareBusy(true)

        if (typeof onShare === "function") {
          await onShare()
          setShareDone(true)
          return
        }

        const finalUrl =
          shareUrl ||
          (typeof window !== "undefined" ? window.location.href : "")

        if (navigator.share) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: finalUrl,
          })
          setShareDone(true)
          return
        }

        if (navigator.clipboard?.writeText && finalUrl) {
          await navigator.clipboard.writeText(finalUrl)
          setShareDone(true)
        }
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("Share failed:", error)
        }
      } finally {
        setShareBusy(false)
      }
    },
    [onShare, shareBusy, shareText, shareTitle, shareUrl]
  )

  return (
    <>
      <AnimatePresence>
        {showScrollButton && showScrollTop ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="sm:hidden fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+7.2rem)] z-[9998]"
          >
            <button
              type="button"
              onClick={handleScrollTop}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-black shadow-[0_12px_30px_rgba(0,0,0,0.14)] touch-manipulation"
              aria-label="Πάνω"
              title="Πάνω"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-[9997] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 24,
            mass: 0.95,
          }}
          className="mx-auto flex w-full max-w-md items-center gap-2"
        >
          <button
            type="button"
            onClick={handleBook}
            className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition hover:bg-zinc-50 active:scale-[0.99] touch-manipulation"
          >
            <Calendar className="h-4 w-4" />
            Κάνε κράτηση
          </button>

          {showShare ? (
            <motion.button
              type="button"
              onClick={handleShare}
              whileTap={{ scale: 0.92 }}
              disabled={shareBusy}
              className={[
                "grid h-14 w-14 shrink-0 place-items-center rounded-full",
                "border border-white/10 bg-black/60 text-white backdrop-blur-md",
                "shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 touch-manipulation",
                "hover:bg-black/80",
                shareBusy ? "opacity-80" : "",
                shareDone ? "bg-emerald-500/90 text-white hover:bg-emerald-500/90" : "",
              ].join(" ")}
              aria-label="Κοινοποίηση"
              title="Κοινοποίηση"
            >
              {shareBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : shareDone ? (
                <Check className="h-5 w-5" />
              ) : (
                <Share2 className="h-5 w-5" />
              )}
            </motion.button>
          ) : null}

          {showFavorite ? (
            <motion.button
              type="button"
              onClick={handleLike}
              whileTap={{ scale: 0.92 }}
              disabled={likeBusy}
              className={[
                "grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/10 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 touch-manipulation",
                liked
                  ? "bg-red-500/90 text-white"
                  : "bg-black/60 text-white hover:bg-black/80",
                likeBusy ? "opacity-80" : "",
              ].join(" ")}
              aria-label={
                liked
                  ? "Αφαίρεση από αγαπημένα"
                  : "Προσθήκη στα αγαπημένα"
              }
              aria-pressed={liked}
              title={liked ? "Αφαίρεση από αγαπημένα" : "Αγαπημένο"}
            >
              {likeBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : liked ? (
                <Heart className="h-5 w-5 fill-current" />
              ) : (
                <Heart className="h-5 w-5" />
              )}
            </motion.button>
          ) : null}
        </motion.div>
      </div>
    </>
  )
}