"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import {
  CalendarDays,
  Star,
  MessageSquare,
  Briefcase,
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

function StatTile({ icon: Icon, label, value, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
      className={cn(
        "group relative overflow-hidden rounded-[26px]",
        "border border-white/10 bg-white/[0.03]",
        "px-4 py-4 sm:px-5 sm:py-5",
        "backdrop-blur-xl transition-all duration-300",
        "hover:border-white/15 hover:bg-white/[0.045]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function StatsContent({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((item, index) => (
        <StatTile
          key={item.key}
          icon={item.icon}
          label={item.label}
          value={item.value}
          delay={index * 0.05}
        />
      ))}
    </div>
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
      },
      {
        key: "rating",
        label: "Αξιολόγηση",
        value: formatRating(avgRating),
        icon: Star,
      },
      {
        key: "reviews",
        label: "Κριτικές",
        value: safeNumber(reviewsCount, 0),
        icon: MessageSquare,
      },
      {
        key: "experience",
        label: "Εμπειρία",
        value: formatExperience(data?.experience_years),
        icon: Briefcase,
      },
    ]
  }, [bookingsCount, avgRating, reviewsCount, data?.experience_years])

  return (
    <>
      {/* Mobile: no outer container */}
      <section className="lg:hidden">
        <StatsContent stats={stats} />
      </section>

      {/* Desktop: with outer container */}
      <section className="relative hidden overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-2xl lg:block xl:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative">
          <StatsContent stats={stats} />
        </div>
      </section>
    </>
  )
}