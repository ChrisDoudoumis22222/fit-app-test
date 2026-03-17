"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
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
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ShieldCheck,
} from "lucide-react"

import { supabase } from "../../supabaseClient"
import { useAuth } from "../../AuthProvider"
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

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    wrap: "border-emerald-400/20 bg-[#07130d]/95 text-white",
    iconWrap: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
    bar: "bg-emerald-400",
    title: "Ολοκληρώθηκε",
  },
  error: {
    icon: AlertTriangle,
    wrap: "border-red-400/20 bg-[#16090a]/95 text-white",
    iconWrap: "bg-red-500/15 text-red-300 border-red-400/20",
    bar: "bg-red-400",
    title: "Σφάλμα",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "border-amber-400/20 bg-[#171109]/95 text-white",
    iconWrap: "bg-amber-500/15 text-amber-300 border-amber-400/20",
    bar: "bg-amber-400",
    title: "Προσοχή",
  },
  info: {
    icon: Info,
    wrap: "border-sky-400/20 bg-[#08131a]/95 text-white",
    iconWrap: "bg-sky-500/15 text-sky-300 border-sky-400/20",
    bar: "bg-sky-400",
    title: "Ενημέρωση",
  },
}

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
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const pushToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random()
    setToast({ id, message, type })

    if (typeof window !== "undefined") {
      window.clearTimeout(window.__pvToastTimer)
      window.__pvToastTimer = window.setTimeout(() => setToast(null), 2800)
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

  const handleBookTap = useCallback(() => {
    if (typeof onBookClick === "function") onBookClick()
  }, [onBookClick])

  const handleReviewsTap = useCallback(() => {
    if (typeof onReviewsClick === "function") onReviewsClick()
  }, [onReviewsClick])

  const goToCertificates = useCallback(() => {
    if (typeof document === "undefined") return

    const candidates = [
      document.getElementById("trainer-certifications"),
      document.getElementById("certifications"),
      document.getElementById("trainer-diploma"),
      document.querySelector('[data-section="certifications"]'),
      document.querySelector('[data-section="diploma"]'),
    ].filter(Boolean)

    const firstTarget = candidates[0]

    if (firstTarget) {
      firstTarget.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      pushToast("Μεταφέρθηκες στις πιστοποιήσεις.", "info")
      return
    }

    if (data?.diploma_url) {
      window.open(data.diploma_url, "_blank", "noopener,noreferrer")
      pushToast("Άνοιξε το πιστοποιητικό του επαγγελματία.", "success")
      return
    }

    pushToast("Δεν βρέθηκαν διαθέσιμες πιστοποιήσεις.", "warning")
  }, [data?.diploma_url, pushToast])

  const toggleLike = useCallback(async () => {
    if (!trainerId) return
    if (!requireAuthForLike()) return

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      pushToast("Είσαι εκτός σύνδεσης. Δοκίμασε ξανά όταν συνδεθείς.", "warning")
      return
    }

    if (viewerId && trainerId === viewerId) {
      pushToast("Δεν μπορείς να αποθηκεύσεις το δικό σου προφίλ.", "warning")
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
          pushToast("Κάτι πήγε στραβά. Δοκίμασε ξανά.", "error")
          return
        }

        setLiked(false)
        pushToast("Ο επαγγελματίας αφαιρέθηκε από τα αγαπημένα.", "success")
      } else {
        const { error } = await supabase
          .from("trainer_likes")
          .insert([{ user_id: viewerId, trainer_id: trainerId }])

        if (error) {
          pushToast("Κάτι πήγε στραβά. Δοκίμασε ξανά.", "error")
          return
        }

        setLiked(true)
        pushToast("Ο επαγγελματίας αποθηκεύτηκε στα αγαπημένα.", "success")
      }
    } catch {
      pushToast("Κάτι πήγε στραβά. Δοκίμασε ξανά.", "error")
    } finally {
      setLikeBusy(false)
    }
  }, [trainerId, viewerId, requireAuthForLike, likeBusy, liked, pushToast])

  const handleShare = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        pushToast("Είσαι εκτός σύνδεσης. Η κοινοποίηση δεν είναι διαθέσιμη τώρα.", "warning")
        return
      }

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
        pushToast("Ο σύνδεσμος αντιγράφηκε στο πρόχειρο.", "success")
      } else {
        pushToast("Η κοινοποίηση δεν υποστηρίζεται σε αυτή τη συσκευή.", "warning")
      }
    } catch (err) {
      console.error("Share failed", err)
      pushToast("Η κοινοποίηση δεν ολοκληρώθηκε.", "error")
    }
  }, [data?.full_name, pushToast])

  const toastTheme = useMemo(() => {
    return TOAST_STYLES[toast?.type] || TOAST_STYLES.info
  }, [toast?.type])

  const ToastIcon = toastTheme.icon

  const overlayUI =
    portalReady && typeof document !== "undefined"
      ? createPortal(
          <>
            <div className="relative z-[100000]">
              <GuestBookingAuthModalfortrainers
                open={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
              />
            </div>

            <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[100001] flex justify-center px-4 sm:bottom-6">
              <div className="w-full max-w-md sm:max-w-[460px]">
                <AnimatePresence mode="popLayout">
                  {toast ? (
                    <motion.div
                      key={toast.id}
                      initial={{ y: 20, opacity: 0, scale: 0.98 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 12, opacity: 0, scale: 0.985 }}
                      transition={{ type: "spring", stiffness: 460, damping: 30 }}
                      className={[
                        "pointer-events-auto relative overflow-hidden rounded-[24px] border shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl",
                        toastTheme.wrap,
                      ].join(" ")}
                      role="status"
                    >
                      <div className={`absolute inset-x-0 top-0 h-[3px] ${toastTheme.bar}`} />

                      <div className="flex items-start gap-3 px-4 py-3.5 sm:px-4.5">
                        <div
                          className={[
                            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                            toastTheme.iconWrap,
                          ].join(" ")}
                        >
                          <ToastIcon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold tracking-[0.01em] text-white/95">
                            {toastTheme.title}
                          </div>
                          <div className="mt-0.5 text-[13px] leading-5 text-zinc-200">
                            {toast.message}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setToast(null)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                          aria-label="Κλείσιμο ειδοποίησης"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </>,
          document.body
        )
      : null

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
        <div className="p-3 pb-28 sm:p-4 lg:p-4.5">
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

      <div className="fixed inset-x-0 bottom-0 z-[9998] border-t border-white/10 bg-black/80 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button
            type="button"
            onClick={goToCertificates}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-black shadow-[0_16px_40px_rgba(255,255,255,0.12)] transition active:scale-[0.985]"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            Πιστοποιήσεις
          </button>

          <button
            type="button"
            onClick={toggleLike}
            disabled={!trainerId || likeBusy}
            className={`inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border border-white/10 text-white transition ${
              liked ? "bg-red-500/90" : "bg-zinc-900/70"
            } ${likeBusy ? "opacity-80" : ""}`}
            aria-label={liked ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
          >
            {likeBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : liked ? (
              <Heart className="h-5 w-5 fill-current" />
            ) : (
              <Heart className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-zinc-900/70 text-white transition"
            aria-label="Κοινοποίηση"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {overlayUI}
    </>
  )
}