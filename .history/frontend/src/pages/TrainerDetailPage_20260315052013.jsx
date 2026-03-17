"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion"
import {
  ArrowLeft,
  Sun,
  Clock,
  Heart,
  MessageCircle,
  Pencil,
  Star,
  Target,
  Trash2,
  Trophy,
  Users,
  MoreVertical,
  Lock,
  LogIn,
  CheckCircle2,
  CalendarDays,
  MapPin,
} from "lucide-react"

import { supabase } from "../supabaseClient"
import PoweredByPeakVelocityFooter from "../components/PoweredByPeakVelocityFooter.jsx"
import GuestBookingAuthModal from "../components/guest/GuestBookingAuthModalfortrainers.jsx"
import {
  Avatar,
  FALLBACK_PRIMARY,
  FALLBACK_ULTIMATE,
  PremiumCard,
  ScrollReveal,
  ScrollProgress,
  ScrollToTop,
  FloatingElements,
  hasImage,
} from "../components/trainer-detail/shared.jsx"

/* --------------------------- Helpers --------------------------- */

const DAYS_MAP = [
  { key: 1, label: "Δευτέρα" },
  { key: 2, label: "Τρίτη" },
  { key: 3, label: "Τετάρτη" },
  { key: 4, label: "Πέμπτη" },
  { key: 5, label: "Παρασκευή" },
  { key: 6, label: "Σάββατο" },
  { key: 0, label: "Κυριακή" },
]

const cn = (...classes) => classes.filter(Boolean).join(" ")

const toTierLabel = (value, { percent = false } = {}) => {
  const raw = Number(value)
  const safe = Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1

  if (safe < 10) return percent ? "<10%" : "<10"

  const bucket = Math.floor(safe / 10) * 10
  return percent ? `${bucket}+%` : `${bucket}+`
}

const formatRelativeTime = (dateString) => {
  if (!dateString) return ""
  const now = new Date()
  const postDate = new Date(dateString)
  const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60))

  if (diffInHours < 1) return "Μόλις τώρα"
  if (diffInHours < 24) return `${diffInHours}ω πριν`
  if (diffInHours < 48) return "Χθες"

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} μέρες πριν`

  return new Date(dateString).toLocaleDateString("el-GR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const formatReviewDate = (dateStr) => {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Σήμερα"
  if (diffDays === 1) return "Χθες"
  if (diffDays < 7) return `${diffDays} μέρες πριν`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} εβδομάδες πριν`
  return `${Math.floor(diffDays / 30)} μήνες πριν`
}

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

const getDisplayName = (trainer) =>
  trainer?.full_name ||
  trainer?.name ||
  trainer?.display_name ||
  trainer?.username ||
  "Προπονητής"

const getCategory = (trainer) =>
  trainer?.trainer_category ||
  trainer?.category ||
  trainer?.specialty ||
  trainer?.trainer_type ||
  "Personal Trainer"

const getLocation = (trainer) =>
  trainer?.city ||
  trainer?.location ||
  trainer?.region ||
  trainer?.area ||
  ""

const getBio = (trainer) =>
  trainer?.bio ||
  trainer?.about ||
  trainer?.description ||
  trainer?.headline ||
  "Ο προπονητής δεν έχει προσθέσει ακόμη περιγραφή."

const getCoverImage = (trainer) =>
  trainer?.cover_image_url ||
  trainer?.banner_url ||
  trainer?.hero_image_url ||
  trainer?.profile_cover ||
  FALLBACK_PRIMARY

const getAvatarUrl = (trainer) =>
  trainer?.avatar_url ||
  trainer?.image_url ||
  trainer?.profile_image_url ||
  FALLBACK_ULTIMATE

/* --------------------------- UI bits --------------------------- */

function SectionHeader({ icon: Icon, title, description, meta = null, action = null }) {
  return (
    <div className="mb-7 flex flex-col gap-5 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 w-full">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-200 ring-1 ring-zinc-700/70">
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
          {title}
        </h2>

        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
            {description}
          </p>
        ) : null}
      </div>

      {(meta || action) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:justify-end">
          {meta}
          {action}
        </div>
      )}
    </div>
  )
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3",
        "bg-zinc-100 text-zinc-950 font-semibold",
        "transition-all duration-200 hover:bg-white",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3",
        "border border-zinc-700 bg-zinc-900/70 text-zinc-100 font-medium",
        "transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800/80",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  )
}

function DangerButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3",
        "bg-red-600 text-white font-semibold",
        "transition-all duration-200 hover:bg-red-500",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  )
}

