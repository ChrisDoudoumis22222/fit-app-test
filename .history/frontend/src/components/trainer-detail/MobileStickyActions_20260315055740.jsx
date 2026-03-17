"use client"

import React, { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Calendar, ChevronUp, Heart, Loader2 } from "lucide-react"

import { supabase } from "../../supabaseClient"
import { useAuth } from "../../AuthProvider"

export default function MobileStickyActions({
  onBookClick,
  trainerId = null,
  showFavorite = true,
  showScrollButton = true,
  scrollThreshold = 320,
}) {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const viewerId = profile?.id || null

  const [showScrollTop, setShowScrollTop] = useState(false)
  const [toast, setToast] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)

  const pushToast = useCallback((message) => {
    const id = Date.now() + Math.random()
    setToast({ id, message })

    if (typeof window !== "undefined") {
      window.clearTimeout(window.__pvStickyToastTimer)
      window.__pvStickyToastTimer = window.setTimeout(() => {
        setToast(null)
      }, 2200)
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

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        if (!viewerId || !trainerId) {
          if (alive) setLiked(false)
          return
        }

        const { data: rows, error } = await supabase
          .from("trainer_likes")
          .select("trainer_id")
          .eq("user_id", viewerId)
          .eq("trainer_id", trainerId)
          .limit(1)

        if (!alive) return
        if (!error) setLiked((rows || []).length > 0)
      } catch {
        if (alive) setLiked(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [viewerId, trainerId])

  const requireAuth = useCallback(() => {
    if (viewerId) return true

    const nextPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search || ""}`
        : "/"

    pushToast("Συνδέσου για να αποθηκεύσεις στα αγαπημένα.")
    navigate(`/login?next=${encodeURIComponent(nextPath)}`)
    return false
  }, [viewerId, navigate, pushToast])

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

  const toggleLike = useCallback(
    async (e) => {
      e.preventDefault()
      e.stopPropagation()

      if (!trainerId) return
      if (!requireAuth()) return

      if (viewerId && trainerId === viewerId) {
        pushToast("Δεν μπορείς να αποθηκεύσεις το δικό σου προφίλ.")
        return
      }

      if (likeBusy) return
      setLikeBusy(true)

      try {
        if (liked) {
          const { error } = await supabase
            .from("trainer_likes")
            .delete()
            .eq("user_id", viewerId)
            .eq("trainer_id", trainerId)

          if (!error) {
            setLiked(false)
            pushToast("Ο επαγγελματίας αφαιρέθηκε από τα αγαπημένα")
          }
        } else {
          const { error } = await supabase
            .from("trainer_likes")
            .insert([{ user_id: viewerId, trainer_id: trainerId }])

          setLiked(true)
          pushToast(
            error
              ? "Ο επαγγελματίας αποθηκεύτηκε στα αγαπημένα"
              : "Ο επαγγελματίας αποθηκεύτηκε στα αγαπημένα"
          )
        }
      } finally {
        setLikeBusy(false)
      }
    },
    [trainerId, viewerId, requireAuth, likeBusy, liked, pushToast]
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
            className="sm:hidden fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.9rem)] z-[9998] pointer-events-none"
          >
            <button
              type="button"
              onClick={handleScrollTop}
              className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white shadow-[0_12px_30px_rgba(0,0,0,0.34)] backdrop-blur-xl touch-manipulation"
              aria-label="Πάνω"
              title="Πάνω"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-[9997] pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md">
          <div className="pointer-events-auto rounded-[24px] border border-white/10 bg-black/72 p-2 shadow-[0_-10px_35px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div className="grid grid-cols-[auto_1fr] gap-2">
              {showFavorite ? (
                <motion.button
                  type="button"
                  onClick={toggleLike}
                  whileTap={{ scale: 0.92 }}
                  disabled={!trainerId || likeBusy}
                  className={`grid h-[52px] w-[52px] place-items-center rounded-[18px] border border-white/10 backdrop-blur-md transition-all touch-manipulation ${
                    liked
                      ? "bg-red-500/90 text-white"
                      : "bg-black/60 text-white hover:bg-black/80"
                  } ${likeBusy ? "opacity-80" : ""}`}
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

              <button
                type="button"
                onClick={handleBook}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border border-zinc-600/50 bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100 shadow-lg transition hover:from-zinc-600 hover:to-zinc-700 active:scale-[0.99] touch-manipulation"
              >
                <Calendar className="h-4 w-4" />
                Κάνε κράτηση
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[9996] flex justify-center px-4 sm:bottom-4">
        <div className="w-full max-w-md">
          <AnimatePresence>
            {toast ? (
              <motion.div
                key={toast.id}
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 14, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                className="pointer-events-auto rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-white shadow-lg backdrop-blur-md"
                role="status"
                onClick={() => setToast(null)}
              >
                {toast.message}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}