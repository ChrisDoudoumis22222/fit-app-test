"use client"

import React, { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Calendar, ChevronUp, Heart, Loader2 } from "lucide-react"

import { supabase } from "../../supabaseClient"
import { useAuth } from "../../AuthProvider"
import GuestBookingAuthModalfortrainers from "../guest/GuestBookingAuthModalfortrainers.jsx"

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
  const [authModalOpen, setAuthModalOpen] = useState(false)

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
    return () => {
      if (typeof window !== "undefined") {
        window.clearTimeout(window.__pvStickyToastTimer)
      }
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

        if (!error) {
          setLiked((rows || []).length > 0)
        } else {
          setLiked(false)
        }
      } catch {
        if (alive) setLiked(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [viewerId, trainerId])

  const requireAuthForLike = useCallback(() => {
    if (viewerId) return true
    setAuthModalOpen(true)
    return false
  }, [viewerId])

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
      if (!requireAuthForLike()) return

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

          if (error) {
            pushToast("Κάτι πήγε στραβά. Δοκίμασε ξανά.")
            return
          }

          setLiked(false)
          pushToast("Ο επαγγελματίας αφαιρέθηκε από τα αγαπημένα")
        } else {
          const { error } = await supabase
            .from("trainer_likes")
            .insert([{ user_id: viewerId, trainer_id: trainerId }])

          if (error) {
            pushToast("Κάτι πήγε στραβά. Δοκίμασε ξανά.")
            return
          }

          setLiked(true)
          pushToast("Ο επαγγελματίας αποθηκεύτηκε στα αγαπημένα")
        }
      } catch {
        pushToast("Κάτι πήγε στραβά. Δοκίμασε ξανά.")
      } finally {
        setLikeBusy(false)
      }
    },
    [trainerId, viewerId, requireAuthForLike, likeBusy, liked, pushToast]
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
            className="sm:hidden fixed left-4 bottom-[calc(env(safe-area-inset-bottom,0px)+7.2rem)] z-[9998] pointer-events-none"
          >
            <button
              type="button"
              onClick={handleScrollTop}
              className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-black shadow-[0_12px_30px_rgba(0,0,0,0.14)] touch-manipulation"
              aria-label="Πάνω"
              title="Πάνω"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="sm:hidden fixed inset-x-0 bottom-0 z-[9997] pointer-events-none px-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.95 }}
          className="mx-auto flex w-full max-w-md items-center gap-2"
        >
          <button
            type="button"
            onClick={handleBook}
            className="pointer-events-auto inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition hover:bg-zinc-50 active:scale-[0.99] touch-manipulation"
          >
            <Calendar className="h-4 w-4" />
            Κάνε κράτηση
          </button>

          {showFavorite ? (
            <motion.button
              type="button"
              onClick={toggleLike}
              whileTap={{ scale: 0.92 }}
              disabled={!trainerId || likeBusy}
              className={[
                "pointer-events-auto grid h-[56px] w-[56px] shrink-0 place-items-center rounded-[20px] border bg-white shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition-all duration-200 touch-manipulation",
                liked
                  ? "border-red-200 text-red-500 hover:bg-red-50"
                  : "border-zinc-200 text-black hover:bg-zinc-50",
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

      <GuestBookingAuthModalfortrainers
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[9996] flex justify-center px-4 sm:bottom-4">
        <div className="w-full max-w-md">
          <AnimatePresence>
            {toast ? (
              <motion.div
                key={toast.id}
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 14, opacity: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                className="pointer-events-auto rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-black shadow-lg"
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