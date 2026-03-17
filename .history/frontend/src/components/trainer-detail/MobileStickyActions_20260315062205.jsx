"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  const { profile } = useAuth()

  const [authUserId, setAuthUserId] = useState(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [toast, setToast] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [likeLoaded, setLikeLoaded] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const viewerId = useMemo(
    () => profile?.id || authUserId || null,
    [profile?.id, authUserId]
  )

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
    let mounted = true

    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return
      if (!error) {
        setAuthUserId(data?.user?.id || null)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUserId(session?.user?.id || null)
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

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        setLikeLoaded(false)

        if (!viewerId || !trainerId) {
          if (alive) {
            setLiked(false)
            setLikeLoaded(true)
          }
          return
        }

        const { data, error } = await supabase
          .from("trainer_likes")
          .select("id")
          .eq("user_id", viewerId)
          .eq("trainer_id", trainerId)
          .limit(1)

        if (!alive) return

        if (error) {
          setLiked(false)
          setLikeLoaded(true)
          return
        }

        setLiked((data || []).length > 0)
        setLikeLoaded(true)
      } catch {
        if (!alive) return
        setLiked(false)
        setLikeLoaded(true)
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

      if (!navigator.onLine) {
        pushToast("Είσαι εκτός σύνδεσης.")
        return
      }

      if (!trainerId) {
        pushToast("Δεν βρέθηκε ο επαγγελματίας.")
        return
      }

      if (!requireAuthForLike()) return

      if (trainerId === viewerId) {
        pushToast("Δεν μπορείς να αποθηκεύσεις το δικό σου προφίλ.")
        return
      }

      if (likeBusy) return

      const nextLiked = !liked

      setLikeBusy(true)
      setLiked(nextLiked)

      try {
        if (nextLiked) {
          const { error } = await supabase.from("trainer_likes").upsert(
            [{ user_id: viewerId, trainer_id: trainerId }],
            { onConflict: "user_id,trainer_id" }
          )

          if (error) {
            setLiked(false)
            pushToast("Το like δεν αποθηκεύτηκε. Δοκίμασε ξανά.")
            return
          }

          pushToast("Ο επαγγελματίας αποθηκεύτηκε στα αγαπημένα")
        } else {
          const { error } = await supabase
            .from("trainer_likes")
            .delete()
            .eq("user_id", viewerId)
            .eq("trainer_id", trainerId)

          if (error) {
            setLiked(true)
            pushToast("Η αφαίρεση απέτυχε. Δοκίμασε ξανά.")
            return
          }

          pushToast("Ο επαγγελματίας αφαιρέθηκε από τα αγαπημένα")
        }
      } catch {
        setLiked(!nextLiked)
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
            className="sm:hidden fixed left-4 bottom-[calc(env(safe-area-inset-bottom,0px)+7.2rem)] z-[9998]"
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
          transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.95 }}
          className="pointer-events-auto mx-auto flex w-full max-w-md items-center gap-2"
        >
          <button
            type="button"
            onClick={handleBook}
            className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[20px] border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition hover:bg-zinc-50 active:scale-[0.99] touch-manipulation"
          >
            <Calendar className="h-4 w-4" />
            Κάνε κράτηση
          </button>

          {showFavorite ? (
            <motion.button
              type="button"
              onClick={toggleLike}
              whileTap={{ scale: 0.92 }}
              disabled={likeBusy}
              className={[
                "grid h-[56px] w-[56px] shrink-0 place-items-center rounded-[20px] border bg-white shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition-all duration-200 touch-manipulation",
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
              {!likeLoaded || likeBusy ? (
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