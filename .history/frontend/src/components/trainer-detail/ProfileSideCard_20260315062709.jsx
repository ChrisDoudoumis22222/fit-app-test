"use client"

import React, { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  Banknote,
  BadgeCheck,
  Calendar,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
  Share2,
  Sparkles,
  Tag,
  Heart,
  Loader2,
} from "lucide-react"

import { supabase } from "../../supabaseClient"
import { useAuth } from "../../AuthProvider"
import MobileStickyActions from "./MobileStickyActions.jsx"
import GuestBookingAuthModalfortrainers from "../guest/GuestBookingAuthModalfortrainers.jsx"

import {
  FALLBACK_PRIMARY,
  FALLBACK_ULTIMATE,
  PremiumCard,
  formatCurrency,
  formatDuration,
  hasImage,
  safeAvatar,
} from "./shared.jsx"

export default function ProfileSideCard({
  data,
  stats = {},
  cat,
  CatIcon,
  isNewTrainer,
  onBookClick,
  onReviewsClick,
  accepts = {},
  priceInfo = {},
}) {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const trainerId = data?.id || null
  const viewerId = profile?.id || null

  const photo = hasImage(data?.avatar_url)
    ? safeAvatar(data.avatar_url)
    : FALLBACK_PRIMARY

  const hasDiploma = Boolean(data?.diploma_url?.trim())
  const avgRating = Number(stats?.avgRating || 0)
  const reviewsCount = Number(stats?.reviewsCount || 0)

  const trainerStatus = data?.is_online
    ? { label: "Ενεργός τώρα", dot: "bg-emerald-400" }
    : { label: "Ανενεργός τώρα", dot: "bg-zinc-400" }

  const [toast, setToast] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const pushToast = useCallback((message) => {
    const id = Date.now() + Math.random()
    setToast({ id, message })

    if (typeof window !== "undefined") {
      window.clearTimeout(window.__pvToastTimer)
      window.__pvToastTimer = window.setTimeout(() => setToast(null), 2200)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.clearTimeout(window.__pvToastTimer)
      }
    }
  }, [])

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

  const toggleLike = useCallback(async () => {
    if (!trainerId) return
    if (!requireAuthForLike()) return



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
  }, [trainerId, viewerId, requireAuthForLike, likeBusy, liked, pushToast])

  const handleBookTap = useCallback(() => {
    if (typeof onBookClick === "function") onBookClick()
  }, [onBookClick])

  const handleReviewsTap = useCallback(() => {
    if (typeof onReviewsClick === "function") onReviewsClick()
  }, [onReviewsClick])

  const handleShare = useCallback(async () => {
    try {
      const shareData = {
        title: data?.full_name
          ? `${data.full_name} — Peak Velocity`
          : "Peak Velocity Trainer",
        text: `Δες το προφίλ του/της ${data?.full_name || "προπονητή"} στο Peak Velocity`,
        url: typeof window !== "undefined" ? window.location.href : "",
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData)
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        shareData.url
      ) {
        await navigator.clipboard.writeText(shareData.url)
        pushToast("Ο σύνδεσμος αντιγράφηκε στο πρόχειρο.")
      }
    } catch (err) {
      console.error("Share failed", err)
    }
  }, [data?.full_name, pushToast])

  return (
    <>
      <PremiumCard
        hover
        className={[
          "block h-auto min-h-0 !h-auto !min-h-0",
          "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-none rounded-none border-x-0",
          "sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:max-w-[360px] sm:rounded-[28px] sm:border-x",
          "lg:mx-0 lg:max-w-[380px] lg:self-start",
        ].join(" ")}
      >
        <div className="p-3 pb-24 sm:p-4 lg:p-4.5">
          <div className="relative overflow-hidden rounded-[24px] border border-zinc-700/50 bg-zinc-900/30 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
            <img
              src={photo}
              alt={data?.full_name || "Προπονητής"}
              className="w-full aspect-[4/4.15] object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = FALLBACK_ULTIMATE
              }}
            />

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            <div className="absolute left-3 top-3 right-16 z-[2] flex items-center">
              <span className="inline-flex min-h-[34px] max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur-md">
                <span className={`h-2 w-2 shrink-0 rounded-full ${trainerStatus.dot}`} />
                <span className="truncate">{trainerStatus.label}</span>
              </span>
            </div>

            <motion.button
              type="button"
              onClick={toggleLike}
              whileTap={{ scale: 0.92 }}
              disabled={!trainerId || likeBusy}
              className={`absolute right-3 top-3 z-[3] grid h-10 w-10 place-items-center rounded-full border border-white/10 backdrop-blur-md transition-all touch-manipulation ${
                liked
                  ? "bg-red-500/90 text-white"
                  : "bg-black/60 text-white hover:bg-black/80"
              } ${likeBusy ? "opacity-80" : ""}`}
              aria-label={liked ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
              aria-pressed={liked}
              title={liked ? "Αφαίρεση από αγαπημένα" : "Αγαπημένο"}
            >
              {likeBusy ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : liked ? (
                <Heart className="h-5 w-5 fill-current" />
              ) : (
                <Heart className="h-5 w-5" />
              )}
            </motion.button>

            <div className="absolute inset-x-3 bottom-3 z-[2]">
              <div className="rounded-[22px] border border-white/10 bg-black/60 p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-[18px] font-semibold leading-tight text-white sm:text-[19px]">
                        {data?.full_name || "Προπονητής"}
                      </h1>

                      {hasDiploma ? (
                        <BadgeCheck
                          className="h-[18px] w-[18px] shrink-0 text-white"
                          aria-label="Επαληθευμένο δίπλωμα"
                        />
                      ) : null}
                    </div>

                    {data?.location ? (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-zinc-300 sm:text-sm">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{data.location}</span>
                      </div>
                    ) : null}
                  </div>

                  {isNewTrainer ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      Νέος
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 space-y-3.5 sm:mt-4 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-2xl border border-zinc-700/60 bg-zinc-900/50 px-3 py-2 text-zinc-200 shadow-sm">
                <span className="text-amber-300">★</span>
                <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-zinc-400">({reviewsCount})</span>
              </span>

              {cat ? (
                <span className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl border border-zinc-700/60 bg-zinc-900/50 px-3 py-2 text-zinc-200 shadow-sm">
                  {CatIcon ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-zinc-700/60 bg-zinc-800">
                      <CatIcon className="h-3 w-3 text-zinc-200" />
                    </span>
                  ) : null}
                  <span className="text-xs font-medium sm:text-[13px]">{cat.label}</span>
                </span>
              ) : null}
            </div>

            {(typeof priceInfo?.typicalPrice === "number" && priceInfo.typicalPrice > 0) ||
            priceInfo?.typicalDurationMin ? (
              <div className="flex flex-wrap gap-2">
                {typeof priceInfo?.typicalPrice === "number" && priceInfo.typicalPrice > 0 ? (
                  <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-200 shadow-sm">
                    <Banknote className="h-3.5 w-3.5" />
                    {formatCurrency(priceInfo.typicalPrice, priceInfo.currencyCode || "EUR")} / συνεδρία
                  </span>
                ) : null}

                {priceInfo?.typicalDurationMin ? (
                  <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-200 shadow-sm">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(priceInfo.typicalDurationMin)}
                  </span>
                ) : null}
              </div>
            ) : null}

            {accepts?.cash || accepts?.card ? (
              <div className="flex flex-wrap gap-2">
                {accepts.cash ? (
                  <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-200 shadow-sm">
                    <Banknote className="h-3.5 w-3.5" />
                    Μετρητά
                  </span>
                ) : null}

                {accepts.card ? (
                  <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-200 shadow-sm">
                    <CreditCard className="h-3.5 w-3.5" />
                    Κάρτα
                  </span>
                ) : null}
              </div>
            ) : null}

            {Array.isArray(data?.roles) && data.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.roles.slice(0, 4).map((t, i) => (
                  <span
                    key={`role-${i}`}
                    className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 shadow-sm"
                  >
                    <Tag className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[140px] sm:max-w-none">{t}</span>
                  </span>
                ))}

                {data.roles.length > 4 ? (
                  <span className="inline-flex min-h-[34px] items-center rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400 shadow-sm">
                    +{data.roles.length - 4}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="pt-1.5 space-y-2.5">
              <motion.button
                type="button"
                onClick={handleBookTap}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                className="hidden sm:inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[18px] border border-zinc-600/50 bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100 shadow-lg backdrop-blur-xl transition hover:from-zinc-600 hover:to-zinc-700"
              >
                <Calendar className="h-4 w-4" />
                Κάνε κράτηση
              </motion.button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleReviewsTap}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[18px] border border-zinc-700/60 bg-zinc-900/40 px-3 py-3 text-sm font-medium text-zinc-200 shadow-lg transition hover:bg-zinc-800/50 touch-manipulation"
                >
                  <MessageCircle className="h-4 w-4" />
                  Κριτικές
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[18px] border border-zinc-700/60 bg-zinc-900/40 px-3 py-3 text-sm font-medium text-zinc-200 shadow-lg transition hover:bg-zinc-800/50 touch-manipulation"
                >
                  <Share2 className="h-4 w-4" />
                  Κοινοποίηση
                </button>
              </div>
            </div>
          </div>
        </div>
      </PremiumCard>

      <MobileStickyActions
        onBookClick={handleBookTap}
        onToggleLike={toggleLike}
        liked={liked}
        likeBusy={likeBusy}
      />

      <GuestBookingAuthModalfortrainers
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

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