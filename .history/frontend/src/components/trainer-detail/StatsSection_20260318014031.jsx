"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  CalendarDays,
  Star,
  MessageSquare,
  Briefcase,
  MapPin,
  Monitor,
} from "lucide-react"

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

function safeNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatRating(value) {
  const n = safeNumber(value, 0)
  return n > 0 ? n.toFixed(1) : "0.0"
}

function formatExperience(years) {
  const n = safeNumber(years, 0)
  if (n <= 0) return "Νέος"
  if (n === 1) return "1 έτος"
  return `${n} έτη`
}

function StatCard({ icon: Icon, label, value, accent = "zinc" }) {
  const accentMap = {
    zinc: "border-zinc-700/50 bg-zinc-900/60 text-zinc-100",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-100",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border px-4 py-4 sm:px-5 sm:py-5",
        "backdrop-blur-xl transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.22)]",
        accentMap[accent] || accentMap.zinc,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
          <Icon className="h-5 w-5 text-zinc-200" />
        </div>
      </div>
    </motion.div>
  )
}

export default function StatsSection({
  data,
  bookingsCount = 0,
  avgRating = 0,
  reviewsCount = 0,
}) {
  const stats = useMemo(() => {
    return [
      {
        key: "bookings",
        label: "Ολοκληρωμένες",
        value: safeNumber(bookingsCount, 0),
        icon: CalendarDays,
        accent: "sky",
      },
      {
        key: "rating",
        label: "Αξιολόγηση",
        value: formatRating(avgRating),
        icon: Star,
        accent: "amber",
      },
      {
        key: "reviews",
        label: "Κριτικές",
        value: safeNumber(reviewsCount, 0),
        icon: MessageSquare,
        accent: "emerald",
      },
      {
        key: "experience",
        label: "Εμπειρία",
        value: formatExperience(data?.experience_years),
        icon: Briefcase,
        accent: "zinc",
      },
    ]
  }, [bookingsCount, avgRating, reviewsCount, data?.experience_years])

  return (
    <section className="w-full">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          Στατιστικά
        </h2>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">
          Μια γρήγορη εικόνα για την εμπειρία και την παρουσία του προπονητή.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={item.value}
            accent={item.accent}
          />
        ))}
      </div>

      {(data?.location || typeof data?.is_online === "boolean") && (
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
          {data?.location ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300 backdrop-blur">
              <MapPin className="h-4 w-4 text-zinc-400" />
              <span>{data.location}</span>
            </div>
          ) : null}

          {typeof data?.is_online === "boolean" ? (
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm backdrop-blur",
                data.is_online
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-zinc-700/60 bg-zinc-900/70 text-zinc-300",
              )}
            >
              <Monitor className="h-4 w-4" />
              <span>{data.is_online ? "Online συνεδρίες" : "Μόνο δια ζώσης"}</span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}