function GuestAuthModalBridge({
  open,
  onClose,
  title = "Σύνδεση απαιτείται",
  description = "Πρέπει να συνδεθείς ή να δημιουργήσεις λογαριασμό για να συνεχίσεις.",
}) {
  return (
    <GuestBookingAuthModal
      open={open}
      isOpen={open}
      onClose={onClose}
      onOpenChange={(value) => {
        if (!value) onClose?.()
      }}
      title={title}
      heading={title}
      description={description}
      message={description}
      variant="auth"
      mode="auth"
    />
  )
}

function LockedAccessCard({ icon: Icon = Lock, title, description, buttonLabel, onAction }) {
  return (
    <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-xl sm:p-8 lg:p-10">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 text-zinc-200 ring-1 ring-zinc-800">
          <Icon className="h-7 w-7" />
        </div>

        <h3 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          {title}
        </h3>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
          {description}
        </p>

        <div className="mt-6 flex justify-center">
          <PrimaryButton onClick={onAction} className="gap-2">
            <LogIn className="h-4 w-4" />
            {buttonLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

function StaticStars({ value = 0, size = "h-4 w-4", className = "" }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${
            star <= value ? "fill-current text-yellow-400" : "text-zinc-700"
          }`}
        />
      ))}
    </div>
  )
}

function RatingInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="rounded-xl p-1 transition-transform hover:scale-105"
        >
          <Star
            className={`h-6 w-6 ${
              star <= value ? "fill-current text-yellow-400" : "text-zinc-600"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function DeleteReviewModal({ open, review, deleting, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {open && review ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-[28px] border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:p-6"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
              <Trash2 className="h-6 w-6 text-red-300" />
            </div>

            <h3 className="text-xl font-bold text-zinc-100 sm:text-2xl">Διαγραφή κριτικής</h3>

            <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Θέλεις σίγουρα να διαγράψεις την κριτική σου;
            </p>

            {review.comment ? (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 p-4">
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-zinc-300">
                  {review.comment}
                </p>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <SecondaryButton onClick={onClose} disabled={deleting} className="w-full">
                Ακύρωση
              </SecondaryButton>

              <DangerButton onClick={onConfirm} disabled={deleting} className="w-full">
                {deleting ? "Διαγραφή..." : "Διαγραφή"}
              </DangerButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/* --------------------------- Stats --------------------------- */

function StatsSection({ data, bookingsCount = 0, avgRating = 0, reviewsCount = 0 }) {
  const stats = useMemo(() => {
    const experienceYears = Number(
      data?.experience_years || data?.years_experience || data?.experience || 0,
    )
    const safeExperience = experienceYears > 0 ? experienceYears : 1

    const showSuccessRate = bookingsCount > 0

    const rawSuccessScore = Math.min(
      96,
      Math.max(
        8,
        8 +
          Math.round(bookingsCount * 2.8) +
          Math.round(reviewsCount * 1.4) +
          Math.round(avgRating * 4) +
          Math.min(safeExperience * 2, 12),
      ),
    )

    const base = [
      {
        key: "sessions",
        icon: Users,
        value: toTierLabel(bookingsCount),
        label: "Ολοκληρωμένες συνεδρίες",
        hint: "Συνολική δραστηριότητα",
        iconWrap: "bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20",
      },
      {
        key: "experience",
        icon: Trophy,
        value: toTierLabel(safeExperience),
        label: "Εμπειρία στον χώρο",
        hint: "Χρόνια παρουσίας",
        iconWrap: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20",
      },
      {
        key: "success",
        icon: Target,
        value: toTierLabel(rawSuccessScore, { percent: true }),
        label: "Ποσοστό επιτυχίας",
        hint: "Συνέπεια & αποτελέσματα",
        iconWrap: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
      },
      {
        key: "reviews",
        icon: Star,
        value: toTierLabel(reviewsCount),
        label: "Κριτικές πελατών",
        hint: avgRating > 0 ? `Μ.Ο. ${avgRating.toFixed(1)} / 5` : "Νέο προφίλ",
        iconWrap: "bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20",
      },
    ]

    return showSuccessRate ? base : base.filter((s) => s.key !== "success")
  }, [data, bookingsCount, avgRating, reviewsCount])

  const isThree = stats.length === 3
  const gridClass = isThree
    ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5"
    : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5"

  return (
    <PremiumCard hover={false} className="w-full max-w-none">
      <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
        <ScrollReveal>
          <SectionHeader
            icon={Trophy}
            title="Στατιστικά προφίλ"
            description="Μια γρήγορη και καθαρή εικόνα της δραστηριότητας, της εμπειρίας και της αξιοπιστίας του προπονητή."
          />
        </ScrollReveal>

        <div className={gridClass}>
          {stats.map((stat, index) => {
            const isLastStretched = stats.length % 2 === 1 && index === stats.length - 1
            const spanLastOnMobile = isLastStretched ? "col-span-2 sm:col-span-1" : ""

            return (
              <div key={stat.key} className={spanLastOnMobile}>
                <ScrollReveal delay={index * 0.05}>
                  <motion.div
                    whileHover={{ y: -3 }}
                    className={cn(
                      "group h-full rounded-2xl border border-zinc-800 bg-zinc-950/70",
                      "p-4 sm:p-5 lg:p-6 transition-all duration-300",
                      "hover:border-zinc-700 hover:bg-zinc-950",
                      isLastStretched ? "text-center sm:text-left" : "",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl",
                        stat.iconWrap,
                        isLastStretched ? "mx-auto sm:mx-0" : "",
                      )}
                    >
                      <stat.icon className="h-5 w-5" />
                    </div>

                    <div className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
                      {stat.value}
                    </div>

                    <div className="mt-2 text-sm font-semibold leading-snug text-zinc-200 sm:text-[15px]">
                      {stat.label}
                    </div>

                    <div className="mt-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                      {stat.hint}
                    </div>
                  </motion.div>
                </ScrollReveal>
              </div>
            )
          })}
        </div>
      </div>
    </PremiumCard>
  )
}

/* --------------------------- About / Certifications --------------------------- */

function AboutSection({ trainer }) {
  const category = getCategory(trainer)
  const location = getLocation(trainer)
  const bio = getBio(trainer)
  const specialties = [
    ...normalizeList(trainer?.specialties),
    ...normalizeList(trainer?.skills),
    ...normalizeList(trainer?.focus_areas),
  ]

  return (
    <PremiumCard hover={false} className="w-full max-w-none">
      <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
        <ScrollReveal>
          <SectionHeader
            icon={Sun}
            title="Σχετικά με τον προπονητή"
            description="Μια σύντομη εικόνα για το προφίλ, την εξειδίκευση και το στυλ προπόνησης."
          />
        </ScrollReveal>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
                {category}
              </span>
              {location ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-sm text-zinc-400">
                  <MapPin className="h-4 w-4" />
                  {location}
                </span>
              ) : null}
            </div>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 sm:text-base">
              {bio}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h3 className="text-lg font-semibold text-zinc-100">Εξειδίκευση</h3>

            {specialties.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {specialties.slice(0, 16).map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 text-sm text-zinc-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">Δεν έχουν προστεθεί ακόμη ειδικότητες.</p>
            )}
          </div>
        </div>
      </div>
    </PremiumCard>
  )
}

function CertificationsSectionInline({ trainer }) {
  const certifications = useMemo(() => {
    return [
      ...normalizeList(trainer?.certifications),
      ...normalizeList(trainer?.certificates),
      ...normalizeList(trainer?.diplomas),
      ...normalizeList(trainer?.education),
    ]
  }, [trainer])

  if (!certifications.length) return null

  return (
    <PremiumCard hover={false} className="w-full max-w-none">
      <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
        <ScrollReveal>
          <SectionHeader
            icon={CheckCircle2}
            title="Πιστοποιήσεις & Σπουδές"
            description="Εκπαίδευση, πιστοποιήσεις και επιπλέον εξειδίκευση του προπονητή."
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {certifications.map((item, index) => (
            <ScrollReveal key={`${item}-${index}`} delay={index * 0.04}>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">{item}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </PremiumCard>
  )
}

/* --------------------------- Availability --------------------------- */

function AvailabilitySectionInline({ availability = [] }) {
  const normalized = useMemo(() => {
    return DAYS_MAP.map((day) => {
      const dayRows = availability.filter((item) => {
        const dayValue = Number(item?.day_of_week ?? item?.day ?? -999)
        return dayValue === day.key
      })

      return {
        ...day,
        rows: dayRows,
      }
    })
  }, [availability])

  return (
    <PremiumCard hover={false} className="w-full max-w-none">
      <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
        <ScrollReveal>
          <SectionHeader
            icon={CalendarDays}
            title="Διαθεσιμότητα"
            description="Ενδεικτικό εβδομαδιαίο πρόγραμμα και διαθέσιμες ώρες συνεργασίας."
          />
        </ScrollReveal>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {normalized.map((day, index) => (
            <ScrollReveal key={day.key} delay={index * 0.03}>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  {day.label}
                </div>

                {day.rows.length ? (
                  <div className="space-y-2">
                    {day.rows.map((row, rowIndex) => (
                      <div
                        key={`${day.key}-${rowIndex}`}
                        className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-300"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            {row.start_time || row.from_time || "--:--"} -{" "}
                            {row.end_time || row.to_time || "--:--"}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {row.is_online ? "Online" : "On-site"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-black/20 px-3 py-3 text-sm text-zinc-500">
                    Μη διαθέσιμος
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </PremiumCard>
  )
}

/* --------------------------- Posts --------------------------- */

function PostCard({ post, index, onClick }) {
  const primaryFromArray =
    Array.isArray(post.image_urls) && hasImage(post.image_urls[0]) ? post.image_urls[0] : ""
  const primaryFromSingle = hasImage(post.image_url) ? post.image_url : ""
  const postImage = primaryFromArray || primaryFromSingle || FALLBACK_PRIMARY
  const hasMultipleImages = (post.image_urls?.length || 0) > 1

  return (
    <ScrollReveal delay={index * 0.05}>
      <motion.article whileHover={{ y: -4 }} onClick={onClick} className="group h-full cursor-pointer">
        <div className="h-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-950">
          <div className="relative h-52 overflow-hidden border-b border-zinc-800">
            <img
              src={postImage}
              alt={post.title || "Post image"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = FALLBACK_ULTIMATE
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {hasMultipleImages && (
              <div className="absolute right-4 top-4">
                <span className="inline-flex items-center rounded-full border border-zinc-700 bg-black/65 px-2.5 py-1 text-xs font-medium text-zinc-200 backdrop-blur">
                  +{post.image_urls.length - 1} εικόνες
                </span>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-white sm:text-xl">
                {post.title}
              </h3>
            </div>
          </div>

          <div className="flex h-[calc(100%-13rem)] flex-col p-5 lg:p-6">
            <p className="mb-5 flex-1 line-clamp-3 text-sm leading-relaxed text-zinc-300 lg:text-base">
              {post.description}
            </p>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(post.created_at)}</span>
              </div>

              <div className="flex items-center gap-3 text-sm text-zinc-500">
                {post.likes > 0 && (
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{post.likes}</span>
                  </div>
                )}

                {post.comments_count > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments_count}</span>
                  </div>
                )}

                <span className="font-medium text-zinc-300 transition-colors group-hover:text-white">
                  Προβολή
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </ScrollReveal>
  )
}

function PostsSection({ trainerId, session }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false)
  const navigate = useNavigate()

  const isLoggedIn = !!session?.user?.id

  useEffect(() => {
    let alive = true

    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, title, description, image_url, image_urls, created_at, likes, comments_count")
          .eq("trainer_id", trainerId)
          .order("created_at", { ascending: false })
          .limit(12)

        if (error) throw error
        if (alive) setPosts(data || [])
      } catch (err) {
        console.error("Error fetching posts:", err)
        if (alive) setPosts([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    if (!trainerId) {
      setPosts([])
      setLoading(false)
      return () => {
        alive = false
      }
    }

    if (!isLoggedIn) {
      setPosts([])
      setLoading(false)
      return () => {
        alive = false
      }
    }

    fetchPosts()

    return () => {
      alive = false
    }
  }, [trainerId, isLoggedIn])

  const handlePostClick = (postId) => {
    if (!isLoggedIn) {
      setShowGuestAuthModal(true)
      return
    }
    navigate(`/post/${postId}`)
  }

  if (!isLoggedIn) {
    return (
      <>
        <section id="posts-section">
          <ScrollReveal>
            <SectionHeader
              icon={MessageCircle}
              title="Αναρτήσεις & Ενημερώσεις"
              description="Συνδέσου για να δεις το περιεχόμενο και τις ενημερώσεις του προπονητή."
            />
          </ScrollReveal>

          <LockedAccessCard
            icon={Lock}
            title="Οι αναρτήσεις είναι διαθέσιμες μόνο σε συνδεδεμένους χρήστες"
            description="Κάνε σύνδεση ή δημιούργησε λογαριασμό για να δεις όλα τα posts, τις ενημερώσεις και το επιπλέον περιεχόμενο του προπονητή."
            buttonLabel="Σύνδεση / Εγγραφή"
            onAction={() => setShowGuestAuthModal(true)}
          />
        </section>

        <GuestAuthModalBridge
          open={showGuestAuthModal}
          onClose={() => setShowGuestAuthModal(false)}
          title="Σύνδεση για προβολή αναρτήσεων"
          description="Για να δεις τις αναρτήσεις του προπονητή πρέπει πρώτα να συνδεθείς ή να δημιουργήσεις λογαριασμό."
        />
      </>
    )
  }

  if (loading) {
    return (
      <section id="posts-section">
        <div className="animate-pulse">
          <div className="mb-6 sm:mb-8">
            <div className="mb-4 h-11 w-12 rounded-2xl bg-zinc-800" />
            <div className="mb-3 h-9 w-72 max-w-full rounded bg-zinc-800" />
            <div className="h-5 w-96 max-w-full rounded bg-zinc-800/80" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70"
              >
                <div className="h-52 bg-zinc-800/70" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 rounded bg-zinc-800/70" />
                  <div className="h-4 w-full rounded bg-zinc-800/50" />
                  <div className="h-4 w-2/3 rounded bg-zinc-800/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!posts.length) return null

  return (
    <section id="posts-section">
      <ScrollReveal>
        <SectionHeader
          icon={MessageCircle}
          title="Αναρτήσεις & Ενημερώσεις"
          description="Τελευταίες σκέψεις, ενημερώσεις και χρήσιμο υλικό από τον προπονητή σου"
          meta={
            <div className="inline-flex items-center rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
              <span className="text-sm text-zinc-400">Σύνολο</span>
              <span className="ml-2 text-lg font-semibold text-zinc-100">{posts.length}</span>
            </div>
          }
        />
      </ScrollReveal>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2 2xl:grid-cols-3">
        {posts.map((post, index) => (
          <PostCard key={post.id} post={post} index={index} onClick={() => handlePostClick(post.id)} />
        ))}
      </div>
    </section>
  )
}

/* --------------------------- Reviews --------------------------- */

function ReviewsSection({ trainerId, session, onReviewMutated }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false)
  const [form, setForm] = useState({ rating: 5, comment: "" })
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteConfirmReview, setDeleteConfirmReview] = useState(null)

  const menuRef = useRef(null)
  const userId = session?.user?.id || null

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("trainer_reviews")
        .select(`
          id,
          user_id,
          rating,
          comment,
          created_at,
          user:profiles!trainer_reviews_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setReviews((data || []).slice(0, 10))
    } catch (err) {
      console.error("Error fetching reviews:", err)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [trainerId])

  useEffect(() => {
    if (!trainerId) return
    fetchReviews()
  }, [trainerId, fetchReviews])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const myReview = useMemo(
    () => reviews.find((review) => review.user_id === userId) || null,
    [reviews, userId],
  )

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0
    return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
  }, [reviews])

  const openCreateOrEdit = () => {
    if (!userId) {
      setShowGuestAuthModal(true)
      return
    }

    if (myReview) {
      setEditingReviewId(myReview.id)
      setForm({
        rating: Number(myReview.rating || 5),
        comment: myReview.comment || "",
      })
    } else {
      setEditingReviewId(null)
      setForm({ rating: 5, comment: "" })
    }

    setDeleteConfirmReview(null)
    setOpenMenuId(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!userId) {
      setShowGuestAuthModal(true)
      return
    }

    const payload = {
      trainer_id: trainerId,
      user_id: userId,
      rating: Number(form.rating),
      comment: String(form.comment || "").trim(),
    }

    setSubmitting(true)

    try {
      if (editingReviewId) {
        const { error } = await supabase
          .from("trainer_reviews")
          .update({
            rating: payload.rating,
            comment: payload.comment,
          })
          .eq("id", editingReviewId)
          .eq("user_id", userId)

        if (error) throw error
      } else {
        const { error } = await supabase.from("trainer_reviews").insert(payload)
        if (error) throw error
      }

      await fetchReviews()
      onReviewMutated?.()

      setShowForm(false)
      setEditingReviewId(null)
      setOpenMenuId(null)
      setDeleteConfirmReview(null)
      setForm({ rating: 5, comment: "" })
    } catch (err) {
      console.error("Error submitting review:", err)
      alert(err.message || "Σφάλμα κατά την αποθήκευση της κριτικής.")
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (review) => {
    setEditingReviewId(review.id)
    setForm({
      rating: Number(review.rating || 5),
      comment: review.comment || "",
    })
    setDeleteConfirmReview(null)
    setOpenMenuId(null)
    setShowForm(true)
  }

  const requestDelete = (review) => {
    setOpenMenuId(null)
    setDeleteConfirmReview(review)
  }

  const confirmDelete = async () => {
    const reviewId = deleteConfirmReview?.id
    if (!reviewId) return

    setDeleting(true)

    try {
      const { error } = await supabase
        .from("trainer_reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", userId)

      if (error) throw error

      await fetchReviews()
      onReviewMutated?.()

      if (editingReviewId === reviewId) {
        setEditingReviewId(null)
        setShowForm(false)
        setForm({ rating: 5, comment: "" })
      }

      setDeleteConfirmReview(null)
      setOpenMenuId(null)
    } catch (err) {
      console.error("Error deleting review:", err)
      alert(err.message || "Σφάλμα κατά τη διαγραφή.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <section id="reviews-section">
        <PremiumCard hover={false} className="w-full max-w-none">
          <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
            <ScrollReveal>
              <div className="mb-7 flex flex-col gap-4 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 w-full">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl lg:text-4xl">
                      Κριτικές
                    </h2>

                    <StaticStars
                      value={reviews.length > 0 ? Math.round(avgRating) : 0}
                      size="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8"
                      className="ml-auto shrink-0 justify-end"
                    />
                  </div>

                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
                    Αξιολογήσεις και εμπειρίες πελατών από πραγματικές συνεργασίες.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {!showForm && reviews.length > 0 && (
              <div className="mb-6">
                <PrimaryButton onClick={openCreateOrEdit}>
                  {userId ? (myReview ? "Επεξεργασία κριτικής" : "Γράψε κριτική") : "Σύνδεση για κριτική"}
                </PrimaryButton>
              </div>
            )}

            {showForm && (
              <ScrollReveal>
                <form
                  onSubmit={handleSubmit}
                  className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 lg:p-6"
                >
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">
                        Βαθμολογία
                      </label>
                      <RatingInput
                        value={form.rating}
                        onChange={(rating) => setForm((prev) => ({ ...prev, rating }))}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-300">Σχόλιο</label>
                      <textarea
                        value={form.comment}
                        onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                        rows={5}
                        className="w-full resize-none rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3 text-zinc-100 outline-none transition-colors focus:border-zinc-600"
                        placeholder="Γράψε την εμπειρία σου..."
                      />
                      <p className="mt-2 text-xs text-zinc-500">
                        Μία καθαρή και σύντομη κριτική βοηθά περισσότερο τους επόμενους χρήστες.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <PrimaryButton type="submit" disabled={submitting} className="w-full">
                        {submitting ? "Αποθήκευση..." : editingReviewId ? "Ενημέρωση" : "Υποβολή"}
                      </PrimaryButton>

                      <SecondaryButton
                        type="button"
                        className="w-full"
                        onClick={() => {
                          setShowForm(false)
                          setEditingReviewId(null)
                          setOpenMenuId(null)
                          setDeleteConfirmReview(null)
                          setForm({ rating: 5, comment: "" })
                        }}
                      >
                        Ακύρωση
                      </SecondaryButton>
                    </div>
                  </div>
                </form>
              </ScrollReveal>
            )}

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                  >
                    <div className="mb-3 h-5 w-40 rounded bg-zinc-800/70" />
                    <div className="mb-4 h-4 w-28 rounded bg-zinc-800/60" />
                    <div className="mb-2 h-4 w-full rounded bg-zinc-800/50" />
                    <div className="h-4 w-2/3 rounded bg-zinc-800/50" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
                  <MessageCircle className="h-8 w-8 text-zinc-500" />
                </div>

                <h3 className="mb-2 text-2xl font-semibold text-zinc-100">
                  Δεν υπάρχουν κριτικές ακόμη
                </h3>

                <p className="mx-auto max-w-xl text-base leading-relaxed text-zinc-400">
                  Γίνε ο πρώτος που θα αφήσει αξιολόγηση.
                </p>

                <div className="mt-6 flex justify-center">
                  <PrimaryButton onClick={openCreateOrEdit}>
                    {userId ? "Γράψε κριτική" : "Σύνδεση για κριτική"}
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-zinc-800/70">
                {reviews.slice(0, 10).map((review, index) => {
                  const isOwner = review.user_id === userId
                  const menuOpen = openMenuId === review.id

                  return (
                    <ScrollReveal key={review.id} delay={index * 0.04}>
                      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/65 p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                            <Avatar
                              url={review.user?.avatar_url}
                              alt={review.user?.full_name || "User"}
                              className="h-12 w-12 shrink-0"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h4 className="truncate text-base font-semibold text-zinc-100 lg:text-lg">
                                  {review.user?.full_name || "Χρήστης"}
                                </h4>

                                <span className="text-sm text-zinc-500">
                                  {formatReviewDate(review.created_at)}
                                </span>
                              </div>

                              <StaticStars value={Number(review.rating || 0)} className="mt-2" />

                              {review.comment && (
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 sm:text-base">
                                  {review.comment}
                                </p>
                              )}
                            </div>
                          </div>

                          {isOwner && (
                            <div className="relative shrink-0" ref={menuOpen ? menuRef : null}>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuId((prev) => (prev === review.id ? null : review.id))
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-900/70 hover:text-white"
                                aria-label="Περισσότερες επιλογές"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>

                              {menuOpen && (
                                <div className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-xl">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(review)}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-100 transition hover:bg-zinc-900"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Επεξεργασία
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => requestDelete(review)}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-300 transition hover:bg-zinc-900"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Διαγραφή
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollReveal>
                  )
                })}
              </div>
            )}
          </div>
        </PremiumCard>
      </section>

      <DeleteReviewModal
        open={!!deleteConfirmReview}
        review={deleteConfirmReview}
        deleting={deleting}
        onClose={() => {
          if (deleting) return
          setDeleteConfirmReview(null)
        }}
        onConfirm={confirmDelete}
      />

      <GuestAuthModalBridge
        open={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        title="Σύνδεση για κριτική"
        description="Για να γράψεις, επεξεργαστείς ή διαγράψεις κριτική πρέπει πρώτα να συνδεθείς ή να δημιουργήσεις λογαριασμό."
      />
    </>
  )
}

/* --------------------------- Page --------------------------- */

export default function TrainerDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const trainerId = params?.id || params?.trainerId || params?.userId || ""

  const [session, setSession] = useState(null)
  const [trainer, setTrainer] = useState(null)
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [bookingsCount, setBookingsCount] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [reviewsCount, setReviewsCount] = useState(0)

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -120])

  useEffect(() => {
    let mounted = true

    const bootAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted) setSession(data?.session || null)
    }

    bootAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe?.()
    }
  }, [])

  const fetchTrainerDetail = useCallback(async () => {
    if (!trainerId) {
      setError("Δεν βρέθηκε προπονητής.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")

    try {
      const [profileRes, availabilityRes, reviewsRes, bookingsRes] = await Promise.allSettled([
        supabase.from("profiles").select("*").eq("id", trainerId).single(),
        supabase
          .from("trainer_availability")
          .select("*")
          .eq("trainer_id", trainerId)
          .order("day_of_week", { ascending: true }),
        supabase.from("trainer_reviews").select("rating").eq("trainer_id", trainerId),
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("trainer_id", trainerId),
      ])

      if (profileRes.status === "fulfilled") {
        const { data, error: profileError } = profileRes.value
        if (profileError) throw profileError
        setTrainer(data || null)
      } else {
        throw profileRes.reason
      }

      if (availabilityRes.status === "fulfilled") {
        setAvailability(availabilityRes.value?.data || [])
      } else {
        setAvailability([])
      }

      if (reviewsRes.status === "fulfilled") {
        const reviewRows = reviewsRes.value?.data || []
        setReviewsCount(reviewRows.length)
        setAvgRating(
          reviewRows.length
            ? reviewRows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviewRows.length
            : 0,
        )
      } else {
        setReviewsCount(0)
        setAvgRating(0)
      }

      if (bookingsRes.status === "fulfilled") {
        setBookingsCount(bookingsRes.value?.count || 0)
      } else {
        setBookingsCount(0)
      }
    } catch (err) {
      console.error("Trainer detail fetch error:", err)
      setError("Κάτι πήγε στραβά κατά τη φόρτωση του προφίλ.")
      setTrainer(null)
    } finally {
      setLoading(false)
    }
  }, [trainerId])

  useEffect(() => {
    fetchTrainerDetail()
  }, [fetchTrainerDetail])

  const handleReviewMutated = useCallback(() => {
    fetchTrainerDetail()
  }, [fetchTrainerDetail])

  const displayName = getDisplayName(trainer)
  const category = getCategory(trainer)
  const location = getLocation(trainer)
  const coverImage = getCoverImage(trainer)
  const avatarUrl = getAvatarUrl(trainer)

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="mb-6 h-10 w-32 rounded-2xl bg-zinc-800" />
            <div className="mb-6 h-[32rem] rounded-[32px] bg-zinc-900" />
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div className="h-72 rounded-[28px] bg-zinc-900" />
                <div className="h-72 rounded-[28px] bg-zinc-900" />
                <div className="h-72 rounded-[28px] bg-zinc-900" />
              </div>
              <div className="h-96 rounded-[28px] bg-zinc-900" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !trainer) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
          <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 ring-1 ring-zinc-800">
            <Sun className="h-8 w-8 text-zinc-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100">Το προφίλ δεν φορτώθηκε</h1>
          <p className="mt-3 text-zinc-400">{error || "Δεν βρέθηκαν στοιχεία προπονητή."}</p>
          <div className="mt-6">
            <PrimaryButton onClick={() => navigate(-1)}>Επιστροφή</PrimaryButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <ScrollProgress />
      <ScrollToTop />
      <FloatingElements />

      <div className="relative">
        <motion.div
          style={{ y: heroY }}
          className="absolute inset-0 h-[44rem] overflow-hidden"
        >
          <img
            src={coverImage}
            alt={displayName}
            className="h-full w-full object-cover opacity-30"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = FALLBACK_PRIMARY
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black" />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24">
          <div className="mb-6 flex items-center justify-between gap-4">
            <SecondaryButton onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Πίσω
            </SecondaryButton>

            <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-xl">
              Trainer Detail
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <ScrollReveal>
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300 backdrop-blur-xl">
                  <Sun className="h-3.5 w-3.5" />
                  {category}
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.05}>
                <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {displayName}
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 backdrop-blur-xl">
                    <Avatar url={avatarUrl} alt={displayName} className="h-12 w-12" />
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">{displayName}</div>
                      <div className="text-sm text-zinc-400">{category}</div>
                    </div>
                  </div>

                  {location ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 backdrop-blur-xl">
                      <MapPin className="h-4 w-4 text-zinc-500" />
                      {location}
                    </div>
                  ) : null}

                  <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 backdrop-blur-xl">
                    <StaticStars value={Math.round(avgRating)} />
                    <span className="text-zinc-400">
                      {avgRating > 0 ? avgRating.toFixed(1) : "Νέο προφίλ"}
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={0.12}>
              <PremiumCard hover={false} className="w-full">
                <div className="p-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                        Κριτικές
                      </div>
                      <div className="mt-2 text-2xl font-bold text-zinc-100">{reviewsCount}</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                        Rating
                      </div>
                      <div className="mt-2 text-2xl font-bold text-zinc-100">
                        {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Συνεδρίες
                    </div>
                    <div className="mt-2 text-2xl font-bold text-zinc-100">{bookingsCount}</div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <a href="#reviews-section">
                      <PrimaryButton className="w-full">Δες κριτικές</PrimaryButton>
                    </a>
                    <a href="#posts-section">
                      <SecondaryButton className="w-full">Δες αναρτήσεις</SecondaryButton>
                    </a>
                  </div>
                </div>
              </PremiumCard>
            </ScrollReveal>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <StatsSection
                data={trainer}
                bookingsCount={bookingsCount}
                avgRating={avgRating}
                reviewsCount={reviewsCount}
              />

              <AboutSection trainer={trainer} />

              <CertificationsSectionInline trainer={trainer} />

              <AvailabilitySectionInline availability={availability} />

              <PostsSection trainerId={trainerId} session={session} />

              <ReviewsSection
                trainerId={trainerId}
                session={session}
                onReviewMutated={handleReviewMutated}
              />
            </div>

            <div className="xl:sticky xl:top-6 xl:self-start">
              <PremiumCard hover={false} className="w-full">
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Avatar url={avatarUrl} alt={displayName} className="h-14 w-14" />
                    <div>
                      <div className="text-lg font-semibold text-zinc-100">{displayName}</div>
                      <div className="text-sm text-zinc-400">{category}</div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-zinc-400 line-clamp-5">
                    {getBio(trainer)}
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-400">Μέση βαθμολογία</span>
                        <span className="font-semibold text-zinc-100">
                          {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-400">Τοποθεσία</span>
                        <span className="font-semibold text-zinc-100">{location || "—"}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-400">Κατηγορία</span>
                        <span className="font-semibold text-zinc-100">{category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </div>
          </div>
        </div>
      </div>

      <PoweredByPeakVelocityFooter />
    </div>
  )
}