"use client"

// If this file is not inside src/components/trainer-detail/
// adjust the 2 import paths below.
import React, { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, ChevronUp, Heart } from "lucide-react"
import { supabase } from "../../supabaseClient"
import GuestBookingAuthModalfortrainers from "../guest/GuestBookingAuthModalfortrainers.jsx"

export default function MobileStickyActions({
  onBookClick,
  onFavoriteToggle,
  initialFavorite = false,
  showFavorite = true,
  showScrollButton = true,
  scrollThreshold = 320,
  trainerId = null,
  bookLabel = "Κάνε κράτηση",
}) {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [liked, setLiked] = useState(initialFavorite)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  useEffect(() => {
    setLiked(initialFavorite)
  }, [initialFavorite])

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (!error) setCurrentUser(data?.user ?? null)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
      if (session?.user) setAuthModalOpen(false)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > scrollThreshold)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [scrollThreshold])

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const handleBook = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (typeof onBookClick === "function") onBookClick(e)
    },
    [onBookClick]
  )

  const handleFavorite = useCallback(
    async (e) => {
      e.preventDefault()
      e.stopPropagation()

      if (favoriteLoading) return

      if (!currentUser) {
        setAuthModalOpen(true)
        return
      }

      const nextValue = !liked
      setLiked(nextValue)

      if (typeof onFavoriteToggle !== "function") return

      try {
        setFavoriteLoading(true)
        await onFavoriteToggle({
          trainerId,
          nextValue,
          user: currentUser,
        })
      } catch (error) {
        setLiked(!nextValue)
        console.error("Favorite toggle failed:", error)
      } finally {
        setFavoriteLoading(false)
      }
    },
    [currentUser, favoriteLoading, liked, onFavoriteToggle, trainerId]
  )

  return (
    <>
      <AnimatePresence>
        {showScrollButton && showScrollTop ? (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="sm:hidden fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+6.25rem)] z-[9998] pointer-events-none"
          >
            <motion.button
              type="button"
              onClick={handleScrollTop}
              whileTap={{ scale: 0.96 }}
              className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white shadow-[0_14px_34px_rgba(0,0,0,0.36)] backdrop-blur-xl ring-1 ring-white/5 touch-manipulation"
              aria-label="Πάνω"
              title="Πάνω"
            >
              <ChevronUp className="h-5 w-5" />
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-[9997] pointer-events-none px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="mx-auto w-full max-w-md"
        >
          <div className="pointer-events-auto overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(10,10,10,0.90))] p-2 shadow-[0_-18px_48px_rgba(0,0,0,0.42)] backdrop-blur-2xl ring-1 ring-white/5">
            <div className="flex items-center gap-2">
              {showFavorite ? (
                <motion.button
                  type="button"
                  onClick={handleFavorite}
                  whileTap={{ scale: 0.96 }}
                  disabled={favoriteLoading}
                  className={[
                    "relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px]",
                    "border transition-all duration-200 touch-manipulation",
                    liked
                      ? "border-red-400/30 bg-red-500/12 text-red-400 shadow-[0_10px_24px_rgba(239,68,68,0.18)]"
                      : "border-white/10 bg-white/[0.05] text-zinc-200 hover:bg-white/[0.08]",
                    favoriteLoading ? "opacity-70" : "",
                  ].join(" ")}
                  aria-label={
                    liked
                      ? "Αφαίρεση από αγαπημένα"
                      : "Προσθήκη στα αγαπημένα"
                  }
                  title={
                    liked
                      ? "Αφαίρεση από αγαπημένα"
                      : "Προσθήκη στα αγαπημένα"
                  }
                >
                  <Heart
                    className={[
                      "h-[22px] w-[22px] transition-all duration-200",
                      liked ? "fill-current scale-110" : "",
                    ].join(" ")}
                  />

                  {liked ? (
                    <span className="absolute inset-0 rounded-[20px] ring-1 ring-red-300/20" />
                  ) : null}
                </motion.button>
              ) : null}

              <motion.button
                type="button"
                onClick={handleBook}
                whileTap={{ scale: 0.992 }}
                className={[
                  "group relative inline-flex min-h-[56px] flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-[20px]",
                  "border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-black",
                  "shadow-[0_12px_28px_rgba(255,255,255,0.12)] transition-all duration-200",
                  "hover:bg-zinc-100 active:scale-[0.99] touch-manipulation",
                ].join(" ")}
              >
                <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_55%)] opacity-70" />
                <Calendar className="relative h-[18px] w-[18px]" />
                <span className="relative">{bookLabel}</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {authModalOpen ? (
          <GuestBookingAuthModalfortrainers
            open={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}