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
  ChevronDown,
  ChevronUp,
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
  categoryByValue,
  ICON_BY_KEY,
} from "./shared.jsx"

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

function cleanText(v) {
  return String(v || "").trim()
}

function uniqBy(items = [], getKey = (x) => x) {
  const seen = new Set()
  const out = []

  for (const item of items) {
    const key = getKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }

  return out
}

function titleCase(text) {
  return String(text || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function prettifyCategoryValue(value) {
  const raw = cleanText(value)
  if (!raw) return ""

  return titleCase(
    raw
      .replace(/^cat/i, "")
      .replace(/^spec/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  )
}

function normalizeCategoryItems(data, cat, CatIcon) {
  const genericRoles = new Set([
    "trainer",
    "user",
    "admin",
    "member",
    "athlete",
    "client",
  ])

  const fromSpecialties = Array.isArray(data?.specialties) ? data.specialties : []

  const fromRoles = Array.isArray(data?.roles)
    ? data.roles.filter((r) => !genericRoles.has(String(r || "").toLowerCase()))
    : []

  const fromSpecialtyString =
    typeof data?.specialty === "string"
      ? data.specialty
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []

  const rawValues = [...fromSpecialties, ...fromRoles, ...fromSpecialtyString]

  const mappedItems = rawValues.map((raw) => {
    const cleaned = cleanText(raw)
    if (!cleaned) return null

    const mapped = typeof categoryByValue === "function" ? categoryByValue(cleaned) : null
    const SharedIcon =
      mapped?.iconKey && ICON_BY_KEY?.[mapped.iconKey] ? ICON_BY_KEY[mapped.iconKey] : null

    return {
      raw: cleaned,
      label: cleanText(mapped?.label) || prettifyCategoryValue(cleaned),
      Icon: SharedIcon || CatIcon || Tag,
    }
  })

  if (cat?.label) {
    mappedItems.push({
      raw: cleanText(cat.label),
      label: cleanText(cat.label),
      Icon: CatIcon || Tag,
    })
  }

  return uniqBy(
    mappedItems.filter(Boolean).filter((item) => cleanText(item.label)),
    (item) => cleanText(item.label).toLowerCase()
  )
}

function MiniTitle({ children }) {
  return (
    <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-[11px]">
      {children}
    </p>
  )
}

function CategoryPill({ item, compact = false }) {
  const Icon = item?.Icon || Tag

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 text-zinc-200 shadow-sm",
        compact ? "min-h-[30px] px-2.5 py-1 text-[11px]" : "min-h-[35px] px-3 py-1.5 text-xs"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-zinc-700/60 bg-zinc-800/80 text-zinc-300",
          compact ? "h-4.5 w-4.5" : "h-5 w-5"
        )}
      >
        <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      </span>

      <span
        className={cn(
          "truncate",
          compact ? "max-w-[118px]" : "max-w-[190px] sm:max-w-none"
        )}
      >
        {item?.label}
      </span>
    </span>
  )
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

  const hasDiploma = Boolean(cleanText(data?.diploma_url))
  const avgRating = Number(stats?.avgRating || 0)
  const reviewsCount = Number(stats?.reviewsCount || 0)

  const categoryItems = useMemo(
    () => normalizeCategoryItems(data, cat, CatIcon),
    [data, cat, CatIcon]
  )

  const mobileVisibleCategories = categoryItems.slice(0, 3)
  const mobileHiddenCategories = categoryItems.slice(3)

  const trainerStatus = data?.is_online
    ? { label: "Ενεργός τώρα", dot: "bg-emerald-400" }
    : { label: "Ανενεργός τώρα", dot: "bg-zinc-400" }

  const [toast, setToast] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeBusy, setLikeBusy] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [mobileCategoriesExpanded, setMobileCategoriesExpanded] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

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

        if (!error) setLiked((rows || []).length > 0)
        else setLiked(false)
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

            <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100001] flex justify-center px-4 sm:bottom-6">
              <div className="w-full max-w-md sm:max-w-[420px]">
                <AnimatePresence>
                  {toast ? (
                    <motion.div
                      key={toast.id}
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 14, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 34 }}
                      className="pointer-events-auto rounded-2xl border border-white/10 bg-black/85 px-4 py-3 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
                      role="status"
                      onClick={() => setToast(null)}
                    >
                      {toast.message}
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
        className={cn(
          "block h-auto min-h-0 w-full max-w-none",
          "rounded-[28px] border border-zinc-800/70 bg-zinc-950/40",
          "shadow-[0_14px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl",
          "sm:max-w-[360px] lg:max-w-[380px] lg:self-start"
        )}
      >
        <div className="p-2.5 pb-[4.6rem] sm:p-4 sm:pb-4">
          <div className="relative overflow-hidden rounded-[24px] border border-zinc-700/50 bg-zinc-900/30 shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
            <img
              src={photo}
              alt={data?.full_name || "Προπονητής"}
              className="aspect-[4/4.15] w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = FALLBACK_ULTIMATE
              }}
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            <div className="absolute left-3 right-16 top-3 z-[2] flex items-center">
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
              className={cn(
                "absolute right-3 top-3 z-[3] grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-all touch-manipulation",
                likeBusy ? "opacity-80" : "",
                liked ? "text-red-400" : ""
              )}
              aria-label={liked ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
              aria-pressed={liked}
              title={liked ? "Αφαίρεση από αγαπημένα" : "Αγαπημένο"}
            >
              {likeBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : liked ? (
                <Heart className="h-5 w-5 fill-current" />
              ) : (
                <Heart className="h-5 w-5" />
              )}
            </motion.button>

            <div className="absolute inset-x-3 bottom-3 z-[2]">
              <div className="rounded-[22px] border border-white/10 bg-black/60 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="truncate text-[17px] font-semibold leading-tight text-white sm:text-[19px]">
                        {data?.full_name || "Προπονητής"}
                      </h1>

                      {hasDiploma ? (
                        <BadgeCheck
                          className="h-[17px] w-[17px] shrink-0 text-white"
                          aria-label="Επαληθευμένο δίπλωμα"
                        />
                      ) : null}
                    </div>

                    {data?.location ? (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-zinc-300 sm:text-sm">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{data.location}</span>
                      </div>
                    ) : null}
                  </div>

                  {isNewTrainer ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      Νέος
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2.5 px-1 sm:mt-4 sm:space-y-3.5 sm:px-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-[38px] items-center gap-1.5 rounded-2xl border border-zinc-700/60 bg-zinc-900/50 px-3 py-2 text-zinc-200 shadow-sm">
                <span className="text-amber-300">★</span>
                <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-zinc-400">({reviewsCount})</span>
              </span>

              {hasDiploma ? (
                <span className="inline-flex min-h-[38px] items-center gap-2 rounded-2xl border border-zinc-700/60 bg-zinc-900/50 px-3 py-2 text-zinc-200 shadow-sm">
                  <BadgeCheck className="h-4 w-4 text-white" />
                  <span className="text-xs font-medium sm:text-[13px]">
                    Επαληθευμένο
                  </span>
                </span>
              ) : null}
            </div>

            {categoryItems.length > 0 ? (
              <div className="space-y-1.5">
                <MiniTitle>Κατηγορία</MiniTitle>

                <div className="sm:hidden">
                  <div className="flex flex-wrap gap-1.5">
                    {mobileVisibleCategories.map((item, i) => (
                      <CategoryPill key={`mobile-category-${i}`} item={item} compact />
                    ))}

                    {mobileHiddenCategories.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setMobileCategoriesExpanded((prev) => !prev)}
                        className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-2.5 py-1 text-[11px] text-zinc-300 shadow-sm"
                      >
                        {mobileCategoriesExpanded ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Λιγότερα
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />+{mobileHiddenCategories.length}
                          </>
                        )}
                      </button>
                    ) : null}
                  </div>

                  <AnimatePresence initial={false}>
                    {mobileCategoriesExpanded && mobileHiddenCategories.length > 0 ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {mobileHiddenCategories.map((item, i) => (
                            <CategoryPill
                              key={`mobile-more-category-${i}`}
                              item={item}
                              compact
                            />
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="hidden flex-wrap gap-2 sm:flex">
                  {categoryItems.map((item, i) => (
                    <CategoryPill key={`category-${i}`} item={item} />
                  ))}
                </div>
              </div>
            ) : null}

            {(typeof priceInfo?.typicalPrice === "number" && priceInfo.typicalPrice > 0) ||
            priceInfo?.typicalDurationMin ? (
              <div className="space-y-1.5">
                <MiniTitle>Συνεδρία</MiniTitle>

                <div className="flex flex-wrap gap-2">
                  {typeof priceInfo?.typicalPrice === "number" &&
                  priceInfo.typicalPrice > 0 ? (
                    <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-[11px] text-zinc-200 shadow-sm sm:min-h-[36px] sm:text-xs">
                      <Banknote className="h-3.5 w-3.5" />
                      {formatCurrency(priceInfo.typicalPrice, priceInfo.currencyCode || "EUR")} / συνεδρία
                    </span>
                  ) : null}

                  {priceInfo?.typicalDurationMin ? (
                    <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-[11px] text-zinc-200 shadow-sm sm:min-h-[36px] sm:text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(priceInfo.typicalDurationMin)}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {accepts?.cash || accepts?.card ? (
              <div className="space-y-1.5">
                <MiniTitle>Πληρωμή</MiniTitle>

                <div className="flex flex-wrap gap-2">
                  {accepts.cash ? (
                    <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-[11px] text-zinc-200 shadow-sm sm:min-h-[36px] sm:text-xs">
                      <Banknote className="h-3.5 w-3.5" />
                      Μετρητά
                    </span>
                  ) : null}

                  {accepts.card ? (
                    <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5 text-[11px] text-zinc-200 shadow-sm sm:min-h-[36px] sm:text-xs">
                      <CreditCard className="h-3.5 w-3.5" />
                      Κάρτα
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="pt-0.5 space-y-2">
              <button
                type="button"
                onClick={handleBookTap}
                className="hidden min-h-[48px] w-full items-center justify-center gap-2 rounded-[18px] border border-zinc-600/50 bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100 shadow-lg backdrop-blur-xl transition sm:inline-flex"
              >
                <Calendar className="h-4 w-4" />
                Κάνε κράτηση
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleReviewsTap}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[18px] border border-zinc-700/60 bg-zinc-900/40 px-3 py-3 text-[13px] font-medium text-zinc-200 shadow-lg transition touch-manipulation sm:min-h-[46px] sm:text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  Κριτικές
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[18px] border border-zinc-700/60 bg-zinc-900/40 px-3 py-3 text-[13px] font-medium text-zinc-200 shadow-lg transition touch-manipulation sm:min-h-[46px] sm:text-sm"
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
        onShare={handleShare}
        liked={liked}
        likeBusy={likeBusy}
      />

      {overlayUI}
    </>
  )
}